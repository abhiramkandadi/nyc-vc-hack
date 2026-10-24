/**
 * Real founder pitch videos, keyed by startup id. Founders listed here get the video badge on their card
 * and the embedded player in the match modal; everyone else gets the "Request 90s Video Pitch" button.
 * Accepted: YouTube or Vimeo embed URLs, or direct .mp4 files. Only add videos that are the founder's own.
 */
export const FOUNDER_VIDEOS: Record<string, string> = {};

export type VideoSource = { kind: "iframe" | "file"; src: string };

/** Returns a safe, playable source for a video URL, or null if the URL is not an allowed type. */
export function parseVideoUrl(url: string | undefined): VideoSource | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : u.searchParams.get("v");
    return id && /^[\w-]{6,20}$/.test(id) ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return /^[\w-]{6,20}$/.test(id) ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
  }
  if (host === "player.vimeo.com" || host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (u.pathname.toLowerCase().endsWith(".mp4")) return { kind: "file", src: u.toString() };
  return null;
}
