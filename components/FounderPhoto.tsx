"use client";

import { useState } from "react";
import { fallbackPortrait, type StealthStartup } from "@/lib/mockData";

interface Props {
  startup: Pick<StealthStartup, "id" | "founderName" | "founderImage" | "founderAvatar">;
  className?: string;
}

/** Single source for founder photos: portrait, then a verified fallback portrait, then the initials avatar. */
export default function FounderPhoto({ startup, className }: Props) {
  const [stage, setStage] = useState(0);
  const fallback = fallbackPortrait(startup.id || startup.founderName);
  const sources = [startup.founderImage || fallback, fallback, startup.founderAvatar];
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
