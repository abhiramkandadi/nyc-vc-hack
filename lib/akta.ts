import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { MOCK_STEALTH_STARTUPS, type StealthStartup, type StartupStage, type TargetSector } from "./mockData";
import { exportPrismTrace } from "./sponsorStack";

// Next.js loads .env.local into process.env. Never read/return the file itself,
// use NEXT_PUBLIC_ credentials, or import this module into a client component.
const DEFAULT_API_URL = "https://api.akta.pro/api/v1";
const CACHE_TTL_MS = 60_000;
const REQUEST_BUDGET_MS = 10_000;
const DISCOVERY_QUERY = "New York City stealth or recently launched Pre-Seed and Seed startups in AI infrastructure, AI agents, B2B SaaS, or robotics";
const HEADSHOTS = [
  "photo-1573496359142-b8d87734a5a2",
  "photo-1494790108377-be9c29b29330",
  "photo-1500648767791-00dcc994a43e",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1534528741775-53994a69daeb",
  "photo-1519085360753-af0119f7cbe7",
] as const;

type Raw = Record<string, unknown>;
export interface SignalEvidence { text: string; sourceUrl: string | null; observedAt: string | null }
export interface StartupProfile extends StealthStartup {
  dataSource: "akta.pro" | "mock";
  imageIsPlaceholder: boolean;
  imageSource: "akta.pro" | "unsplash-placeholder";
  stageIsInferred: boolean;
  sectorIsInferred: boolean;
  /** A demo-scale evidence coverage rubric, NOT investment quality/probability. */
  signalScoreMethod: "evidence-coverage-v1" | "demo";
  signalEvidence: SignalEvidence[];
  warnings: string[];
}
export interface HydrationResult { data: StartupProfile[]; fetchedAt: string; cached: boolean }
export interface AktaSeedDocument {
  schemaVersion: 1;
  provider: "akta.pro";
  sourceApiUrl: string;
  fetchedAt: string;
  data: StartupProfile[];
  provenance?: { transport: "mcp" | "rest"; newsIds: number[]; notes: string[] };
}
export interface StartupProfilesResult extends HydrationResult {
  source: "seed" | "live" | "mock";
  reason?: string;
  refreshing?: boolean;
}
export interface LiveFetchOptions {
  timeoutMs?: number;
  attempts?: number;
  /** Offline seeding allows this deadline per request rather than per pipeline. */
  perRequestTimeout?: boolean;
  bypassCache?: boolean;
  onProgress?: (event: { operation: string; attempt: number; attempts: number; code?: string }) => void;
}
export class AktaHydrationError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, status?: number) {
    super(`Akta hydration failed (${code}).`);
    this.name = "AktaHydrationError";
    this.code = code;
    this.status = status;
  }
}
function object(value: unknown): Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Raw : {};
}
function string(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === "string" && v.trim().length > 0)?.trim();
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : undefined;
  } catch { return undefined; }
}
function timestamp(value: unknown): string | null {
  const raw = string(value);
  // Preserve provider timestamps without inventing a timezone.
  return raw && Number.isFinite(Date.parse(raw)) ? raw : null;
}
function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
function short(value: string, max = 480): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  return (sentences?.slice(0, 2).join(" ") ?? normalized).slice(0, max).trim();
}
function placeholder(id: string): string {
  const index = Number.parseInt(createHash("sha256").update(id).digest("hex").slice(0, 8), 16) % HEADSHOTS.length;
  return `https://images.unsplash.com/${HEADSHOTS[index]}?auto=format&fit=crop&crop=faces&q=90&w=1200`;
}
function stageOf(company: Raw, firm: Raw): { stage: StartupStage; inferred: boolean; excluded: boolean } {
  const funding = object(company.funding);
  const round = object(funding.latest_round);
  const overview = object(object(company.funding_detail).funding_overview);
  const raw = string(company.stage, firm.stage, overview.funding_stage, object(overview.funding_stage).label, funding.stage, round.type, object(round.type).label)?.toLowerCase();
  if (raw && /pre[-\s]?seed/.test(raw)) return { stage: "Pre-Seed", inferred: false, excluded: false };
  if (raw && /\bseed\b/.test(raw)) return { stage: "Seed", inferred: false, excluded: false };
  return { stage: "Pre-Seed", inferred: true, excluded: Boolean(raw && /series|growth|public|ipo|late.stage/.test(raw)) };
}
function sectorOf(company: Raw, description: string): { sector: TargetSector; inferred: boolean } {
  const explicit = string(company.targetSector, company.target_sector, company.sector);
  if (explicit && ["AI Infra", "AI Agents", "B2B SaaS", "Physical AI"].includes(explicit)) return { sector: explicit as TargetSector, inferred: company.sectorIsInferred === true };
  const content = `${explicit ?? ""} ${string(company.product_category) ?? ""} ${description}`;
  const sector: TargetSector = /robot|physical ai|drone|autonomous vehicle/i.test(content) ? "Physical AI"
    : /agentic|ai agents|multi.agent/i.test(content) ? "AI Agents"
    : /inference|gpu|model infrastructure|ai infrastructure|quantization/i.test(content) ? "AI Infra" : "B2B SaaS";
  return { sector, inferred: true };
}
function records(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const raw = object(payload);
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.companies)) return raw.companies;
  if (raw.data && typeof raw.data === "object") return [raw.data];
  return [payload];
}

