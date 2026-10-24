"use client";

import { Flame, Heart } from "lucide-react";

export type Preset = "Plug & Play" | "Everywhere VC" | "AI Agents";
export const PRESETS: Preset[] = ["Plug & Play", "Everywhere VC", "AI Agents"];

interface Props {
  preset: Preset;
  onPreset: (p: Preset) => void;
  matchCount: number;
}

function Tie({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M9 2h6l-1.2 3h-3.6L9 2Z" fill="#DC2626" />
      <path d="M10.2 5h3.6l2.2 14-4 3-4-3 2.2-14Z" fill="#EF4444" />
      <path d="M10.2 5h1.2l-1.6 15.4L8 19l2.2-14Z" fill="#B91C1C" opacity=".5" />
    </svg>
  );
}

export default function Header({ preset, onPreset, matchCount }: Props) {
  return (
    <header className="relative z-20 flex w-full flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-2 font-display text-xl font-extrabold text-[#FF385C]">
        <span className="relative flex items-center">
          <Flame className="h-7 w-7 fill-[#FF385C] text-[#FF385C]" aria-hidden="true" />
          <Tie className="absolute -right-2 top-2.5 h-5 w-5" />
        </span>
        <span className="ml-1">Company Tinder</span>
      </div>

      <nav aria-label="VC presets" className="flex gap-1 rounded-full border border-gray-200 bg-gray-100 p-1 text-xs font-semibold">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onPreset(p)}
            aria-pressed={preset === p}
            className={`rounded-full px-3 py-1.5 transition ${
              preset === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {p}
          </button>
        ))}
      </nav>

      <div
        className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-[#FF385C]"
        aria-label={`${matchCount} matches`}
      >
        <Heart className="h-3.5 w-3.5 fill-[#FF385C]" />
        {matchCount}
      </div>
    </header>
  );
}
