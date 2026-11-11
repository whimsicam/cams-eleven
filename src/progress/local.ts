/**
 * Storage locale: IndexedDB (via `idb`) per mani e drill, localStorage per le piccole cose
 * (deviceId, token GitHub, coda di sync). Tutto funziona offline.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { emptyProgress, SCHEMA_VERSION, type DrillRecord, type HandRecord, type ProgressData, type Settings, DEFAULT_SETTINGS } from "./types";

interface Schema extends DBSchema {
  hands: { key: string; value: HandRecord; indexes: { ts: string } };
  drills: { key: string; value: DrillRecord; indexes: { ts: string } };
  kv: { key: string; value: unknown };
}

const DB_NAME = "cams-eleven";
const LS_DEVICE = "ce.deviceId";
const LS_TOKEN = "ce.githubToken";
const LS_UPDATED = "ce.updatedAt";

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore("hands", { keyPath: "id" }).createIndex("ts", "ts");
        d.createObjectStore("drills", { keyPath: "id" }).createIndex("ts", "ts");
        d.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

/** Id del dispositivo: generato una volta, stabile. Es. "d-3f9a1c". */
export function deviceId(): string {
  let id = localStorage.getItem(LS_DEVICE);
  if (!id) {
    const ua = navigator.userAgent;
    const kind = /iPhone|iPad/.test(ua) ? "iphone" : /Android/.test(ua) ? "android" : "desktop";
    id = `${kind}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(LS_DEVICE, id);
  }
  return id;
}

export function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(LS_TOKEN, token.trim());
  else localStorage.removeItem(LS_TOKEN);
}

function touch(): string {
  const now = new Date().toISOString();
  localStorage.setItem(LS_UPDATED, now);
  return now;
}

export async function addHand(hand: HandRecord): Promise<void> {
  await (await db()).put("hands", hand);
  touch();
}

export async function addDrill(drill: DrillRecord): Promise<void> {
  await (await db()).put("drills", drill);
  touch();
}

export async function getSettings(): Promise<Settings> {
  const s = (await (await db()).get("kv", "settings")) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put("kv", settings, "settings");
  touch();
}

export async function getKv<T>(key: string, fallback: T): Promise<T> {
  const v = (await (await db()).get("kv", key)) as T | undefined;
  return v === undefined ? fallback : v;
}

export async function setKv(key: string, value: unknown): Promise<void> {
  await (await db()).put("kv", value, key);
  touch();
}

/** Snapshot completo dei dati locali, nel formato scritto nel repo. */
export async function loadLocal(): Promise<ProgressData> {
  const d = await db();
  const base = emptyProgress(deviceId());
  const [hands, drills, lessons, srs, settings] = await Promise.all([
    d.getAllFromIndex("hands", "ts"),
    d.getAllFromIndex("drills", "ts"),
    getKv<ProgressData["lessons"]>("lessons", {}),
    getKv<ProgressData["srs"]>("srs", {}),
    getSettings(),
  ]);
  const data: ProgressData = { ...base, hands, drills, lessons, srs, settings, updatedAt: localStorage.getItem(LS_UPDATED) ?? base.updatedAt };
  for (const h of hands) data.bankroll[h.game] += h.net;
  return data;
}

/** Scrive nel locale un merge arrivato dal repo (solo aggiunte: non cancella mai). */
export async function importMerged(merged: ProgressData): Promise<void> {
  const d = await db();
  const tx = d.transaction(["hands", "drills", "kv"], "readwrite");
  for (const h of merged.hands) await tx.objectStore("hands").put(h);
  for (const dr of merged.drills) await tx.objectStore("drills").put(dr);
  await tx.objectStore("kv").put(merged.lessons, "lessons");
  await tx.objectStore("kv").put(merged.srs, "srs");
  await tx.done;
  if (merged.schema !== SCHEMA_VERSION) console.warn("Schema dei progressi diverso: prevista migrazione");
}

/** Cancella tutto il locale (impostazioni → "azzera questo dispositivo"). */
export async function wipeLocal(): Promise<void> {
  const d = await db();
  const tx = d.transaction(["hands", "drills", "kv"], "readwrite");
  await tx.objectStore("hands").clear();
  await tx.objectStore("drills").clear();
  await tx.objectStore("kv").clear();
  await tx.done;
  localStorage.removeItem(LS_UPDATED);
}
