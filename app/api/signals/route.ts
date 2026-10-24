import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { exportPrismTrace } from "@/lib/sponsorStack";
import { AktaHydrationError, getStartupProfiles, getMockStartupProfiles } from "@/lib/akta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Live discovery and hydration, with explicit demo fallback. `startups`/`source`
 * remain compatible with the existing UI; new clients consume `success`/`data`.
 */
export async function GET() {
  const startedAt = performance.now();
  const headers = { "Cache-Control": "no-store" };
  try {
    const result = await getStartupProfiles();
    const demo = result.source === "mock";
    return NextResponse.json({
      success: true, data: result.data, source: demo ? "sample" : "live", startups: result.data,
      meta: { dataSource: demo ? "mock" : "akta.pro", retrieval: result.source, demo, reason: result.reason,
        refreshing: result.refreshing ?? false, fetchedAt: result.fetchedAt, cached: result.cached },
    }, { headers: { ...headers, "X-Data-Source": demo ? "mock" : "akta.pro", "X-Data-Retrieval": result.source } });
  } catch (error: unknown) {
    const reason = error instanceof AktaHydrationError ? error.code : "HYDRATION_FAILED";
    // Do not log raw errors, provider bodies, keys, or private company payloads.
    console.warn("[signals] Returning demo profiles", { reason });
    if (process.env.PRISMTRACE_API_KEY?.trim()) {
      try {
        await exportPrismTrace({
          project_id: process.env.PRISM_PROJECT_ID?.trim() || "company-tinder",
          model: "not-applicable",
          input_messages: [{ role: "user", content: "Hydrate startup profiles from akta.pro." }],
          output_message: JSON.stringify({ event: "akta_hydration_fallback", reason, dataSource: "mock" }),
          latency_ms: Math.round(performance.now() - startedAt),
          session_id: randomUUID(), agent_id: "AktaHydrationService",
        }, { timeoutMs: 1_000 });
      } catch {
        console.warn("[signals] Fallback telemetry unavailable");
      }
    }
    const data = getMockStartupProfiles();
    return NextResponse.json({
      success: true, data, source: "sample", startups: data,
      meta: { dataSource: "mock", demo: true, reason, fetchedAt: new Date().toISOString(), cached: false },
    }, { headers: { ...headers, "X-Data-Source": "mock" } });
  }
}
