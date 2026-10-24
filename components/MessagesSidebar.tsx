"use client";

import { Check, Inbox, Pencil } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import FounderPhoto from "./FounderPhoto";
import { recentActivity } from "@/lib/mockData";
import { SAMPLE_THREADS, type SampleThread } from "@/lib/sampleThreads";
import { founderLabel, type StealthStartup } from "@/lib/mockData";

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
  /** Shown between the profile and the pipeline, for example the thesis panel. */
  panel?: ReactNode;
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

function SampleAvatar({ thread }: { thread: SampleThread }) {
  const [failed, setFailed] = useState(false);
  const initials = thread.name.split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (thread.domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?domain=${thread.domain}&sz=128`}
        alt={`${thread.org} logo`}
        onError={() => setFailed(true)}
        className="h-12 w-12 shrink-0 rounded-full border border-gray-200 bg-white object-contain p-2"
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-bold text-gray-600">
      {initials}
    </span>
  );
}

export default function MessagesSidebar({ matches, thesis, selectedId, onSelectMatch, panel }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [avatarOk, setAvatarOk] = useState(true);
  const [name, setName] = useState("Somya Gupta");
  const [title, setTitle] = useState("Founder @ localhost:nyc");
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ordered = [...matches].reverse();
  const unread = matches.filter((m) => m.unread).length;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="hidden h-full w-[24vw] min-w-[340px] max-w-[400px] shrink-0 flex-col overflow-y-auto border-l border-gray-200/80 bg-white p-5 shadow-sm xl:flex">
      <section className="border-b border-gray-200 pb-5" aria-label="Your profile">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Your profile</h3>
        <div className="flex items-center gap-4">
          <div className="relative inline-block shrink-0" title="Active in NYC • Sourcing Physical AI">
            {avatarOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/profile.jpg"
                alt={name}
                onError={() => setAvatarOk(false)}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-[3px] ring-[#FF385C] ring-offset-2"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF385C] to-amber-400 text-2xl font-bold text-white ring-[3px] ring-[#FF385C] ring-offset-2">
                {initials}
              </span>
            )}
            <span className="absolute bottom-0 right-0 z-10 h-4 w-4 animate-pulse rounded-full border-2 border-white bg-emerald-500 shadow-md" aria-label="Active in NYC, sourcing Physical AI" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-col gap-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Name"
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm font-bold outline-none focus:border-[#FF385C]"
                />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Title"
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#FF385C]"
                />
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-extrabold leading-tight text-gray-900">{name}</p>
                <span className="mt-1.5 inline-block max-w-full rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-[#FF385C]">
                  {title}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            aria-label={editing ? "Save profile" : "Edit profile"}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Fund metrics">
          {["🏙️ 75+ NYC founder events", "🔍 Venture Scout @ EWOR", "💻 Full Stack @ Wand AI"].map((m) => (
            <span key={m} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              {m}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs italic text-gray-500">Making NYC the biggest startup ecosystem in the world.</p>
        <p className="mt-1 text-xs text-gray-400">{thesis}</p>
      </section>

      {panel}

      <section className="-mx-3 flex-1 pb-4" aria-label="Deal pipeline">
        <div className="flex items-center justify-between pb-2 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Messages / Deal pipeline</h3>
          {unread > 0 && <span className="rounded-full bg-[#FF385C] px-2 py-0.5 text-[11px] font-bold text-white">{unread}</span>}
        </div>
        {matches.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-8 py-6 text-center text-gray-400">
            <Inbox className="h-7 w-7" />
            <p className="text-sm">Swipe right on a founder. Matches and drafted intros show up here.</p>
          </div>
        )}
        {matches.length > 0 && (
          <ul>
            {ordered.map((m) => (
              <li key={m.startup.id}>
                <button
                  onClick={() => onSelectMatch(m)}
                  className={`flex w-full cursor-pointer items-center gap-3 border-l-4 px-3 py-3.5 text-left transition-all hover:border-[#FF385C] hover:bg-rose-50/50 ${
                    selectedId === m.startup.id ? "border-[#FF385C] bg-rose-50/50" : "border-transparent"
                  }`}
                >
                  <FounderPhoto startup={m.startup} className="h-12 w-12 shrink-0 rounded-full object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-base font-bold text-gray-900">
                        {founderLabel(m.startup)} • {m.startup.name}
                      </p>
                      {recentActivity(m.startup)?.recent && (
                        <span className="h-3 w-3 shrink-0 animate-pulse rounded-full border border-white bg-emerald-500" title={`In the news ${recentActivity(m.startup)?.label}`} />
                      )}
                      <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(m.matchedAt, now)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${m.unread ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                        {m.superInvest ? "⭐ " : ""}
                        {preview(m)}
                      </p>
                      {m.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#FF385C]" aria-label="Unread" />}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <ul aria-label="More conversations">
          {SAMPLE_THREADS.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-l-4 border-transparent px-3 py-3">
              <SampleAvatar thread={t} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-base font-bold text-gray-900">
                    {t.name} • {t.org}
                  </p>
                  <span className="shrink-0 text-[11px] text-gray-400">{t.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${t.unread ? "font-semibold text-gray-800" : "text-gray-500"}`}>{t.preview}</p>
                  {t.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#FF385C]" aria-label="Unread" />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
