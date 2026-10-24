"use client";

import { Flame, Heart } from "lucide-react";

export type Preset = "Plug & Play" | "Everywhere VC" | "AI Agents";
export const PRESETS: Preset[] = ["Plug & Play", "Everywhere VC", "AI Agents"];

interface Props {
  preset: Preset;
  onPreset: (p: Preset) => void;
  matchCount: number;
}

export default function Header({ preset, onPreset, matchCount }: Props) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/70 px-5 py-3 backdrop-blur-2xl">
      <div className="flex items-center gap-2">
        <Flame
          className="h-7 w-7 fill-[#FF385C] text-[#FF385C] drop-shadow-[0_0_12px_rgba(255,56,92,0.8)]"
          aria-hidden="true"
        />
        <span className="font-display text-xl font-bold tracking-tight text-white">Company Tinder</span>
      </div>

      <nav aria-label="VC presets" className="flex gap-1 rounded-full border border-white/10 bg-zinc-900/80 p-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onPreset(p)}
            aria-pressed={preset === p}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              preset === p
                ? "bg-[#FF385C] text-white shadow-[0_0_15px_rgba(255,56,92,0.4)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </nav>

      <div
        className="flex items-center gap-1.5 rounded-full border border-[#FF385C]/40 bg-[#FF385C]/10 px-3 py-1.5 font-mono text-xs font-bold text-[#FF385C] shadow-[0_0_15px_rgba(255,56,92,0.2)]"
        aria-label={`${matchCount} matches`}
      >
        <Heart className="h-3.5 w-3.5 fill-[#FF385C]" />
        {matchCount}
      </div>
    </header>
  );
}
