"use client";

import { useEffect, useState } from "react";
import FounderPhoto from "./FounderPhoto";
import { parseVideoUrl, previewVideoUrl } from "@/lib/founderVideos";
import { videoFor, type StealthStartup } from "@/lib/mockData";

/** Only an intentional hover mounts a player. Leaving the portrait stops playback. */
export default function HoverFounderMedia({ startup, focused = false }: { startup: StealthStartup; focused?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [preview, setPreview] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = videoFor(startup);
  const source = previewVideoUrl(url);
  const hasVideo = Boolean(parseVideoUrl(url));
  useEffect(() => {
    if ((!hovered && !focused) || !hasVideo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPreview(false);
      return;
    }
    const timer = setTimeout(() => setPreview(true), 180);
    return () => clearTimeout(timer);
  }, [hovered, focused, hasVideo]);
  return (
    <div className="relative h-full w-full" onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }} onPointerLeave={() => setHovered(false)}>
      <FounderPhoto startup={startup} className="h-full w-full object-cover object-top" />
      {preview && !failed && source && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
          {source.kind === "file" ? (
            <video src={source.src} autoPlay muted loop playsInline preload="none" tabIndex={-1} onError={() => setFailed(true)} className="h-full w-full object-contain" />
          ) : (
            <iframe src={source.src} title={`${startup.name} muted video preview`} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1} className="h-full w-full border-0" />
          )}
        </div>
      )}
    </div>
  );
}
