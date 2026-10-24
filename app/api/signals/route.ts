import { NextResponse } from "next/server";
import { applyLearnedRanking } from "@/lib/thesisRanker";
import { randomUUID } from "node:crypto";
import { exportPrismTrace } from "@/lib/sponsorStack";
import { AktaHydrationError, getStartupProfiles, getMockStartupProfiles, reportAktaTelemetry } from "@/lib/akta";
import { filterByThesis, normalizeThesis, THESIS_NAMES, THESIS_RULE_VERSION, type ThesisName } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Live discovery and hydration, with explicit demo fallback. `startups`/`source`
 * remain compatible with the existing UI; new clients consume `success`/`data`.
 */
export async function GET(request: Request) {
  const startedAt = performance.now();
  const headers = { "Cache-Control": "no-store" };
  let thesis: ThesisName | undefined;
  let learned = false;
  try {
    const query = new URL(request.url).searchParams;
    learned = query.get("ranking") === "learned";
    const values = query.getAll("thesis");
    if (values.length > 1) throw new Error("Ambiguous thesis");
    if (values[0]?.trim()) thesis = normalizeThesis(values[0]);
  } catch {
    reportAktaTelemetry("invalid_thesis_request", { count: 0, code: "UNSUPPORTED_THESIS" });
    return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_THESIS", supported: THESIS_NAMES } }, { status: 400, headers });
  }
  try {
    const result = await getStartupProfiles();
    const demo = result.source === "mock";
    const baseline = thesis ? filterByThesis(result.data, thesis) : result.data;
    const ranking = learned ? await applyLearnedRanking(baseline) : undefined;
    const data = ranking?.data ?? baseline;
    reportAktaTelemetry("dataset_dispatch", {
      source: result.source, count: data.length, code: ranking ? `RANKING_${ranking.source.toUpperCase()}` : undefined,
      latencyMs: Math.round(performance.now() - startedAt),
    });
    return NextResponse.json({
      success: true, data, source: demo ? "sample" : "live", startups: data,
      meta: { dataSource: demo ? "mock" : "akta.pro", retrieval: result.source, count: data.length, totalCount: result.data.length,
        ranking: ranking ? { source: ranking.source, reason: ranking.reason, actionCount: ranking.actionCount } : { source: "baseline" },
        thesis: thesis ?? null, ruleVersion: thesis ? THESIS_RULE_VERSION : null, demo, reason: result.reason,
        refreshing: result.refreshing ?? false, fetchedAt: result.fetchedAt, cached: result.cached },
    }, { headers: { ...headers, "X-Data-Source": demo ? "mock" : "akta.pro", "X-Data-Retrieval": result.source, "X-Startup-Count": String(data.length) } });
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
    const fallback = getMockStartupProfiles();
    const data = thesis ? filterByThesis(fallback, thesis) : fallback;
    return NextResponse.json({
      success: true, data, source: "sample", startups: data,
      meta: { dataSource: "mock", count: data.length, totalCount: fallback.length, thesis: thesis ?? null,
        ruleVersion: thesis ? THESIS_RULE_VERSION : null, demo: true, reason, fetchedAt: new Date().toISOString(), cached: false },
    }, { headers: { ...headers, "X-Data-Source": "mock", "X-Startup-Count": String(data.length) } });
  }
}