/**
 * Pure transformation of company enrichment records or { company, news } bundles.
 * Retains the current frontend's StealthStartup fields. Missing facts stay unknown;
 * the required stage/sector defaults and unrelated stock portraits are disclosed.
 */
export function hydrateStartupProfiles(payload: unknown): StartupProfile[] {
  const profiles = new Map<string, StartupProfile>();
  for (const item of records(payload).slice(0, 50)) {
    const bundle = object(item);
    const company = Object.keys(object(bundle.company)).length ? object(bundle.company) : bundle;
    const firm = object(company.firmographic);
    const name = string(firm.name, company.name, company.project_name);
    if (!name) continue;
    const id = string(company.uuid, company.id) ?? `akta-${createHash("sha256").update(string(firm.website, company.website) ?? name.toLowerCase()).digest("hex").slice(0, 20)}`;
    if (profiles.has(id)) continue;
    const stage = stageOf(company, firm);
    if (stage.excluded) continue;
    const leaders = array(object(company.management_profile).profiles).map(object);
    const founder = Object.keys(object(company.founder)).length ? object(company.founder)
      : leaders.find((leader) => /founder/i.test(string(leader.designation, leader.role) ?? "")) ?? {};
    const founderName = string(founder.name, founder.full_name, company.founderName, company.founder_name) ?? "Founder not disclosed";
    const prior = array(founder.previous_companies).map((v) => typeof v === "string" ? v : string(object(v).name)).filter((v): v is string => Boolean(v));
    const exCompany = string(founder.exCompany, founder.ex_company, founder.previous_company, ...prior) ?? "Not disclosed";
    const portrait = safeUrl(string(founder.image_url, founder.profile_image_url, founder.photo_url, founder.image, company.founderImage, company.founder_image));
    const founderImage = portrait ?? placeholder(id);
    const news = array(bundle.news).map(object);
    const description = short(string(firm.company_description_short, firm.company_description, company.pitchSummary, company.description, news[0]?.ai_summary) ?? `Company description for ${name} is not available from the current source.`);
    const sector = sectorOf(company, description);
    const evidence: SignalEvidence[] = [];
    const push = (label: string, source?: unknown, observed?: unknown): void => {
      const labelText = label.replace(/\s+/g, " ").trim().slice(0, 180);
      if (labelText && !evidence.some((e) => e.text === labelText)) evidence.push({ text: labelText, sourceUrl: safeUrl(source) ?? null, observedAt: timestamp(observed) });
    };
    const github = object(company.github);
    const commits = finite(github.commits_last_30_days ?? github.commits_per_month);
    if (commits !== undefined) push(`${Math.floor(commits)} GitHub commits/mo`, github.source_url, github.observed_at);
    const filing = object(company.incorporation);
    const jurisdiction = string(filing.jurisdiction);
    const entityType = string(filing.entity_type, filing.type);
    if (jurisdiction && entityType) push(`${jurisdiction} ${entityType} filed`, filing.source_url, filing.filing_date);
    const hiring = object(company.hiring);
    const openings = finite(hiring.ml_engineer_openings);
    if (openings !== undefined) push(`Hiring ${Math.floor(openings)} ML engineers`, hiring.source_url, hiring.observed_at);
    for (const entry of array(company.signals)) {
      const signal = object(entry);
      const label = typeof entry === "string" ? entry : string(signal.text, signal.title, signal.description);
      if (label) push(label, signal.source_url ?? signal.url, signal.observed_at);
    }
    if (exCompany !== "Not disclosed") push(`Founder previously at ${exCompany}`, array(founder.source)[0]);
    for (const article of news) {
      const title = string(article.title);
      if (title) push(`News: ${title}`, article.url, article.published_date);
    }
    const observedEvidenceCount = evidence.length;
    const labels = evidence.slice(0, 3).map((e) => e.text);
    for (const missing of ["GitHub activity not available", "Incorporation record not available", "Hiring signal not available"]) {
      if (labels.length < 3 && !labels.includes(missing)) labels.push(missing);
    }
    const founderKnown = founderName !== "Founder not disclosed";
    const score = Math.min(98, 85 + Math.min(6, observedEvidenceCount * 2) + (founderKnown ? 2 : 0) + (exCompany !== "Not disclosed" ? 2 : 0) + (!stage.inferred ? 1 : 0) + (string(firm.company_description_short, company.description) ? 2 : 0));
    const warnings = ["Signal score uses a demo-scale evidence coverage rubric, not investment probability."];
    for (const warning of array(company.data_warnings)) if (typeof warning === "string") warnings.push(warning.slice(0, 500));
    if (!portrait) warnings.push("Stock portrait placeholder; not an image of the named founder.");
    if (!founderKnown) warnings.push("Founder identity unavailable.");
    if (stage.inferred) warnings.push("Stage unavailable; Pre-Seed is a display default.");
    if (sector.inferred) warnings.push("Sector inferred for frontend filtering; verify classification.");
    if (observedEvidenceCount < 3) warnings.push("Fewer than three source signals; unavailable fields are labeled.");
    const latest = news.find((article) => string(article.title) && safeUrl(article.url));
    const greeting = founderKnown ? `Hi ${founderName.split(/\s+/)[0]}` : "Hi there";
    profiles.set(id, {
      id, name, founderName, founderImage, founderAvatar: founderImage, exCompany,
      founderBackground: string(founder.designation, founder.role) ?? (exCompany === "Not disclosed" ? "Background not disclosed" : `Previously at ${exCompany}`),
      headline: short(string(company.headline, firm.company_description_short, company.product_category) ?? description, 150),
      signalScore: score, stage: stage.stage, signals: labels as [string, string, string], pitchSummary: description, targetSector: sector.sector,
      draftEmail: `${greeting},\n\nWe came across ${name} while researching early-stage companies. ${short(description, 280)}\n\nWould you be open to a brief conversation about your product, customer discovery, and current priorities?\n\nBest,\nThe investment team`,
      ...(latest ? { liveNews: { title: string(latest.title)!, url: safeUrl(latest.url)! } } : {}),
      dataSource: "akta.pro", imageIsPlaceholder: !portrait, imageSource: portrait ? "akta.pro" : "unsplash-placeholder",
      stageIsInferred: stage.inferred, sectorIsInferred: sector.inferred, signalScoreMethod: "evidence-coverage-v1", signalEvidence: evidence.slice(0, 12), warnings,
    });
  }
  return Array.from(profiles.values());
}

