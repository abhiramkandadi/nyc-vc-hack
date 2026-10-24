import "server-only";
import type { StartupProfile } from "./akta";

export interface LearnedMatch { probability: number | null; reasons: string[]; fitted: boolean }
export interface LearnedRanking<T> { data: (T & { learnedMatch?: LearnedMatch })[]; source: "model" | "baseline"; reason?: string; actionCount?: number }
interface RankedItem { id: string; score: number | null; reasons: string[] }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RANKING");
  return value as Record<string, unknown>;
}
/** Optional single-partner service. Never changes evidence scores or drops seed entries. */
export async function applyLearnedRanking<T extends Pick<StartupProfile, "id" | "signalScore">>(profiles: T[]): Promise<LearnedRanking<T>> {
  const fallback = (reason: string): LearnedRanking<T> => ({ data: profiles, source: "baseline", reason });
  const configured = process.env.THESIS_RANKER_URL?.trim();
  if (!configured) return fallback("NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return fallback("INVALID_CONFIGURATION");
    url.pathname = url.pathname.replace(/\/$/, "") + "/ranking";
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", redirect: "error", headers: { Accept: "application/json" } });
    if (!response.ok) { await response.body?.cancel(); return fallback("SERVICE_UNAVAILABLE"); }
    const reader = response.body?.getReader();
    if (!reader) return fallback("INVALID_RESPONSE");
    let size = 0, text = ""; const decoder = new TextDecoder();
    try {
      while (true) {
        const item = await reader.read(); if (item.done) break;
        size += item.value.byteLength;
        if (size > 200_000) { await reader.cancel(); throw new Error("RESPONSE_TOO_LARGE"); }
        text += decoder.decode(item.value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    const raw = object(JSON.parse(text) as unknown);
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
    return { data, source: "model", actionCount: raw.n_actions as number };
  } catch { return fallback(controller.signal.aborted ? "TIMEOUT" : "SERVICE_UNAVAILABLE"); }
  finally { clearTimeout(timer); }
}
