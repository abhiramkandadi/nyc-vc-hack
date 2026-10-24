"use client";

import { animate, motion, useAnimationControls, useMotionValue, useTransform } from "framer-motion";
import { BadgeCheck, Heart, Landmark, RotateCcw, Star, TrendingUp, Users, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import FounderPhoto from "./FounderPhoto";
import type { StealthStartup } from "@/lib/mockData";

export type SwipeDirection = "left" | "right" | "up";

const X_THRESHOLD = 120;
const Y_THRESHOLD = 140;

type SignalKind = "velocity" | "team" | "legal";

const SIGNAL_STYLE: Record<SignalKind, { icon: LucideIcon; pill: string }> = {
  velocity: { icon: TrendingUp, pill: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  team: { icon: Users, pill: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  legal: { icon: Landmark, pill: "border-amber-200 bg-amber-50 text-amber-700" },
};

const KIND_ORDER: SignalKind[] = ["velocity", "team", "legal"];

/** Classify a signal by its wording; unmatched signals fall back to their position. */
function signalKind(text: string, index: number): SignalKind {
  if (/commit|velocity|github|repo|launch|exited|shipp/i.test(text)) return "velocity";
  if (/hire|joined|co-?founder|founder:|ex-|team|role|partner/i.test(text)) return "team";
  if (/c-corp|filing|filed|incorporat|raised|angel|round|seed|funding|entity/i.test(text)) return "legal";
  return KIND_ORDER[index % 3];
}

interface TopCardProps {
  startup: StealthStartup;
  forced: SwipeDirection | null;
  onSwipe: (d: SwipeDirection) => void;
  onImpact: () => void;
}

function TopCard({ startup, forced, onSwipe, onImpact }: TopCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [20, X_THRESHOLD], [0, 1]);
  const likeScale = useTransform(x, [20, X_THRESHOLD], [0.5, 1.3]);
  const nopeOpacity = useTransform(x, [-X_THRESHOLD, -20], [1, 0]);
  const nopeScale = useTransform(x, [-X_THRESHOLD, -20], [1.3, 0.5]);
  const superOpacity = useTransform(y, [-Y_THRESHOLD, -20], [1, 0]);
  const superScale = useTransform(y, [-Y_THRESHOLD, -20], [1.3, 0.5]);

  const fling = (d: SwipeDirection) => {
    onImpact();
    const mv = d === "up" ? y : x;
    animate(mv, d === "left" ? -700 : d === "up" ? -800 : 700, { duration: 0.3 }).then(() => onSwipe(d));
  };

  useEffect(() => {
    if (forced) fling(forced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forced]);

  return (
    <motion.div
      drag={!forced}
      dragSnapToOrigin
      dragElastic={0.9}
      style={{ x, y, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -Y_THRESHOLD) fling("up");
        else if (info.offset.x > X_THRESHOLD) fling("right");
        else if (info.offset.x < -X_THRESHOLD) fling("left");
      }}
      className="absolute inset-0 flex cursor-grab select-none flex-col justify-between overflow-hidden rounded-[36px] border border-gray-200/80 bg-white shadow-2xl active:cursor-grabbing"
    >
      {/* Image area */}
      <div className="relative h-[62%] w-full shrink-0 bg-gray-200">
        <FounderPhoto startup={startup} className="h-full w-full object-cover object-top" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-x-3 top-2 flex gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-white/90" : "bg-white/40"}`} />
          ))}
        </div>

        <div className="absolute right-3 top-6 rounded-full bg-[#FF385C] px-3 py-1 text-xs font-bold text-white shadow-md">
          {startup.signalScore}% match
        </div>

        <div className="absolute inset-x-4 bottom-3 text-white">
          <h2 className="flex items-center gap-2 text-3xl font-black leading-tight">
            {startup.founderName}, <span className="font-normal">{startup.stage}</span>
            <BadgeCheck className="h-8 w-8 fill-sky-500 text-white" aria-label="Verified" />
          </h2>
          <p className="text-base font-medium text-white">
            Ex-{startup.exCompany} • {startup.name}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <h3 className="px-6 pt-4 text-xl font-bold text-gray-900">{startup.name}</h3>
        <p className="line-clamp-2 px-6 pt-1 text-sm font-medium leading-relaxed text-gray-700">{startup.pitchSummary}</p>
        <div className="mx-6 my-3 flex flex-wrap gap-2" aria-label="akta.pro signals">
          {startup.signals.map((s, i) => {
            const { icon: Icon, pill } = SIGNAL_STYLE[signalKind(s, i)];
            return (
              <span
                key={s}
                className={`flex max-w-full items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${pill}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s}</span>
              </span>
            );
          })}
          {startup.liveNews && (
            <span className="flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{startup.liveNews.title}</span>
            </span>
          )}
        </div>
      </div>

      {/* Stamps sit on the card root so they cover the whole card, not just the photo. */}
      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          style={{ opacity: likeOpacity, scale: likeScale, rotate: 22 }}
          className="absolute flex select-none flex-col items-center rounded-3xl border-[12px] border-double border-emerald-500 bg-emerald-950/40 px-10 py-6 text-center text-6xl font-black uppercase leading-none tracking-widest text-emerald-400 drop-shadow-[0_20px_50px_rgba(16,185,129,0.7)] backdrop-blur-md md:text-7xl"
        >
          <span>Term</span>
          <span>Sheet 💖</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity, scale: nopeScale, rotate: -22 }}
          className="absolute flex select-none flex-col items-center rounded-3xl border-[12px] border-dashed border-red-600 bg-red-950/40 px-10 py-6 text-center text-6xl font-black uppercase leading-none tracking-widest text-red-600 drop-shadow-[0_20px_50px_rgba(220,38,38,0.7)] backdrop-blur-md md:text-7xl"
        >
          <span>No</span>
          <span>Deal ❌</span>
        </motion.div>
        <motion.div
          style={{ opacity: superOpacity, scale: superScale, rotate: -8 }}
          className="absolute flex select-none flex-col items-center rounded-3xl border-[12px] border-sky-400 bg-sky-950/40 px-10 py-6 text-center text-6xl font-black uppercase leading-none tracking-widest text-sky-300 drop-shadow-[0_20px_50px_rgba(56,189,248,0.7)] backdrop-blur-md md:text-7xl"
        >
          <span>Super</span>
          <span>Invest ⚡</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

interface Props {
  startups: StealthStartup[];
  onSwipe: (d: SwipeDirection, s: StealthStartup) => void;
  onRewind: () => void;
  canRewind: boolean;
}

export default function SwipeCard({ startups, onSwipe, onRewind, canRewind }: Props) {
  const [forced, setForced] = useState<SwipeDirection | null>(null);
  const top = startups[0];
  const next = startups[1];
  const locked = !top || !!forced;
  const shake = useAnimationControls();
  const impact = () => {
    shake.start({ x: [0, -10, 10, -5, 5, 0], transition: { duration: 0.15, ease: "easeOut" } });
  };

  return (
    <div className="flex h-full max-h-[1200px] w-full flex-col gap-5">
      <motion.div animate={shake} className="relative min-h-0 w-full max-w-[580px] flex-1 self-center">
        {next && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-3 scale-[0.94] rounded-[36px] border border-gray-200 bg-white opacity-70 shadow-md"
          />
        )}
        {top && (
          <TopCard
            key={top.id}
            startup={top}
            forced={forced}
            onImpact={impact}
            onSwipe={(d) => {
              setForced(null);
              onSwipe(d, top);
            }}
          />
        )}
      </motion.div>

      <div className="flex shrink-0 items-center justify-center gap-5 pb-1" role="group" aria-label="Swipe actions">
        <button
          onClick={onRewind}
          disabled={!canRewind || !!forced}
          aria-label="Rewind"
          title="Rewind"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-amber-500 shadow-md transition hover:scale-110 disabled:opacity-40 disabled:hover:scale-100"
        >
          <RotateCcw className="h-5 w-5" strokeWidth={3} />
        </button>
        <button
          onClick={() => setForced("left")}
          disabled={locked}
          aria-label="Pass"
          title="Pass"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-rose-500 shadow-[0_8px_24px_rgba(244,63,94,0.3)] transition hover:scale-110 disabled:opacity-40"
        >
          <X className="h-8 w-8" strokeWidth={3.5} />
        </button>
        <button
          onClick={() => setForced("up")}
          disabled={locked}
          aria-label="Super-Invest"
          title="Super-Invest"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-sky-400 shadow-md transition hover:scale-110 disabled:opacity-40"
        >
          <Star className="h-5 w-5 fill-sky-400" />
        </button>
        <button
          onClick={() => setForced("right")}
          disabled={locked}
          aria-label="Match"
          title="Match"
          className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white text-2xl text-emerald-500 shadow-[0_10px_32px_rgba(16,185,129,0.45)] transition hover:scale-110 disabled:opacity-40"
        >
          <Heart className="h-9 w-9 fill-emerald-500" />
        </button>
      </div>
    </div>
  );
}