/** Keep the shared mock dataset intact while exposing matching provenance fields. */
export function getMockStartupProfiles(): StartupProfile[] {
  return MOCK_STEALTH_STARTUPS.map((startup) => ({ ...structuredClone(startup), dataSource: "mock", imageIsPlaceholder: true,
    imageSource: "unsplash-placeholder", stageIsInferred: false, sectorIsInferred: false, signalScoreMethod: "demo", signalEvidence: [],
    warnings: ["Demo profile, affiliations, metrics, and signals are synthetic.", "Stock portrait placeholder; not a verified founder image."] }));
}
function apiBase(): string {
  let url: URL;
  try { url = new URL(process.env.AKTA_API_URL || DEFAULT_API_URL); }
  catch { throw new AktaHydrationError("INVALID_API_URL"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new AktaHydrationError("INVALID_API_URL");
  return url.toString().replace(/\/$/, "");
}
async function fetchAktaOnce(base: string, path: string, apiKey: string, parentSignal: AbortSignal, timeoutMs: number, body?: Raw): Promise<unknown> {
  const url = `${base}/${path}`;
  parentSignal.throwIfAborted();
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  parentSignal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  const signal = controller.signal;
  try {
    const response = await fetch(url, { method: body ? "POST" : "GET", headers: { "x-api-key": apiKey, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal, cache: "no-store", redirect: "error" });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new AktaHydrationError(response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_HTTP_ERROR", response.status);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new AktaHydrationError("EMPTY_RESPONSE");
    let size = 0, content = "";
    const decoder = new TextDecoder();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 2_097_152) { await reader.cancel(); throw new AktaHydrationError("RESPONSE_TOO_LARGE"); }
        content += decoder.decode(part.value, { stream: true });
      }
      content += decoder.decode();
    } finally { reader.releaseLock(); }
    try { return JSON.parse(content) as unknown; } catch { throw new AktaHydrationError("INVALID_RESPONSE"); }
  } catch (error: unknown) {
    if (signal.aborted) throw new AktaHydrationError("TIMEOUT");
    if (error instanceof AktaHydrationError) throw error;
    throw new AktaHydrationError("NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener("abort", abort);
  }
}
async function fetchAkta(base: string, path: string, apiKey: string, signal: AbortSignal, options: LiveFetchOptions, body?: Raw): Promise<unknown> {
  const attempts = options.attempts ?? 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    options.onProgress?.({ operation: path.split("?")[0], attempt, attempts });
    try { return await fetchAktaOnce(base, path, apiKey, signal, options.timeoutMs ?? REQUEST_BUDGET_MS, body); }
    catch (error: unknown) {
      const failure = error instanceof AktaHydrationError ? error : new AktaHydrationError("TIMEOUT");
      options.onProgress?.({ operation: path.split("?")[0], attempt, attempts, code: failure.code });
      const retryable = ["TIMEOUT", "NETWORK_ERROR", "RATE_LIMITED"].includes(failure.code) || (failure.status !== undefined && failure.status >= 500);
      if (signal.aborted || !retryable || attempt === attempts) throw failure;
      await new Promise<void>((resolve, reject) => {
        const abort = (): void => { clearTimeout(timer); reject(new AktaHydrationError("TIMEOUT")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 500 * 2 ** (attempt - 1));
        signal.addEventListener("abort", abort, { once: true });
      });
    }
  }
  throw new AktaHydrationError("RETRIES_EXHAUSTED");
}
let cached: { key: string; expiresAt: number; result: HydrationResult } | undefined;
let inFlight: { key: string; promise: Promise<HydrationResult> } | undefined;

/** Bounded discovery + firmographic/founder/news enrichment; successful results cache for 60s. */
export async function fetchStartupProfiles(options: LiveFetchOptions = {}): Promise<HydrationResult> {
  if (!Number.isInteger(options.timeoutMs ?? REQUEST_BUDGET_MS) || (options.timeoutMs ?? REQUEST_BUDGET_MS) < 100 || (options.timeoutMs ?? REQUEST_BUDGET_MS) > 60_000) throw new AktaHydrationError("INVALID_TIMEOUT");
  if (!Number.isInteger(options.attempts ?? 1) || (options.attempts ?? 1) < 1 || (options.attempts ?? 1) > 3) throw new AktaHydrationError("INVALID_ATTEMPTS");
  const apiKey = process.env.AKTA_API_KEY?.trim();
  if (!apiKey) throw new AktaHydrationError("MISSING_API_KEY");
  const base = apiBase();
  const query = process.env.AKTA_DISCOVERY_QUERY?.trim() || DISCOVERY_QUERY;
  if (query.length > 2_000) throw new AktaHydrationError("INVALID_DISCOVERY_QUERY");
  const cacheKey = createHash("sha256").update(JSON.stringify([base, query, apiKey])).digest("hex");
  if (!options.bypassCache && cached?.key === cacheKey && cached.expiresAt > Date.now()) return { ...structuredClone(cached.result), cached: true };
  if (!options.bypassCache && inFlight?.key === cacheKey) return structuredClone(await inFlight.promise);
  const pending = (async (): Promise<HydrationResult> => {
    const controller = new AbortController();
    const timer = options.perRequestTimeout ? undefined : setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_BUDGET_MS);
    try {
      const discovery = object(await fetchAkta(base, "list/generate/companies/", apiKey, controller.signal, options, { query, limit: 6 }));
      const candidates = array(discovery.data).map(object).filter((company) => string(company.uuid, company.website)).slice(0, 6);
      if (!candidates.length) throw new AktaHydrationError("NO_PROFILES");
      const bundles: { company: Raw; news: unknown[] }[] = [];
      // Two companies concurrently, each with two reads: at most four enrichments in flight.
      for (let index = 0; index < candidates.length; index += 2) {
        const batch = await Promise.all(candidates.slice(index, index + 2).map(async (company) => {
          const identifier = string(company.uuid, company.website)!;
          const enrichmentQuery = new URLSearchParams({ company: identifier, sections: "firmographic,management_profile" });
          const newsQuery = new URLSearchParams({ company: identifier, limit: "3" });
          const [enrichment, news] = await Promise.all([
            fetchAkta(base, `company/enrichment/?${enrichmentQuery}`, apiKey, controller.signal, options),
            fetchAkta(base, `news/?${newsQuery}`, apiKey, controller.signal, options),
          ]);
          const enriched = object(object(enrichment).data);
          if (!Object.keys(enriched).length) throw new AktaHydrationError("INVALID_RESPONSE");
          return { company: { ...company, ...enriched }, news: array(object(news).data) };
        }));
        bundles.push(...batch);
      }
      const data = hydrateStartupProfiles(bundles);
      if (!data.length) throw new AktaHydrationError("NO_PROFILES");
      const result: HydrationResult = { data, fetchedAt: new Date().toISOString(), cached: false };
      cached = { key: cacheKey, expiresAt: Date.now() + CACHE_TTL_MS, result: structuredClone(result) };
      return result;
    } finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); }
  })();
  inFlight = { key: cacheKey, promise: pending };
  try { return structuredClone(await pending); }
  finally { if (inFlight?.promise === pending) inFlight = undefined; }
}

