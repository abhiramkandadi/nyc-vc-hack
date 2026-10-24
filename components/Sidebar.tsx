"use client";

import { Flame, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import FounderPhoto from "./FounderPhoto";
import type { StealthStartup } from "@/lib/mockData";

export interface MatchRecord {
  startup: StealthStartup;
  matchedAt: number;
  superInvest: boolean;
  /** True once the intro draft was opened in the user's mail app. */
  emailOpened: boolean;
  /** True until the match has been opened from the sidebar or the match screen. */
  unread: boolean;
}

interface Props {
  matches: MatchRecord[];
  thesis: string;
  selectedId: string | null;
  onSelectMatch: (m: MatchRecord) => void;
}

function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function preview(m: MatchRecord): string {
  if (m.emailOpened) return "Intro email opened in your mail app";
  const body = m.startup.draftEmail.split("\n").filter(Boolean)[1] ?? m.startup.draftEmail;
  return `Draft ready: ${body}`;
}

export default function Sidebar({ matches, thesis, selectedId, onSelectMatch }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const newCount = matches.filter((m) => m.unread).length;
  const ordered = [...matches].reverse();

  return (
    <aside className="hidden h-full w-[340px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#FF385C] to-rose-500 px-5 py-4 text-white">
        <div className="flex items-center gap-2 whitespace-nowrap font-display text-lg font-extrabold">
          <Flame className="h-6 w-6 fill-white" aria-hidden="true" />
          Company Tinder
        </div>
        <span className="max-w-[140px] truncate rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm" title="Active thesis">
          {thesis}
        </span>
      </div>

      <section className="px-5 pt-5" aria-label="New matches">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF385C]">New matches</h3>
          {newCount > 0 && (
            <span className="rounded-full bg-[#FF385C] px-2 py-0.5 text-[11px] font-bold text-white">{newCount}</span>
          )}
        </div>
        {matches.length === 0 ? (
          <p className="pb-2 text-xs text-gray-400">Swipe right on a startup to start a match.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto px-1 pb-3 pt-1">
            {ordered.map((m) => (
              <button
                key={m.startup.id}
                onClick={() => onSelectMatch(m)}
                className="flex shrink-0 flex-col items-center gap-1.5"
                aria-label={`Open ${m.startup.founderName}`}
              >
                <FounderPhoto
                  startup={m.startup}
                  className={`h-16 w-16 rounded-full object-cover object-top ring-2 ring-offset-2 ${
                    m.unread ? "ring-[#FF385C]" : "ring-gray-200"
                  }`}
                />
                <span className="max-w-16 truncate text-[11px] font-medium text-gray-700">
                  {m.startup.founderName.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-2 flex-1 pb-4" aria-label="Deal pipeline">
        <h3 className="px-5 pb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Messages / Deal pipeline</h3>
        {matches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-10 text-center text-gray-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">Your matches and drafted intros will show up here.</p>
          </div>
        ) : (
          <ul>
            {ordered.map((m) => (
              <li key={m.startup.id}>
                <button
                  onClick={() => onSelectMatch(m)}
                  className={`flex w-full cursor-pointer items-center gap-3 border-l-4 px-4 py-3 text-left transition-all hover:border-[#FF385C] hover:bg-rose-50/50 ${
                    selectedId === m.startup.id ? "border-[#FF385C] bg-rose-50/50" : "border-transparent"
                  }`}
                >
                  <FounderPhoto startup={m.startup} className="h-12 w-12 shrink-0 rounded-full object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {m.startup.founderName} • {m.startup.name}
                      </p>
                      <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(m.matchedAt, now)}</span>
                    </div>
                    <p className={`truncate text-xs ${m.unread ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                      {m.superInvest ? "⭐ " : ""}
                      {preview(m)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
