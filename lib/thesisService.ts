import "server-only";

/**
 * URL of a path on the thesis service (services/thesis). THESIS_RANKER_URL, or http://localhost:8000
 * as in lib/thesisRanker.ts, so ranking, feedback, undo and the thesis panel all talk to the same
 * service. Null when the configured URL is unsafe. Only the server reads it. The browser always goes through /api routes.
 */
export function thesisServiceUrl(path: string): URL | null {
  const configured = process.env.THESIS_RANKER_URL?.trim() || "http://localhost:8000";
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/$/, "") + path;
    return url;
  } catch {
    return null;
  }
}
