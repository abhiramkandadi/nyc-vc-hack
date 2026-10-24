"use client";

import { Heart } from "lucide-react";

export type Preset = "Plug & Play" | "Everywhere VC" | "AI Agents";
export const PRESETS: Preset[] = ["Plug & Play", "Everywhere VC", "AI Agents"];

interface Props {
  preset: Preset;
  onPreset: (p: Preset) => void;
  matchCount: number;
}

export default function Header({ preset, onPreset, matchCount }: Props) {
  return (
    <header className="relative z-20 flex w-full flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-2 font-display text-xl font-extrabold text-[#FF385C]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="" className="h-9 w-9 rounded-xl shadow-sm" />
        <span>CompanyTinder</span>
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