/** Reject malformed or mock artifacts rather than relabeling them as provider data. */
export function parseSeededAktaData(value: unknown): AktaSeedDocument | null {
  const raw = object(value);
  const fetchedAt = string(raw.fetchedAt);
  if (raw.schemaVersion !== 1 || raw.provider !== "akta.pro" || !fetchedAt || !Number.isFinite(Date.parse(fetchedAt)) || Date.parse(fetchedAt) > Date.now() + 300_000 || !safeUrl(raw.sourceApiUrl)) return null;
  if (!Array.isArray(raw.data) || raw.data.length < 1 || raw.data.length > 500) return null;
  const ids = new Set<string>();
  for (const item of raw.data) {
    const p = object(item);
    if (["id", "name", "founderName", "founderAvatar", "founderImage", "exCompany", "founderBackground", "headline", "pitchSummary", "draftEmail"].some((field) => !string(p[field]) || String(p[field]).length > 32_000)) return null;
    const id = p.id as string;
    if (ids.has(id) || p.dataSource !== "akta.pro" || p.signalScoreMethod !== "evidence-coverage-v1") return null;
    ids.add(id);
    if (!safeUrl(p.founderImage) || !safeUrl(p.founderAvatar) || !["Pre-Seed", "Seed"].includes(String(p.stage)) || !["AI Infra", "AI Agents", "B2B SaaS", "Physical AI"].includes(String(p.targetSector))) return null;
    if (!Number.isInteger(p.signalScore) || Number(p.signalScore) < 85 || Number(p.signalScore) > 98) return null;
    if (!["akta.pro", "unsplash-placeholder"].includes(String(p.imageSource)) || [p.imageIsPlaceholder, p.stageIsInferred, p.sectorIsInferred].some((flag) => typeof flag !== "boolean")) return null;
    if (p.imageIsPlaceholder !== (p.imageSource === "unsplash-placeholder")) return null;
    if (!Array.isArray(p.signals) || p.signals.length !== 3 || !p.signals.every((label) => typeof label === "string" && label.trim().length > 0)) return null;
    if (!Array.isArray(p.warnings) || !p.warnings.every((warning) => typeof warning === "string") || !Array.isArray(p.signalEvidence) || p.signalEvidence.length > 12) return null;
    if (!p.signalEvidence.every((item) => { const e = object(item); return Boolean(string(e.text)) && (e.sourceUrl === null || Boolean(safeUrl(e.sourceUrl))) && (e.observedAt === null || timestamp(e.observedAt) !== null); })) return null;
    if (p.liveNews !== undefined && (!string(object(p.liveNews).title) || !safeUrl(object(p.liveNews).url))) return null;
  }
  return structuredClone(raw) as unknown as AktaSeedDocument;
}

