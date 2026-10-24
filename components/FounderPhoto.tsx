"use client";

import { useState } from "react";
import type { StealthStartup } from "@/lib/mockData";

interface Props {
  startup: Pick<StealthStartup, "founderName" | "founderImage" | "founderAvatar">;
  className?: string;
}

/** Single source for founder photos: portrait first, initials avatar if the portrait fails to load. */
export default function FounderPhoto({ startup, className }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? startup.founderAvatar : startup.founderImage}
      alt={`Portrait for ${startup.founderName}`}
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
