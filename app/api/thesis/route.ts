import { NextResponse } from "next/server";
import { thesisServiceUrl } from "@/lib/thesisService";
import type { ThesisData } from "@/lib/thesisTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };

// The saved and passed lists stay on the server. The panel only needs the weights and the readback.
/** GET /api/thesis: the learned weights and the plain-English readback. */
export async function GET() {
  const url = thesisServiceUrl("/thesis");
  if (!url) return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED" } }, { status: 503, headers });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) return NextResponse.json({ success: false, error: { code: "SERVICE_REJECTED", status: response.status } }, { status: 502, headers });
    const raw = (await response.json()) as Record<string, unknown>;
    const weights: Record<string, number> = {};
    for (const [name, value] of Object.entries((raw.weights ?? {}) as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) weights[name] = value;
    }
    const data: ThesisData = {
      n_actions: Number.isSafeInteger(raw.n_actions) ? (raw.n_actions as number) : 0,
      weights,
      readback: typeof raw.readback === "string" ? raw.readback : null,
      readback_error: typeof raw.readback_error === "string" ? raw.readback_error : null,
      readback_pending: raw.readback_pending === true,
      fund: typeof raw.fund === "string" ? raw.fund : null,
    };
    return NextResponse.json({ success: true, data }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: { code: controller.signal.aborted ? "TIMEOUT" : "SERVICE_UNAVAILABLE" } }, { status: 502, headers });
  } finally {
    clearTimeout(timer);
  }
}