const pendingTelemetry = new Set<Promise<void>>();
/** Nonblocking, bounded PRISM delivery; no upstream bodies or credentials are logged. */
export function reportAktaTelemetry(event: string, detail: { source?: string; count?: number; code?: string; latencyMs?: number } = {}): void {
  console.info("[akta]", { event, ...detail });
  if (!process.env.PRISMTRACE_API_KEY?.trim()) return;
  const delivery = exportPrismTrace({
    project_id: process.env.PRISM_PROJECT_ID?.trim() || "company-tinder", model: "not-applicable",
    input_messages: [{ role: "user", content: "Resolve startup profiles using seed, live cache, or demo fallback." }],
    output_message: JSON.stringify({ event, ...detail }), latency_ms: detail.latencyMs ?? 0,
    session_id: randomUUID(), agent_id: "AktaHydrationService",
  }, { timeoutMs: 500 }).catch(() => { console.warn("[akta] PRISM telemetry unavailable"); }).finally(() => { pendingTelemetry.delete(delivery); });
  pendingTelemetry.add(delivery);
}
/** Await before exiting a script/job. HTTP handlers intentionally avoid this delay.
 * Serverless hosts need their own waitUntil/durable queue for guaranteed delivery.
 */
export async function flushAktaTelemetry(): Promise<void> { await Promise.allSettled(Array.from(pendingTelemetry)); }

