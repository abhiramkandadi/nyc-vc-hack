import "server-only";

/**
 * URL of a path on the thesis service (services/thesis), or null when THESIS_RANKER_URL is
 * missing or unsafe. Only the server reads it. The browser always goes through /api routes.
 */
export function thesisServiceUrl(path: string): URL | null {
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
