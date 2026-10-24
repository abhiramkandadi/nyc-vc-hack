import "server-only";
import type { AgentMessage } from "./roundtableWorker";

/**
 * Server-only sponsor clients. Importing this module makes no requests.
 * Keys are resolved per call, so an unused sponsor needs no configuration.
 * No POST is automatically retried: inference, browser allocation, and message
 * delivery may incur cost or duplicate side effects after uncertain delivery.
 *
 * References:
 * https://docs.akta.pro/api-reference/news-signals
 * https://nicrron.ai/docs/api
 * https://docs.getsolari.com/api-reference/browser
 * PRISM's endpoint/header/schema follow the hackathon integration brief.
 */
export type Sponsor = "akta" | "roundtable" | "prism" | "nicrron" | "solari";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface JsonObject { [key: string]: JsonValue }
export interface RequestOptions { signal?: AbortSignal; timeoutMs?: number }

export class SponsorApiError extends Error {
  readonly sponsor: Sponsor;
  readonly code: string;
  readonly status?: number;
  readonly retryAfterMs?: number;
  constructor(sponsor: Sponsor, code: string, status?: number, retryAfterMs?: number) {
    super(`${sponsor} request failed (${code}${status === undefined ? "" : `: HTTP ${status}`}).`);
    this.name = "SponsorApiError";
    this.sponsor = sponsor;
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function record(value: unknown, sponsor: Sponsor): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SponsorApiError(sponsor, "INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 4_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new TypeError(`${label} must be a non-empty string of at most ${max} characters.`);
  return value.trim();
}
function numeric(value: unknown, label: string, min: number, max: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new RangeError(`${label} is outside its permitted range.`);
  return value;
}
function key(name: string, sponsor: Sponsor): string {
  const value = process.env[name]?.trim();
  if (!value) throw new SponsorApiError(sponsor, "MISSING_API_KEY");
  return value;
}
function apiUrl(value: string, path = ""): string {
  const base = new URL(value);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new TypeError("Invalid API base URL.");
  if (!path) return base.toString();
  if (path.startsWith("//") || path.includes("://") || path.split("/").some((part) => part === "." || part === "..")) throw new TypeError("API path must be relative to the configured base.");
  const url = new URL(`${base.toString().replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  if (url.origin !== base.origin || url.hash) throw new TypeError("Invalid API path.");
  return url.toString();
}
function serialize(value: unknown): string {
  let result: string | undefined;
  try {
    result = JSON.stringify(value, (_name, item: unknown) => {
      if (typeof item === "bigint" || typeof item === "function" || typeof item === "symbol" || (typeof item === "number" && !Number.isFinite(item))) throw new TypeError("Unsupported JSON value.");
      return item;
    });
  } catch { throw new TypeError("Payload must contain serializable JSON values."); }
  if (!result || new TextEncoder().encode(result).byteLength > 262_144) throw new RangeError("Payload exceeds the 256 KiB limit.");
  return result;
}
function retryDelay(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}
async function readJson(response: Response, sponsor: Sponsor): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new SponsorApiError(sponsor, "EMPTY_RESPONSE");
  let bytes = 0, content = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2_097_152) { await reader.cancel().catch(() => undefined); throw new SponsorApiError(sponsor, "RESPONSE_TOO_LARGE"); }
      content += decoder.decode(chunk.value, { stream: true });
    }
    content += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(content) as unknown; }
  catch { throw new SponsorApiError(sponsor, "INVALID_JSON"); }
}
async function request(
  sponsor: Sponsor, url: string, method: "GET" | "POST" | "DELETE",
  headers: Record<string, string>, body: unknown, options: RequestOptions,
  responseMode: "json" | "ack" = "json",
): Promise<unknown> {
  options.signal?.throwIfAborted();
  const timeout = numeric(options.timeoutMs ?? 15_000, "timeoutMs", 100, 120_000, true);
  const encoded = body === undefined ? undefined : serialize(body);
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetch(url, { method, headers: { Accept: "application/json", ...(encoded === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
      ...(encoded === undefined ? {} : { body: encoded }), signal: controller.signal, redirect: "error", cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new SponsorApiError(sponsor, "HTTP_ERROR", response.status, retryDelay(response.headers.get("retry-after")));
    }
    if (responseMode === "ack") { await response.body?.cancel(); return undefined; }
    return await readJson(response, sponsor);
  } catch (error: unknown) {
    if (options.signal?.aborted) throw options.signal.reason;
    if (timedOut) throw new SponsorApiError(sponsor, "TIMEOUT");
    if (error instanceof SponsorApiError) throw error;
    // Never expose upstream error bodies, signed session URLs, or credentials.
    throw new SponsorApiError(sponsor, "REQUEST_FAILED");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export interface AktaNewsSignal {
  id: string | number;
  title: string;
  url: string;
  /** Provider's original publication timestamp; no timezone is inferred. */
  published_date: string | null;
  ai_summary: string | null;
}
export interface AktaSignalPage {
  provider: "akta.pro";
  fetchedAt: string;
  data: AktaNewsSignal[];
  total: number;
  count: number;
  limit: number;
  offset: number;
}
export interface AktaNewsQuery {
  /** Company UUID or website, not an unresolved free-text company name. */
  company?: string;
  query?: string;
  limit?: number;
  offset?: number;
}
// The akta.pro news client was removed: this repo must never call akta.pro and spend credits.

export interface RoundtablePostOptions extends RequestOptions {
  /** Optional sponsor-confirmed relative ingestion path; no endpoint is invented. */
  path?: string;
  /** Supply a stable ID only when the receiving endpoint honors idempotency. */
  idempotencyKey?: string;
}
/**
 * Posts structured JSON to the configured REST endpoint (root by default).
 * Configure path for the sponsor's ingestion route. For threaded deal briefs,
 * existing RoundtableRestAdapter supports a replaceable thread wire contract.
 * A 2xx response acknowledges HTTP delivery, not exactly-once processing.
 */
export async function postRoundtablePayload(payload: AgentMessage | JsonObject, options: RoundtablePostOptions = {}): Promise<void> {
  record(payload, "roundtable");
  const headers: Record<string, string> = { Authorization: `Bearer ${key("ROUNDTABLE_API_KEY", "roundtable")}` };
  if (options.idempotencyKey) headers["Idempotency-Key"] = text(options.idempotencyKey, "idempotencyKey", 200);
  await request("roundtable", apiUrl(process.env.ROUNDTABLE_API_URL || "https://api.roundtable.ai/v1", options.path), "POST", headers, payload, options, "ack");
}

export interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string }
export interface PrismTrace {
  project_id: string;
  model: string;
  input_messages: ChatMessage[];
  output_message: string | ChatMessage;
  latency_ms: number;
  session_id: string;
  agent_id: string;
}
function messages(value: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new TypeError("Provide 1–100 chat messages.");
  return value.map((message) => {
    if (!message || !["system", "user", "assistant", "tool"].includes(message.role)) throw new TypeError("Unsupported chat message role.");
    text(message.content, "message content", 64_000);
    return { role: message.role, content: message.content };
  });
}
function redactKnownKeys(value: unknown): unknown {
  const secrets = ["AKTA_API_KEY", "ROUNDTABLE_API_KEY", "PRISMTRACE_API_KEY", "NICRRON_API_KEY", "SOLARI_API_KEY", "THOR_API_KEY"]
    .map((name) => process.env[name]).filter((secret): secret is string => Boolean(secret));
  const walk = (item: unknown): unknown => {
    if (typeof item === "string") {
      let result = item.replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]");
      for (const secret of secrets) result = result.split(secret).join("[REDACTED]");
      return result;
    }
    if (Array.isArray(item)) return item.map(walk);
    if (typeof item === "object" && item !== null) return Object.fromEntries(Object.entries(item).map(([name, child]) => [name, /^(authorization|api[-_]?key|password|secret|token)$/i.test(name) ? "[REDACTED]" : walk(child)]));
    return item;
  };
  return walk(value);
}
/** Export only approved input/output summaries, never private chain-of-thought. */
export async function exportPrismTrace(trace: PrismTrace, options: RequestOptions = {}): Promise<void> {
  const apiKey = key("PRISMTRACE_API_KEY", "prism");
  const output = typeof trace.output_message === "string" ? text(trace.output_message, "output_message", 64_000) : messages([trace.output_message])[0];
  const body: PrismTrace = {
    project_id: text(trace.project_id, "project_id", 200), model: text(trace.model, "model", 256),
    input_messages: messages(trace.input_messages), output_message: output,
    latency_ms: numeric(trace.latency_ms, "latency_ms", 0, Number.MAX_SAFE_INTEGER),
    session_id: text(trace.session_id, "session_id", 200), agent_id: text(trace.agent_id, "agent_id", 200),
  };
  await request("prism", "https://prism.blockconvey.com/api/traces", "POST", { "X-PRISMtrace-Key": apiKey }, redactKnownKeys(body), options, "ack");
}

export interface NicrronChatRequest {
  messages: ChatMessage[];
  model?: string;
  models?: string[];
  temperature?: number;
  maxTokens?: number;
}
export interface NicrronChatResult { id: string | null; model: string; content: string; finishReason: string }
/** Nicrron gateway client shared by Nicrron/Ninoo; no extra SDK dependency. */
export async function nicrronChat(input: NicrronChatRequest, options: RequestOptions = {}): Promise<NicrronChatResult> {
  const apiKey = key("NICRRON_API_KEY", "nicrron");
  const model = text(input.model ?? process.env.NICRRON_MODEL ?? "nicrron/auto", "model", 256);
  if (input.models !== undefined && (!Array.isArray(input.models) || input.models.length > 10)) throw new RangeError("At most 10 fallback models are supported.");
  const body = { model, messages: messages(input.messages), stream: false,
    temperature: numeric(input.temperature ?? 0.2, "temperature", 0, 2), max_tokens: numeric(input.maxTokens ?? 1_200, "maxTokens", 1, 128_000, true),
    ...(input.models === undefined ? {} : { models: input.models.map((name) => text(name, "fallback model", 256)) }) };
  const raw = record(await request("nicrron", apiUrl(process.env.NICRRON_API_URL || "https://api.nicrron.ai/v1", "chat/completions"), "POST", { Authorization: `Bearer ${apiKey}` }, body, { timeoutMs: 30_000, ...options }), "nicrron");
  if (!Array.isArray(raw.choices) || !raw.choices.length) throw new SponsorApiError("nicrron", "INVALID_RESPONSE");
  const choice = record(raw.choices[0], "nicrron"), message = record(choice.message, "nicrron");
  if (choice.finish_reason !== "stop") throw new SponsorApiError("nicrron", "INCOMPLETE_COMPLETION");
  return { id: raw.id == null ? null : text(raw.id, "completion ID", 256), model: text(raw.model, "response model", 256), content: text(message.content, "completion", 128_000), finishReason: "stop" };
}

export interface SolariBrowserOptions { profileId?: string; recording?: boolean; stealth?: boolean }
export interface SolariBrowserSession {
  sessionId: string;
  /** Signed capabilities: keep on the backend and never log or publish them. */
  wsEndpoint: string;
  cdpEndpoint: string;
  expiresAt: string;
}
function sessionSegment(value: string): string {
  const id = text(value, "sessionId", 4_096);
  if (id === "." || id === "..") throw new TypeError("Invalid sessionId.");
  return encodeURIComponent(id);
}
function websocket(value: unknown): string {
  const url = new URL(text(value, "browser endpoint", 8_192));
  if (!["wss:", "ws:"].includes(url.protocol) || url.username || url.password || url.hash) throw new SponsorApiError("solari", "INVALID_RESPONSE");
  return url.toString();
}
export async function createSolariBrowser(options: SolariBrowserOptions = {}, requestOptions: RequestOptions = {}): Promise<SolariBrowserSession> {
  const apiKey = key("SOLARI_API_KEY", "solari");
  for (const toggle of [options.recording, options.stealth]) if (toggle !== undefined && typeof toggle !== "boolean") throw new TypeError("Browser toggles must be booleans.");
  const body = { ...(options.profileId === undefined ? {} : { profileId: text(options.profileId, "profileId", 200) }), recording: options.recording ?? false, stealth: options.stealth ?? false };
  const raw = record(await request("solari", apiUrl(process.env.SOLARI_API_URL || "https://api.getsolari.com", "sessions"), "POST", { Authorization: `Bearer ${apiKey}` }, body, { timeoutMs: 30_000, ...requestOptions }), "solari");
  const sessionId = text(raw.sessionId, "sessionId", 4_096);
  try {
    const expiresAt = text(raw.expiresAt, "expiresAt", 100);
    if (!Number.isFinite(Date.parse(expiresAt))) throw new SponsorApiError("solari", "INVALID_RESPONSE");
    return { sessionId, wsEndpoint: websocket(raw.wsEndpoint), cdpEndpoint: websocket(raw.cdpEndpoint), expiresAt };
  } catch (error: unknown) {
    try { await releaseSolariBrowser(sessionId); }
    catch (cleanup: unknown) { throw new AggregateError([error, cleanup], "Invalid browser session response; release also failed."); }
    throw error;
  }
}
/** DELETE acceptance does not itself prove the remote session has terminated. */
export async function releaseSolariBrowser(sessionId: string, options: RequestOptions = {}): Promise<void> {
  await request("solari", apiUrl(process.env.SOLARI_API_URL || "https://api.getsolari.com", `sessions/${sessionSegment(sessionId)}`), "DELETE", { Authorization: `Bearer ${key("SOLARI_API_KEY", "solari")}` }, undefined, options, "ack");
}
/** Connect Playwright/CDP in work(); no browser library is installed by this helper. */
export async function withSolariBrowser<T>(options: SolariBrowserOptions, work: (session: SolariBrowserSession) => Promise<T>, requestOptions: RequestOptions = {}): Promise<T> {
  const session = await createSolariBrowser(options, requestOptions);
  let result: T;
  try {
    requestOptions.signal?.throwIfAborted();
    result = await work(session);
  } catch (error: unknown) {
    // Cleanup deliberately uses an independent deadline if the caller canceled.
    try { await releaseSolariBrowser(session.sessionId); }
    catch (cleanup: unknown) { throw new AggregateError([error, cleanup], "Browser operation and release both failed."); }
    throw error;
  }
  await releaseSolariBrowser(session.sessionId);
  return result;
}

/** Flat exports above and a discoverable grouped interface share the same clients. */
export const sponsorStack = {
  roundtable: { post: postRoundtablePayload },
  prism: { exportTrace: exportPrismTrace },
  nicrron: { chat: nicrronChat },
  solari: { createBrowser: createSolariBrowser, releaseBrowser: releaseSolariBrowser, withBrowser: withSolariBrowser },
} as const;
