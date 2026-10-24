"use client";

import { Handshake, Heart } from "lucide-react";

export type Preset = "Plug & Play" | "Everywhere VC" | "AI Agents";
export const PRESETS: Preset[] = ["Plug & Play", "Everywhere VC", "AI Agents"];

interface Props {
  preset: Preset;
  onPreset: (p: Preset) => void;
  matchCount: number;
}

export default function Header({ preset, onPreset, matchCount }: Props) {
  return (
    <header className="glass sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral shadow-coral">
          <Handshake className="h-5 w-5 text-white" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">Company Tinder</span>
      </div>

      <nav aria-label="VC presets" className="flex gap-1 rounded-full border border-surface-border bg-surface p-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onPreset(p)}
            aria-pressed={preset === p}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              preset === p ? "bg-coral text-white shadow-coral" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </nav>

      <div
        className="flex items-center gap-1.5 rounded-full border border-coral/30 bg-coral-soft px-3 py-1 font-mono text-xs text-coral"
        aria-label={`${matchCount} matches`}
      >
        <Heart className="h-3.5 w-3.5 fill-coral" />
        {matchCount}
      </div>
    </header>
  );
}
