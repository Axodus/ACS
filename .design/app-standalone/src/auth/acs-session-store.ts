export interface StoredAcsSession {
  readonly accessToken: string;
  readonly expiresAt: number;
}

const STORAGE_KEY = "acs.auth.session.v1";
const listeners = new Set<() => void>();
let current = readStoredSession();

export function getAcsSessionSnapshot(): StoredAcsSession | null {
  if (current && current.expiresAt <= Date.now()) {
    clearAcsSession();
  }
  return current;
}

export function getAcsAccessToken(): string | undefined {
  return getAcsSessionSnapshot()?.accessToken;
}

export function setAcsSession(session: StoredAcsSession): void {
  current = session;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  emit();
}

export function clearAcsSession(): void {
  const changed = current !== null;
  current = null;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
  if (changed) emit();
}

export function subscribeAcsSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStoredSession(): StoredAcsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<StoredAcsSession>;
    if (typeof parsed.accessToken !== "string"
      || !parsed.accessToken
      || typeof parsed.expiresAt !== "number"
      || !Number.isFinite(parsed.expiresAt)
      || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}
