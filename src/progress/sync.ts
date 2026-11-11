/**
 * Orchestrazione della sincronizzazione (SPEC.md §9.3).
 *
 * - pull(): legge tutti i progress/<device>.json dal branch `data`, li unisce al locale, salva nel locale.
 * - push(): scrive progress/<mioDevice>.json con lo sha corrente; su conflitto rilegge e ritenta.
 * - schedulePush(): debounce (fine mano) + coda offline: se la rete manca, riprova all'evento `online`.
 *
 * Lo stato (idle / syncing / ok / error / offline / no-token) è esposto con uno store Zustand
 * per la tab Progressi.
 */
import { create } from "zustand";
import { getFile, GitHubError, listDir, putFile } from "./github";
import { deviceId, getToken, importMerged, loadLocal } from "./local";
import { mergeProgress } from "./merge";
import type { ProgressData } from "./types";

export type SyncStatus = "no-token" | "idle" | "syncing" | "ok" | "offline" | "error";

interface SyncState {
  status: SyncStatus;
  lastSync: string | null;
  lastError: string | null;
  /** Numero di file dispositivo trovati nel repo all'ultimo pull. */
  remoteDevices: number;
  pendingPush: boolean;
}

export const useSyncStore = create<SyncState>(() => ({
  status: getToken() ? "idle" : "no-token",
  lastSync: localStorage.getItem("ce.lastSync"),
  lastError: null,
  remoteDevices: 0,
  pendingPush: localStorage.getItem("ce.pendingPush") === "1",
}));

const set = useSyncStore.setState;
const PROGRESS_DIR = "progress";
const myPath = () => `${PROGRESS_DIR}/${deviceId()}.json`;

function markPending(pending: boolean): void {
  localStorage.setItem("ce.pendingPush", pending ? "1" : "0");
  set({ pendingPush: pending });
}

function handleError(e: unknown): void {
  if (e instanceof GitHubError) {
    set({ status: "error", lastError: e.isAuth ? "Token non valido o scaduto: reinseriscilo nelle impostazioni." : `GitHub: ${e.status} ${e.message}` });
  } else if (!navigator.onLine || (e instanceof TypeError && /fetch/i.test(String(e.message)))) {
    set({ status: "offline", lastError: null });
  } else {
    set({ status: "error", lastError: String(e) });
  }
}

/** Legge tutti i dispositivi dal repo e unisce. Ritorna i dati uniti (già salvati nel locale). */
export async function pull(): Promise<ProgressData | null> {
  const token = getToken();
  if (!token) {
    set({ status: "no-token" });
    return null;
  }
  set({ status: "syncing", lastError: null });
  try {
    const files = await listDir(token, PROGRESS_DIR);
    const jsonFiles = files.filter((f) => f.name.endsWith(".json"));
    const remote: ProgressData[] = [];
    for (const f of jsonFiles) {
      const file = await getFile(token, f.path);
      if (!file) continue;
      try {
        remote.push(JSON.parse(file.content) as ProgressData);
      } catch {
        console.warn("File di progresso non leggibile:", f.path);
      }
    }
    const local = await loadLocal();
    const merged = mergeProgress([local, ...remote], deviceId());
    await importMerged(merged);
    const now = new Date().toISOString();
    localStorage.setItem("ce.lastSync", now);
    set({ status: "ok", lastSync: now, remoteDevices: jsonFiles.length });
    return merged;
  } catch (e) {
    handleError(e);
    return null;
  }
}

/** Scrive il file di questo dispositivo. Ritenta una volta su conflitto di sha. */
export async function push(): Promise<boolean> {
  const token = getToken();
  if (!token) {
    set({ status: "no-token" });
    return false;
  }
  if (!navigator.onLine) {
    markPending(true);
    set({ status: "offline" });
    return false;
  }
  set({ status: "syncing", lastError: null });
  try {
    const local = await loadLocal();
    const body = JSON.stringify(local, null, 1);
    const path = myPath();
    const message = `progressi ${deviceId()}: ${local.hands.length} mani, ${local.drills.length} drill`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = await getFile(token, path);
      try {
        await putFile(token, path, body, message, existing?.sha);
        break;
      } catch (e) {
        if (e instanceof GitHubError && (e.status === 409 || e.status === 422) && attempt === 0) continue;
        throw e;
      }
    }
    const now = new Date().toISOString();
    localStorage.setItem("ce.lastSync", now);
    markPending(false);
    set({ status: "ok", lastSync: now });
    return true;
  } catch (e) {
    markPending(true);
    handleError(e);
    return false;
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Push con debounce: chiamato a fine mano/drill. Accumula e scrive dopo 20 s di quiete. */
export function schedulePush(delayMs = 20_000): void {
  markPending(true);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, delayMs);
}

/** Da chiamare una volta all'avvio dell'app. */
export function initSync(): void {
  window.addEventListener("online", () => {
    if (useSyncStore.getState().pendingPush) void push();
    else void pull();
  });
  window.addEventListener("offline", () => set({ status: "offline" }));
  // Scrive subito se l'app va in background con un push in sospeso (iPhone chiude le PWA senza preavviso).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && useSyncStore.getState().pendingPush && pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
      void push();
    }
  });
  if (getToken()) {
    void (async () => {
      await pull();
      if (useSyncStore.getState().pendingPush) await push();
    })();
  }
}
