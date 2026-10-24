"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { BadgeCheck, Heart, Landmark, RotateCcw, Search, Star, X, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { StealthStartup } from "@/lib/mockData";

export type SwipeDirection = "left" | "right" | "up";

const X_THRESHOLD = 120;
const Y_THRESHOLD = 140;

const SIGNAL_ICONS: { icon: LucideIcon; color: string }[] = [
  { icon: Zap, color: "text-amber-400" },
  { icon: Landmark, color: "text-sky-400" },
  { icon: Search, color: "text-fuchsia-400" },
];

interface TopCardProps {
  startup: StealthStartup;
  forced: SwipeDirection | null;
  onSwipe: (d: SwipeDirection) => void;
}

function TopCard({ startup, forced, onSwipe }: TopCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [30, X_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-X_THRESHOLD, -30], [1, 0]);
  const superOpacity = useTransform(y, [-Y_THRESHOLD, -40], [1, 0]);

  const fling = (d: SwipeDirection) => {
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
      className="absolute inset-0 cursor-grab select-none overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl active:cursor-grabbing"
    >
      <div className="absolute inset-x-0 top-0 h-[75%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={startup.founderImage}
          alt={`Portrait for ${startup.founderName}`}
          draggable={false}
          className="h-full w-full object-cover object-top"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Badges */}
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {startup.targetSector}
      </div>
      <div className="absolute right-4 top-4 rounded-full bg-[#FF385C]/80 px-3 py-1 font-mono text-xs font-bold text-white shadow-lg backdrop-blur-md">
        {startup.signalScore}% match
      </div>

      {/* Swipe stamps */}
      <motion.span
        style={{ opacity: likeOpacity }}
        className="absolute left-5 top-16 -rotate-12 rounded-lg border-[3px] border-emerald-400 px-2.5 py-0.5 font-display text-2xl font-extrabold text-emerald-400"
      >
        INVEST
      </motion.span>
      <motion.span
        style={{ opacity: nopeOpacity }}
        className="absolute right-5 top-16 rotate-12 rounded-lg border-[3px] border-red-500 px-2.5 py-0.5 font-display text-2xl font-extrabold text-red-500"
      >
        PASS
      </motion.span>
      <motion.span
        style={{ opacity: superOpacity }}
        className="absolute left-1/2 top-16 -translate-x-1/2 rounded-lg border-[3px] border-sky-400 px-2.5 py-0.5 font-display text-2xl font-extrabold text-sky-400"
      >
        SUPER
      </motion.span>

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
          {startup.founderName},{" "}
          <span className="text-xl font-normal text-zinc-300">{startup.stage}</span>
          <BadgeCheck className="h-5 w-5 fill-sky-500 text-black" aria-label="Verified" />
        </h2>
        <p className="text-sm font-medium text-zinc-300">
          {startup.exCompany} • <span className="font-semibold text-white">{startup.name}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{startup.pitchSummary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="akta.pro signals">
          {startup.signals.map((s, i) => {
            const { icon: Icon, color } = SIGNAL_ICONS[i];
            return (
              <span
                key={s}
                className="flex max-w-full items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white backdrop-blur-md"
              >
                <Icon className={`h-3 w-3 shrink-0 ${color}`} />
                <span className="truncate">{s}</span>
              </span>
            );
          })}
        </div>
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

  return (
    <div className="flex w-full max-w-[390px] flex-col items-center gap-6">
      <div className="relative h-[600px] w-full">
        {next && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-3 scale-[0.94] rounded-[28px] border border-white/10 bg-zinc-950 opacity-70"
          />
        )}
        {top && (
          <TopCard
            key={top.id}
            startup={top}
            forced={forced}
            onSwipe={(d) => {
              setForced(null);
              onSwipe(d, top);
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-4" role="group" aria-label="Swipe actions">
        <button
          onClick={onRewind}
          disabled={!canRewind || !!forced}
          aria-label="Rewind"
          title="Rewind"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 transition hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"
        >
          <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => setForced("left")}
          disabled={locked}
          aria-label="Pass"
          title="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/10 text-red-500 shadow-lg shadow-red-500/20 transition hover:scale-110 disabled:opacity-40"
        >
          <X className="h-7 w-7" strokeWidth={3} />
        </button>
        <button
          onClick={() => setForced("up")}
          disabled={locked}
          aria-label="Super-Invest"
          title="Super-Invest"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-400 bg-sky-400/10 text-sky-400 transition hover:scale-110 disabled:opacity-40"
        >
          <Star className="h-5 w-5 fill-sky-400" />
        </button>
        <button
          onClick={() => setForced("right")}
          disabled={locked}
          aria-label="Match"
          title="Match"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#FF385C] to-rose-600 text-white shadow-xl shadow-[#FF385C]/40 transition hover:scale-110 disabled:opacity-40"
        >
          <Heart className="h-7 w-7 fill-white" />
        </button>
      </div>
    </div>
  );
}
