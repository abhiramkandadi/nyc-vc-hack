"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, Landmark, Search, X, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { StealthStartup, TargetSector } from "@/lib/mockData";

export type SwipeDirection = "left" | "right" | "up";

const X_THRESHOLD = 120;
const Y_THRESHOLD = 140;

const SECTOR_HERO: Record<TargetSector, string> = {
  "AI Infra": "from-indigo-950 via-zinc-900 to-fuchsia-950",
  "B2B SaaS": "from-cyan-950 via-zinc-900 to-emerald-950",
  "Physical AI": "from-rose-950 via-zinc-900 to-amber-950",
};

const SIGNAL_STYLE: { icon: LucideIcon; dot: string; color: string }[] = [
  { icon: Zap, dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]", color: "text-amber-400" },
  { icon: Landmark, dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]", color: "text-sky-400" },
  { icon: Search, dot: "bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.9)]", color: "text-fuchsia-400" },
];

function TopCard({ startup, onSwipe }: { startup: StealthStartup; onSwipe: (d: SwipeDirection) => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [busy, setBusy] = useState(false);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const matchOpacity = useTransform(x, [30, X_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-X_THRESHOLD, -30], [1, 0]);
  const superOpacity = useTransform(y, [-Y_THRESHOLD, -40], [1, 0]);

  const fling = (d: SwipeDirection) => {
    if (busy) return;
    setBusy(true);
    const mv = d === "up" ? y : x;
    animate(mv, d === "left" ? -700 : d === "up" ? -800 : 700, { duration: 0.3 }).then(() => onSwipe(d));
  };

  return (
    <motion.div
      drag={!busy}
      dragSnapToOrigin
      dragElastic={0.9}
      style={{ x, y, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -Y_THRESHOLD) fling("up");
        else if (info.offset.x > X_THRESHOLD) fling("right");
        else if (info.offset.x < -X_THRESHOLD) fling("left");
      }}
      className="absolute inset-0 flex cursor-grab select-none flex-col justify-between overflow-hidden rounded-[32px] border border-white/15 bg-zinc-950/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl active:cursor-grabbing"
    >
      {/* Hero */}
      <div className={`relative h-[300px] w-full shrink-0 bg-gradient-to-tr ${SECTOR_HERO[startup.targetSector]}`}>
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, 30, -10, 0], y: [0, -20, 15, 0], scale: [1, 1.15, 0.95, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-10 top-4 h-56 w-56 rounded-full bg-[#FF385C]/25 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, -25, 15, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={startup.founderAvatar}
          alt={startup.founderName}
          draggable={false}
          className="absolute left-1/2 top-[88px] h-32 w-32 -translate-x-1/2 rounded-full border-4 border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {startup.stage} • {startup.targetSector}
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 font-mono text-sm font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          {startup.signalScore}% match
        </div>

        <motion.span
          style={{ opacity: matchOpacity }}
          className="absolute left-5 top-16 -rotate-12 rounded-lg border-[3px] border-emerald-400 px-2.5 py-0.5 font-display text-2xl font-extrabold text-emerald-400"
        >
          INVEST
        </motion.span>
        <motion.span
          style={{ opacity: passOpacity }}
          className="absolute right-5 top-16 rotate-12 rounded-lg border-[3px] border-red-500 px-2.5 py-0.5 font-display text-2xl font-extrabold text-red-500"
        >
          PASS
        </motion.span>
        <motion.span
          style={{ opacity: superOpacity }}
          className="absolute left-1/2 top-16 -translate-x-1/2 rounded-lg border-[3px] border-amber-400 px-2.5 py-0.5 font-display text-2xl font-extrabold text-amber-400"
        >
          SUPER
        </motion.span>
      </div>

      {/* Pitch + signals */}
      <div className="relative z-10 -mt-10 flex flex-1 flex-col px-5">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">{startup.founderName}</h2>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white">
            Ex-{startup.exCompany}
          </span>
        </div>
        <h3 className="my-1 font-display text-3xl font-extrabold text-white">{startup.name}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-300">{startup.headline}</p>

        <div className="mt-3 flex flex-col gap-1.5" aria-label="akta.pro signals">
          {startup.signals.map((s, i) => {
            const { icon: Icon, dot, color } = SIGNAL_STYLE[i];
            return (
              <div
                key={s}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span className="truncate">{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action dock */}
      <div className="flex items-center justify-center gap-5 pb-5 pt-3" onPointerDownCapture={(e) => e.stopPropagation()}>
        <button
          onClick={() => fling("left")}
          aria-label="Pass"
          title="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all hover:bg-red-500 hover:text-white"
        >
          <X className="h-6 w-6" strokeWidth={3} />
        </button>
        <button
          onClick={() => fling("up")}
          aria-label="Super-Invest"
          title="Super-Invest"
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:bg-amber-500 hover:text-black"
        >
          <Zap className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => fling("right")}
          aria-label="Match"
          title="Match"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#FF385C] to-rose-600 text-white shadow-[0_0_30px_rgba(255,56,92,0.5)] transition-all hover:scale-105"
        >
          <Heart className="h-7 w-7 fill-white" />
        </button>
      </div>
    </motion.div>
  );
}

interface Props {
  startups: StealthStartup[];
  onSwipe: (d: SwipeDirection, s: StealthStartup) => void;
}

export default function SwipeCard({ startups, onSwipe }: Props) {
  const top = startups[0];
  const next = startups[1];

  return (
    <div className="relative h-[640px] w-full max-w-[420px]">
      {next && (
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-y-3 scale-[0.94] rounded-[32px] border border-white/10 bg-zinc-950/70 opacity-70"
        />
      )}
      {top && <TopCard key={top.id} startup={top} onSwipe={(d) => onSwipe(d, top)} />}
    </div>
  );
}
