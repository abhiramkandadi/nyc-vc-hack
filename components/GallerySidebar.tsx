"use client";

import { Heart } from "lucide-react";
import FounderPhoto from "./FounderPhoto";
import type { StealthStartup } from "@/lib/mockData";

interface Props {
  startups: StealthStartup[];
  currentId: string | null;
  matchedIds: Set<string>;
  live: boolean;
  onSelect: (s: StealthStartup) => void;
}

const ASPECTS = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[4/5]", "aspect-[3/4]"];

export default function GallerySidebar({ startups, currentId, matchedIds, live, onSelect }: Props) {
  return (
    <aside className="hidden h-full w-[360px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-gray-200 bg-white p-4 xl:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Explore founders</h2>
        <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#FF385C]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF385C] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF385C]" />
          </span>
          {live ? "Live · " : ""}
          {startups.length} founders
        </span>
      </div>

      <div className="columns-2 gap-3">
        {startups.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            aria-label={`View ${s.founderName}, ${s.name}`}
            className={`group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border bg-gray-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${ASPECTS[i % ASPECTS.length]} ${
              currentId === s.id ? "border-[#FF385C] ring-2 ring-[#FF385C]" : "border-gray-200"
            }`}
          >
            <FounderPhoto startup={s} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            {matchedIds.has(s.id) && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow">
                <Heart className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
              </span>
            )}
            <div className="absolute inset-x-2.5 bottom-2 text-white">
              <p className="truncate text-sm font-bold leading-tight">{s.founderName}</p>
              <p className="truncate text-[11px] text-white/80">{s.name}</p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
