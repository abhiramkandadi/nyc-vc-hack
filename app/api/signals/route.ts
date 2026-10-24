import { NextResponse } from "next/server";
import { fetchStealthNews } from "@/lib/sponsorStack";
import { MOCK_STEALTH_STARTUPS, type StealthStartup } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/**
 * Hybrid hydration: when AKTA_API_KEY is set, attach each startup's latest akta.pro
 * news signal. Any failure (missing key, timeout, empty result) falls back to the seed deck.
 */
export async function GET() {
  if (!process.env.AKTA_API_KEY) {
    return NextResponse.json({ source: "sample", startups: MOCK_STEALTH_STARTUPS });
  }

  const results = await Promise.all(
    MOCK_STEALTH_STARTUPS.map(async (s): Promise<StealthStartup | null> => {
      try {
        const page = await fetchStealthNews({ query: `${s.name} ${s.founderName}`, limit: 1 }, { timeoutMs: 6_000 });
        const hit = page.data[0];
        return hit ? { ...s, liveNews: { title: hit.title, url: hit.url } } : null;
      } catch {
        return null;
      }
    }),
  );

  if (results.every((r) => r === null)) {
    return NextResponse.json({ source: "sample", startups: MOCK_STEALTH_STARTUPS });
  }
  return NextResponse.json({
    source: "live",
    startups: MOCK_STEALTH_STARTUPS.map((s, i) => results[i] ?? s),
  });
}
