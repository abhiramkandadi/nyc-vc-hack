import { NextResponse } from "next/server";
import { getStartupProfiles, reportAktaTelemetry } from "@/lib/akta";
import { FEEDBACK_ACTIONS, FeedbackConflictError, submitFeedback, type FeedbackAction } from "@/lib/thesisRanker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;
const headers = { "Cache-Control": "no-store" };
class RequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError("JSON_CONTENT_TYPE_REQUIRED", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("INVALID_JSON");
  const decoder = new TextDecoder(); let bytes = 0, text = "";
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 8192) { void reader.cancel().catch(() => undefined); throw new RequestError("REQUEST_TOO_LARGE", 413); }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(text) as unknown; } catch { throw new RequestError("INVALID_JSON"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("INVALID_REQUEST");
  return body as Record<string, unknown>;
}
/** POST {id|uuid, action: pass|save|track|intro}. Single-partner demo session. */
export async function POST(request: Request): Promise<NextResponse> {
  const started = performance.now();
  try {
    const body = await readBody(request);
    if (body.id !== undefined && body.uuid !== undefined && body.id !== body.uuid) throw new RequestError("AMBIGUOUS_STARTUP_ID");
    const id = body.id ?? body.uuid;
    if (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(id)) throw new RequestError("INVALID_STARTUP_ID");
    if (typeof body.action !== "string" || !FEEDBACK_ACTIONS.includes(body.action as FeedbackAction)) throw new RequestError("INVALID_ACTION");
    const profiles = await getStartupProfiles();
    const profile = profiles.data.find((item) => item.id === id);
    if (!profile) throw new RequestError("STARTUP_NOT_FOUND", 404);
    const { backend, reason, duplicate, ...data } = await submitFeedback(profile, body.action as FeedbackAction, profiles.data.length);
    reportAktaTelemetry("feedback_recorded", { source: backend, count: data.n_actions, code: reason, latencyMs: Math.round(performance.now() - started) });
    return NextResponse.json({ success: true, data, meta: { backend, reason, duplicate } }, { headers });
  } catch (error: unknown) {
    const status = error instanceof RequestError ? error.status : error instanceof FeedbackConflictError ? 409 : 500;
    const code = error instanceof RequestError ? error.code : status === 409 ? "FEEDBACK_CONFLICT" : "FEEDBACK_FAILED";
    reportAktaTelemetry("feedback_failed", { code, latencyMs: Math.round(performance.now() - started) });
    return NextResponse.json({ success: false, error: { code } }, { status, headers });
  }
}