let seedMemo: { path: string; mtimeMs: number; size: number; document: AktaSeedDocument | null } | undefined;
async function readSeed(path: string): Promise<AktaSeedDocument | null> {
  try {
    const info = await stat(path);
    if (seedMemo?.path === path && seedMemo.mtimeMs === info.mtimeMs && seedMemo.size === info.size) return seedMemo.document;
    const parsed = info.size > 2_097_152 ? null : parseSeededAktaData(JSON.parse(await readFile(path, "utf8")) as unknown);
    seedMemo = { path, mtimeMs: info.mtimeMs, size: info.size, document: parsed };
    if (!parsed) reportAktaTelemetry("seed_invalid", { code: "INVALID_SEED" });
    return parsed;
  } catch (error: unknown) {
    if (object(error).code !== "ENOENT") reportAktaTelemetry("seed_unavailable", { code: "SEED_READ_FAILED" });
    return null;
  }
}
let backgroundRefresh: Promise<void> | undefined;
let refreshFailure: { key: string; reason: string; retryAt: number } | undefined;

/**
 * Seed-first, with no akta/PRISM network await on the response path. On a miss,
 * a best-effort Node background refresh is limited to 2.5s; this request receives
 * the mock deck and the next request can use warmed live data. Dedicated jobs
 * should await fetchStartupProfiles()/flushAktaTelemetry() before exiting.
 * Filesystem/JSON/HTTP overhead still exists; literal 0ms cannot be guaranteed.
 */
