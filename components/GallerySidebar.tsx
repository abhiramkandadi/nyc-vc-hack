"use client";

import { Heart } from "lucide-react";
import FounderPhoto from "./FounderPhoto";
import { recentActivity, type StealthStartup } from "@/lib/mockData";

interface Props {
  startups: StealthStartup[];
  currentId: string | null;
  matchedIds: Set<string>;
  live: boolean;
  onSelect: (s: StealthStartup) => void;
}

export default function GallerySidebar({ startups, currentId, matchedIds, live, onSelect }: Props) {
  return (
    <aside className="hidden h-full w-[26vw] min-w-[360px] max-w-[440px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200/80 bg-white p-5 shadow-sm xl:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">Explore founders</h2>
        <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-[#FF385C]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF385C] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF385C]" />
          </span>
          {live ? "Live · " : ""}
          {startups.length} founders
        </span>
      </div>

      <div className="grid flex-1 auto-rows-[minmax(12rem,1fr)] grid-cols-2 gap-4">
        {startups.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            aria-label={`View ${s.founderName}, ${s.name}`}
            className={`group relative block h-full min-h-48 w-full overflow-hidden rounded-2xl border bg-gray-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
              currentId === s.id ? "border-[#FF385C] ring-2 ring-[#FF385C]" : "border-gray-200"
            }`}
          >
            <FounderPhoto startup={s} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            {recentActivity(s)?.recent && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {recentActivity(s)?.label}
              </span>
            )}
            {matchedIds.has(s.id) && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow">
                <Heart className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
              </span>
            )}
            <div className="absolute inset-x-2.5 bottom-2 text-white">
              <p className="truncate text-base font-bold leading-tight">{s.founderName}</p>
              <p className="truncate text-xs text-white/80">{s.name}</p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
