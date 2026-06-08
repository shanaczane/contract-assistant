import type { ParsedAnalysis, Message } from "./types";

const KEY = "contractai_session";

export interface Session {
  contractId: string | null;
  fileName: string | null;
  chunks: number | null;
  analysis: ParsedAnalysis | null;
  messages: Message[];
  conversationId: string | null;
}

const EMPTY: Session = {
  contractId: null,
  fileName: null,
  chunks: null,
  analysis: null,
  messages: [],
  conversationId: null,
};

export function loadSession(): Session {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: Session = { ...EMPTY, ...JSON.parse(raw) };
    // Normalize redFlags from legacy string[] to string
    if (parsed.analysis && Array.isArray((parsed.analysis as unknown as { redFlags: unknown }).redFlags)) {
      parsed.analysis = {
        ...parsed.analysis,
        redFlags: ((parsed.analysis as unknown as { redFlags: string[] }).redFlags).join("\n\n"),
      };
    }
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function saveSession(patch: Partial<Session>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadSession();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
