import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS = ["pass", "save", "track", "intro"] as const;
type Action = (typeof ACTIONS)[number];
const headers = { "Cache-Control": "no-store" };

/** The thesis service, or null when it is not configured or the URL is unsafe. */
function serviceUrl(path: string): URL | null {
  const configured = process.env.THESIS_RANKER_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/$/, "") + path;
    return url;
  } catch {
    return null;
  }
}

async function forward(path: string, body?: unknown): Promise<Response> {
  const url = serviceUrl(path);
  if (!url) return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED" } }, { status: 503, headers });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(url, {
      method: "POST", cache: "no-store", redirect: "error", signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    // 409 on /action means this company already has an action, so the first decision stands.
    if (response.status === 409 && path === "/action") return NextResponse.json({ success: true, duplicate: true }, { headers });
    if (!response.ok) return NextResponse.json({ success: false, error: { code: "SERVICE_REJECTED", status: response.status } }, { status: response.status === 404 ? 404 : 502, headers });
    return NextResponse.json({ success: true, ...payload }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: { code: controller.signal.aborted ? "TIMEOUT" : "SERVICE_UNAVAILABLE" } }, { status: 502, headers });
  } finally {
    clearTimeout(timer);
  }
}

/** POST /api/feedback { id, action }: record one partner action with the thesis service. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: { code: "INVALID_JSON" } }, { status: 400, headers });
  }
  const id = body.id ?? body.startupId;
  const action = body.action;
  if (typeof id !== "string" || id.length < 1 || id.length > 200 || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_FEEDBACK", actions: ACTIONS } }, { status: 400, headers });
  }
  return forward("/action", { uuid: id, action });
}

/** DELETE /api/feedback: take back the latest action, for the Rewind button. */
export async function DELETE() {
  return forward("/undo");
}
