/**
 * Real company/founder videos, keyed by startup id. Founders listed here get the video badge on their card
 * and the embedded player in the match modal; everyone else gets the "Request 90s Video Pitch" button.
 * Accepted: YouTube or Vimeo embed URLs, or direct .mp4 files. Only add relevant company demos, launch films, or founder/partner interviews with source attribution.
 */
export const FOUNDER_VIDEOS: Record<string, string> = {
  // Dynamic Creatures: "Living Character Robot Hugo", from the company's YouTube channel
  "02mokfp": "https://www.youtube.com/embed/NT7PEX4IlY8",
  // Guickly: "AI Measurement Layer for Enterprises", from the company's YouTube channel
  "akta-news-35074386": "https://www.youtube.com/embed/OFghRNcjMrM",
  // Cygrid: "Identity enforcement platform for AI-driven enterprises", from the company's YouTube channel
  "akta-news-42258514": "https://www.youtube.com/embed/DP3Pri-H2E8",
  // Found on the company's own site: https://tremont.ai/news/improving-drug-safety-with-ai/
  "akta-news-39194551": "https://www.youtube.com/embed/wNieCduKhNs",
  // Company's own channel: Foundational Data Governance AI Agents demo.
  "akta-news-39678740": "https://www.youtube.com/embed/byRLhdmgJjI",
  // Company's own channel: Polygrade at Warranty Innovations 2026.
  "akta-news-40214619": "https://www.youtube.com/embed/ATdwYc0Nr-s",
  // Beltic launch film, published by its producer Unveil Studio.
  "0000uxu": "https://www.youtube.com/embed/heTHupzv7tE",
  // Founder Jonathan Scholz interview served on Reimagine Robotics' own site.
  "akta-news-31222162": "https://reimaginerobotics.ai/__l5e/assets-v1/a9b9719d-a072-43c5-ae70-8bbd5a53b7cc/r2-interview-jonathan-scholz-v2.mp4",
  // CEO interview with Techstrong TV, featured on the official KeewanoDB channel.
  "02mqjeu": "https://www.youtube.com/embed/lIC84IRN9zo",
  // Partner product walkthrough: Kanu AI on Google Cloud.
  "akta-news-39310354": "https://www.youtube.com/embed/y1Oj6ZZKClU",
  // Fin.com launch interview, published by launch partner Atomik Growth.
  "akta-news-36061363": "https://www.youtube.com/embed/TgUvF_LeS3k",
};

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

/** Muted, control-free hover previews; no cross-origin player is mounted until hover. */
export function previewVideoUrl(url: string | undefined): VideoSource | null {
  const source = parseVideoUrl(url);
  if (!source || source.kind === "file") return source;
  const embed = new URL(source.src);
  embed.searchParams.set("autoplay", "1");
  embed.searchParams.set("controls", "0");
  embed.searchParams.set("playsinline", "1");
  embed.searchParams.set("loop", "1");
  if (embed.hostname.includes("youtube")) {
    embed.searchParams.set("mute", "1");
    embed.searchParams.set("playlist", embed.pathname.split("/").pop()!);
  } else {
    embed.searchParams.set("muted", "1");
    embed.searchParams.set("background", "1");
    embed.searchParams.set("dnt", "1");
  }
  return { kind: "iframe", src: embed.toString() };
}

/** Keep the rest of the ranked deck stable after a photo, video, video opening. */
export function arrangeVideoDemoDeck<T>(list: T[], video: (profile: T) => string | undefined): T[] {
  const photo = list.findIndex((profile) => !parseVideoUrl(video(profile)));
  if (photo < 0) return list;
  const clips = list.map((profile, index) => parseVideoUrl(video(profile)) ? index : -1).filter((index) => index >= 0).slice(0, 2);
  const selected = [photo, ...clips];
  return [...selected.map((index) => list[index]), ...list.filter((_, index) => !selected.includes(index))];
}

/** Shuffle gallery placement, never company/video identity. Stable for a given session seed. */
export function distributeGalleryVideos<T extends { id: string }>(list: T[], video: (profile: T) => string | undefined, seed: number): T[] {
  const key = (id: string): number => {
    let value = seed | 0;
    for (let index = 0; index < id.length; index++) value = Math.imul(value ^ id.charCodeAt(index), 16777619);
    return value >>> 0;
  };
  const ordered = [...list].sort((a, b) => key(a.id) - key(b.id) || a.id.localeCompare(b.id));
  const clips = ordered.filter((profile) => parseVideoUrl(video(profile)));
  const photos = ordered.filter((profile) => !parseVideoUrl(video(profile)));
  const result: T[] = [];
  const interval = Math.max(2, Math.floor(list.length / Math.max(1, clips.length)));
  while (clips.length || photos.length) {
    const next = clips.length && (result.length % interval === 1 || !photos.length) ? clips.shift() : photos.shift() ?? clips.shift();
    if (next) result.push(next);
  }
  return result;
}
