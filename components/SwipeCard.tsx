"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { BadgeCheck, Heart, Landmark, RotateCcw, Search, Star, X, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import FounderPhoto from "./FounderPhoto";
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
      className="absolute inset-0 flex cursor-grab select-none flex-col justify-between overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl active:cursor-grabbing"
    >
      {/* Image area */}
      <div className="relative h-[380px] w-full shrink-0 bg-gray-200">
        <FounderPhoto startup={startup} className="h-[380px] w-full object-cover object-top" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-x-3 top-2 flex gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-white/90" : "bg-white/40"}`} />
          ))}
        </div>

        <div className="absolute right-3 top-6 rounded-full bg-[#FF385C] px-3 py-1 text-xs font-bold text-white shadow-md">
          {startup.signalScore}% match
        </div>

        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute left-5 top-14 -rotate-12 rounded-lg border-4 border-emerald-400 px-2.5 py-0.5 font-display text-3xl font-extrabold text-emerald-400"
        >
          INVEST
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute right-5 top-14 rotate-12 rounded-lg border-4 border-rose-500 px-2.5 py-0.5 font-display text-3xl font-extrabold text-rose-500"
        >
          PASS
        </motion.span>
        <motion.span
          style={{ opacity: superOpacity }}
          className="absolute left-1/2 top-14 -translate-x-1/2 rounded-lg border-4 border-sky-400 px-2.5 py-0.5 font-display text-3xl font-extrabold text-sky-400"
        >
          SUPER
        </motion.span>

        <div className="absolute inset-x-4 bottom-3 text-white">
          <h2 className="flex items-center gap-2 text-[28px] font-bold leading-tight">
            {startup.founderName}, <span className="font-normal">{startup.stage}</span>
            <BadgeCheck className="h-6 w-6 fill-sky-500 text-white" aria-label="Verified" />
          </h2>
          <p className="text-sm font-medium text-white">
            Ex-{startup.exCompany} • {startup.name}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <p className="line-clamp-2 px-4 pt-3 text-xs font-medium leading-relaxed text-gray-700">{startup.pitchSummary}</p>
        <div className="mx-4 my-2 flex flex-wrap gap-1.5" aria-label="akta.pro signals">
          {startup.signals.map((s, i) => {
            const { icon: Icon, color } = SIGNAL_ICONS[i];
            return (
              <span
                key={s}
                className="flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-800"
              >
                <Icon className={`h-3 w-3 shrink-0 ${color}`} />
                <span className="truncate">{s}</span>
              </span>
            );
          })}
          {startup.liveNews && (
            <span className="flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{startup.liveNews.title}</span>
            </span>
          )}
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
    <div className="flex h-full w-full flex-col justify-between">
      <div className="relative h-[580px] w-full">
        {next && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-3 scale-[0.94] rounded-3xl border border-gray-200 bg-white opacity-70 shadow-md"
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

      <div className="flex items-center justify-center gap-4" role="group" aria-label="Swipe actions">
        <button
          onClick={onRewind}
          disabled={!canRewind || !!forced}
          aria-label="Rewind"
          title="Rewind"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-amber-500 shadow-md transition hover:scale-110 disabled:opacity-40 disabled:hover:scale-100"
        >
          <RotateCcw className="h-5 w-5" strokeWidth={3} />
        </button>
        <button
          onClick={() => setForced("left")}
          disabled={locked}
          aria-label="Pass"
          title="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-rose-500 shadow-lg transition hover:scale-110 disabled:opacity-40"
        >
          <X className="h-7 w-7" strokeWidth={3.5} />
        </button>
        <button
          onClick={() => setForced("up")}
          disabled={locked}
          aria-label="Super-Invest"
          title="Super-Invest"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-sky-400 shadow-md transition hover:scale-110 disabled:opacity-40"
        >
          <Star className="h-5 w-5 fill-sky-400" />
        </button>
        <button
          onClick={() => setForced("right")}
          disabled={locked}
          aria-label="Match"
          title="Match"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white text-2xl text-emerald-500 shadow-xl transition hover:scale-110 disabled:opacity-40"
        >
          <Heart className="h-7 w-7 fill-emerald-500" />
        </button>
      </div>
    </div>
  );
}
