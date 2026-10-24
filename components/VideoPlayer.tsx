"use client";

import { parseVideoUrl } from "@/lib/founderVideos";

/** 16:9 player for a founder's pitch video. Renders nothing for unsupported URLs. */
export default function VideoPlayer({ url, title }: { url: string; title: string }) {
  const source = parseVideoUrl(url);
  if (!source) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      {source.kind === "iframe" ? (
        <iframe
          src={source.src}
          title={title}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video src={source.src} title={title} controls playsInline className="h-full w-full" />
      )}
    </div>
  );
}
