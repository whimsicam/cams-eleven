/**
 * Client minimale della GitHub Contents API per il branch `data` del repo.
 * Solo fetch: niente dipendenze. Il token arriva dal localStorage e non viene mai loggato.
 */

export const REPO = { owner: "whimsicam", name: "cams-eleven", branch: "data" } as const;
const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
  /** Token mancante, scaduto o senza permessi. */
  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function request<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...headers(token), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { message?: string }).message ?? msg;
    } catch {
      /* corpo non JSON */
    }
    throw new GitHubError(res.status, msg);
  }
  return (await res.json()) as T;
}

/** Decodifica base64 → UTF-8 (il contenuto arriva in base64 con a capo). */
function decodeContent(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function encodeContent(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export interface RemoteFile {
  path: string;
  sha: string;
  content: string;
}

/** Elenca i file di una cartella del branch `data`. Cartella assente → []. */
export async function listDir(token: string, dir: string): Promise<Array<{ path: string; sha: string; name: string }>> {
  try {
    const items = await request<Array<{ path: string; sha: string; name: string; type: string }>>(
      token,
      "GET",
      `/repos/${REPO.owner}/${REPO.name}/contents/${dir}?ref=${REPO.branch}`,
    );
    return items.filter((i) => i.type === "file").map(({ path, sha, name }) => ({ path, sha, name }));
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return [];
    throw e;
  }
}

export async function getFile(token: string, path: string): Promise<RemoteFile | null> {
  try {
    const f = await request<{ path: string; sha: string; content: string }>(token, "GET", `/repos/${REPO.owner}/${REPO.name}/contents/${path}?ref=${REPO.branch}`);
    return { path: f.path, sha: f.sha, content: decodeContent(f.content) };
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return null;
    throw e;
  }
}

/** Crea o aggiorna un file. `sha` obbligatorio per aggiornare (409/422 se è cambiato nel frattempo). */
export async function putFile(token: string, path: string, content: string, message: string, sha?: string): Promise<{ sha: string }> {
  const r = await request<{ content: { sha: string } }>(token, "PUT", `/repos/${REPO.owner}/${REPO.name}/contents/${path}`, {
    message,
    content: encodeContent(content),
    branch: REPO.branch,
    ...(sha ? { sha } : {}),
  });
  return { sha: r.content.sha };
}

/** Verifica rapida del token: legge i metadati del repo. */
export async function checkToken(token: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await request(token, "GET", `/repos/${REPO.owner}/${REPO.name}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof GitHubError) return { ok: false, reason: e.isAuth ? "Token non valido o scaduto" : `${e.status} ${e.message}` };
    return { ok: false, reason: "Rete non disponibile" };
  }
}