/**
 * A local, gitignored seed (the 180-company pull, licensed akta.pro data) wins over the
 * committed 50-profile seed when it exists, so the public repo never carries the larger set.
 */
async function defaultSeedPath(): Promise<string> {
  const local = join(process.cwd(), "lib", "seededAktaData.local.json");
  try { await stat(local); return local; } catch { return join(process.cwd(), "lib", "seededAktaData.json"); }
}

export async function getStartupProfiles(options: { seedPath?: string } = {}): Promise<StartupProfilesResult> {
  const started = performance.now();
  const seed = await readSeed(options.seedPath ?? await defaultSeedPath());
  if (seed) {
    reportAktaTelemetry("seed_cache_hit", { source: "seed", count: seed.data.length, latencyMs: Math.round(performance.now() - started) });
    return { data: structuredClone(seed.data), fetchedAt: seed.fetchedAt, cached: true, source: "seed" };
  }
  let reason = "MISSING_API_KEY";
  if (process.env.AKTA_API_KEY?.trim()) {
    try {
      const cacheKey = createHash("sha256").update(JSON.stringify([apiBase(), process.env.AKTA_DISCOVERY_QUERY?.trim() || DISCOVERY_QUERY, process.env.AKTA_API_KEY.trim()])).digest("hex");
      if (cached?.key === cacheKey && cached.expiresAt > Date.now()) {
        reportAktaTelemetry("live_cache_hit", { source: "live", count: cached.result.data.length });
        return { ...structuredClone(cached.result), cached: true, source: "live" };
      }
      reason = refreshFailure?.key === cacheKey && refreshFailure.retryAt > Date.now() ? refreshFailure.reason : "LIVE_REFRESH_PENDING";
      if (!backgroundRefresh && reason === "LIVE_REFRESH_PENDING") {
        reportAktaTelemetry("live_refresh_started", { source: "live" });
        backgroundRefresh = fetchStartupProfiles({ timeoutMs: 2_500, attempts: 1, bypassCache: true })
          .then((result) => { refreshFailure = undefined; reportAktaTelemetry("live_refresh_succeeded", { source: "live", count: result.data.length }); })
          .catch((error: unknown) => {
            const code = error instanceof AktaHydrationError ? error.code : "HYDRATION_FAILED";
            refreshFailure = { key: cacheKey, reason: code, retryAt: Date.now() + 30_000 };
            reportAktaTelemetry("live_refresh_failed", { source: "live", code });
          }).finally(() => { backgroundRefresh = undefined; });
      }
    } catch { reason = "INVALID_API_CONFIGURATION"; }
  }
  const data = getMockStartupProfiles();
  reportAktaTelemetry("mock_fallback", { source: "mock", count: data.length, code: reason });
  return { data, source: "mock", reason, refreshing: Boolean(backgroundRefresh), fetchedAt: new Date().toISOString(), cached: false };
}
