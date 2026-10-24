import "server-only";
import type { StartupProfile } from "./akta";

export interface LearnedMatch { probability: number | null; reasons: string[]; fitted: boolean; preferenceScore?: number }
export interface LearnedRanking<T> { data: (T & { learnedMatch?: LearnedMatch })[]; source: "model" | "baseline"; backend: "python" | "typescript"; reason?: string; actionCount?: number }
interface RankedItem { id: string; score: number | null; reasons: string[] }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RANKING");
  return value as Record<string, unknown>;
}
export const FEEDBACK_ACTIONS = ["pass", "save", "track", "intro"] as const;
export type FeedbackAction = typeof FEEDBACK_ACTIONS[number];
interface FeedbackEntry { action: FeedbackAction; sector?: string; backend: "python" | "typescript" }
// Both Next.js route bundles share one single-partner demo store in this process.
const globalStore = globalThis as typeof globalThis & { __companyTinderFeedbackV1?: Map<string, FeedbackEntry> };
const feedback = globalStore.__companyTinderFeedbackV1 ??= new Map<string, FeedbackEntry>();
class PythonError extends Error {}

/** Bounded transport shared by ranking and feedback, including response streaming. */
async function pythonRequest(path: "ranking" | "action", body?: unknown): Promise<unknown> {
  const url = new URL(process.env.THESIS_RANKER_URL?.trim() || "http://localhost:8000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new PythonError("INVALID_CONFIGURATION");
  url.pathname = url.pathname.replace(/\/$/, "") + "/" + path;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new PythonError("TIMEOUT")); }, 750);
  });
  const operation = (async () => {
    const response = await fetch(url, { method: body === undefined ? "GET" : "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal, cache: "no-store", redirect: "error",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) } });
    if (!response.ok) { void response.body?.cancel().catch(() => undefined); throw new PythonError(`PYTHON_HTTP_${response.status}`); }
    const reader = response.body?.getReader();
    if (!reader) throw new PythonError("INVALID_RESPONSE");
    let size = 0, text = ""; const decoder = new TextDecoder();
    try {
      while (true) {
        const item = await reader.read(); if (item.done) break;
        size += item.value.byteLength;
        if (size > 200_000) { void reader.cancel().catch(() => undefined); throw new PythonError("RESPONSE_TOO_LARGE"); }
        text += decoder.decode(item.value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    return JSON.parse(text) as unknown;
  })();
  try { return await Promise.race([operation, deadline]); }
  finally { if (timer) clearTimeout(timer); controller.abort(); }
}
function failureReason(error: unknown): string {
  return error instanceof PythonError ? error.message : "SERVICE_UNAVAILABLE";
}
function sectorOf(profile: Pick<StartupProfile, "id">): string | undefined {
  const sector = (profile as Partial<StartupProfile>).targetSector;
  return typeof sector === "string" ? sector : undefined;
}
function localRanking<T extends Pick<StartupProfile, "id" | "signalScore">>(profiles: T[], reason: string): LearnedRanking<T> {
  const affinity = new Map<string, number>();
  feedback.forEach((entry) => {
    if (entry.sector && entry.action !== "track") affinity.set(entry.sector, (affinity.get(entry.sector) ?? 0) + (entry.action === "pass" ? -1 : 1));
  });
  const data = profiles.map((profile, index) => {
    const score = affinity.get(sectorOf(profile) ?? "") ?? 0;
    return { profile, index, seen: feedback.has(profile.id), score };
  }).sort((a, b) => Number(a.seen) - Number(b.seen) || b.score - a.score || a.index - b.index)
    .map(({ profile, seen, score }) => ({ ...profile, learnedMatch: { probability: null, fitted: false,
      preferenceScore: score, reasons: [seen ? "Previously reviewed in this demo session." : score ? "Sector preference from recorded demo feedback." : "Baseline thesis ordering; no local sector preference."] } }));
  return { data, source: "baseline", backend: "typescript", reason, actionCount: feedback.size };
}
export class FeedbackConflictError extends Error {
  constructor() { super("Feedback already recorded with a different action."); }
}
export interface FeedbackResult {
  id: string; action: FeedbackAction; n_actions: number; remaining: number; readback_pending: boolean;
  backend: "python" | "typescript"; reason?: string; duplicate: boolean;
}
/** Record locally before proxying so offline feedback remains useful; no write retries. */
export async function submitFeedback(profile: StartupProfile, action: FeedbackAction, totalCount: number): Promise<FeedbackResult> {
  const previous = feedback.get(profile.id);
  if (previous && previous.action !== action) throw new FeedbackConflictError();
  const entry: FeedbackEntry = previous ?? { action, sector: sectorOf(profile), backend: "typescript" };
  if (!previous) feedback.set(profile.id, entry);
  const local: FeedbackResult = { id: profile.id, action, n_actions: feedback.size,
    remaining: Math.max(0, totalCount - feedback.size), readback_pending: false, backend: entry.backend, duplicate: Boolean(previous) };
  if (previous) return local;
  try {
    const raw = object(await pythonRequest("action", { uuid: profile.id, action }));
    if (!Number.isSafeInteger(raw.n_actions) || (raw.n_actions as number) < 0 || !Number.isSafeInteger(raw.remaining) || (raw.remaining as number) < 0 || typeof raw.readback_pending !== "boolean") throw new PythonError("INVALID_RESPONSE");
    entry.backend = "python";
    return { ...local, backend: "python", n_actions: raw.n_actions as number, remaining: raw.remaining as number, readback_pending: raw.readback_pending };
  } catch (error) { return { ...local, backend: "typescript", reason: failureReason(error) }; }
}

/** Python order when available; local preference scoring otherwise. No entries are dropped. */
export async function applyLearnedRanking<T extends Pick<StartupProfile, "id" | "signalScore">>(profiles: T[]): Promise<LearnedRanking<T>> {
  const fallback = (reason: string): LearnedRanking<T> => localRanking(profiles, reason);
  if (!profiles.length) return fallback("EMPTY_DATASET");
  try {
    const raw = object(await pythonRequest("ranking"));
    if (typeof raw.fitted !== "boolean" || !Number.isSafeInteger(raw.n_actions) || (raw.n_actions as number) < 0 || !Array.isArray(raw.ranked) || raw.ranked.length > 1000) return fallback("INVALID_RESPONSE");
    const fitted = raw.fitted;
    const order = new Map<string, { index: number; match: LearnedMatch }>();
    raw.ranked.forEach((value: unknown, index: number) => {
      const item = object(value) as unknown as RankedItem;
      if (typeof item.id !== "string" || item.id.length > 200 || order.has(item.id) || !Array.isArray(item.reasons) || item.reasons.length > 20 || item.reasons.some((reason) => typeof reason !== "string" || reason.length > 300)) throw new Error("INVALID_RANKING_ITEM");
      if (fitted ? typeof item.score !== "number" || !Number.isFinite(item.score) || item.score < 0 || item.score > 1 : item.score !== null) throw new Error("INVALID_PROBABILITY");
      order.set(item.id, { index, match: { probability: fitted ? item.score : null, reasons: item.reasons, fitted } });
    });
    if (!profiles.some((profile) => order.has(profile.id))) return fallback("NO_MATCHING_IDS");
    const data = profiles.map((profile, index) => ({ profile, index, rank: order.get(profile.id) }))
      .sort((a, b) => (a.rank?.index ?? Infinity) - (b.rank?.index ?? Infinity) || a.index - b.index)
      .map(({ profile, rank }) => rank ? { ...profile, learnedMatch: rank.match } : profile);
    return { data, source: "model", backend: "python", actionCount: raw.n_actions as number };
  } catch (error) { return fallback(failureReason(error)); }
}
