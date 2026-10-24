"use client";

import { createContext, useContext, useState } from "react";
import { PHOTO_CREDITS } from "@/lib/founderPhotos";
import { fallbackPortrait, initialsPortrait, portraitFor, type AssignedMedia, type StealthStartup } from "@/lib/mockData";

/** Per-startup portrait overrides so no two founders on screen share a face. */
export const PortraitContext = createContext<Record<string, AssignedMedia>>({});

interface Props {
  startup: Pick<StealthStartup, "id" | "founderName" | "founderImage" | "founderAvatar"> & Partial<Pick<StealthStartup, "imageIsPlaceholder">>;
  className?: string;
}

/** Prefer sourced portraits; otherwise use curated illustrative demo photography. */
export default function FounderPhoto({ startup, className }: Props) {
  const assigned = useContext(PortraitContext)[startup.id]?.src;
  const [stage, setStage] = useState(0);
  const fallback = initialsPortrait(startup);
  const sources = [assigned || portraitFor(startup), fallbackPortrait(startup.id), fallback];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[Math.min(stage, sources.length - 1)]}
      alt={PHOTO_CREDITS[startup.id] && stage === 0 ? `Portrait of ${startup.founderName}` : `Illustrative demo portrait for ${startup.founderName}`}
      title={stage === 0 ? PHOTO_CREDITS[startup.id] || "Illustrative demo portrait" : "Illustrative demo portrait"}
      draggable={false}
      onError={() => setStage((value) => Math.min(value + 1, sources.length - 1))}
      className={className}
    />
  );
}
