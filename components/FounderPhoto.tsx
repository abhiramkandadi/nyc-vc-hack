"use client";

import { createContext, useContext, useState } from "react";
import { fallbackPortrait, type AssignedMedia, type StealthStartup } from "@/lib/mockData";

/** Per-startup portrait overrides so no two founders on screen share a face. */
export const PortraitContext = createContext<Record<string, AssignedMedia>>({});

interface Props {
  startup: Pick<StealthStartup, "id" | "founderName" | "founderImage" | "founderAvatar">;
  className?: string;
}

/** Single source for founder photos: assigned portrait, then a hashed fallback portrait, then the initials avatar. */
export default function FounderPhoto({ startup, className }: Props) {
  const assigned = useContext(PortraitContext)[startup.id]?.src;
  const [stage, setStage] = useState(0);
  const fallback = fallbackPortrait(startup.id || startup.founderName);
  const sources = [assigned || startup.founderImage || fallback, fallback, startup.founderAvatar];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[Math.min(stage, sources.length - 1)]}
      alt={`Portrait for ${startup.founderName}`}
      draggable={false}
      onError={() => setStage((n) => n + 1)}
      className={className}
    />
  );
}
