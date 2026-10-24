"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { StealthStartup } from "@/lib/mockData";

export type SwipeDirection = "left" | "right" | "up";

const X_THRESHOLD = 120;
const Y_THRESHOLD = 140;

interface TopCardProps {
  startup: StealthStartup;
  forced: SwipeDirection | null;
  onSwipe: (d: SwipeDirection) => void;
}

function TopCard({ startup, forced, onSwipe }: TopCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-16, 0, 16]);
  const matchOpacity = useTransform(x, [30, X_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-X_THRESHOLD, -30], [1, 0]);
  const superOpacity = useTransform(y, [-Y_THRESHOLD, -40], [1, 0]);

  const fling = (d: SwipeDirection) => {
    const target = d === "up" ? { y: -700 } : { x: d === "right" ? 700 : -700 };
    animate(d === "up" ? y : x, Object.values(target)[0], { duration: 0.3 }).then(() => onSwipe(d));
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
      whileTap={{ cursor: "grabbing" }}
      className="glass absolute inset-0 cursor-grab rounded-3xl p-6"
    >
      <motion.span
        style={{ opacity: matchOpacity }}
        className="absolute left-5 top-5 rotate-[-12deg] rounded-lg border-2 border-emerald-400 px-2 py-0.5 font-display text-lg font-bold text-emerald-400"
      >
        MATCH
      </motion.span>
      <motion.span
        style={{ opacity: passOpacity }}
        className="absolute right-5 top-5 rotate-[12deg] rounded-lg border-2 border-coral px-2 py-0.5 font-display text-lg font-bold text-coral"
      >
        PASS
      </motion.span>
      <motion.span
        style={{ opacity: superOpacity }}
        className="absolute left-1/2 top-5 -translate-x-1/2 rounded-lg border-2 border-amber-400 px-2 py-0.5 font-display text-lg font-bold text-amber-400"
      >
        SUPER
      </motion.span>
      <CardBody startup={startup} />
    </motion.div>
  );
}

function CardBody({ startup }: { startup: StealthStartup }) {
  return (
    <div className="flex h-full select-none flex-col pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={startup.founderAvatar}
            alt=""
            draggable={false}
            className="h-14 w-14 rounded-full border border-surface-border"
          />
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{startup.founderName}</p>
            <span className="mt-1 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-foreground/70">
              ex-{startup.exCompany}
            </span>
          </div>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-400">
          {startup.signalScore}% match
        </span>
      </div>

      <h3 className="mt-6 font-display text-3xl font-bold tracking-tight">{startup.name}</h3>
      <p className="mt-1 text-sm text-foreground/70">{startup.headline}</p>
      <div className="mt-2 flex gap-2 font-mono text-[11px] text-foreground/40">
        <span>{startup.stage}</span>·<span>{startup.targetSector}</span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/60">{startup.pitchSummary}</p>

      <div className="mt-auto">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-foreground/40">akta.pro signals</p>
        <div className="flex flex-wrap gap-1.5">
          {startup.signals.map((s) => (
            <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-foreground/80">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Props {
  startups: StealthStartup[];
  onSwipe: (d: SwipeDirection, s: StealthStartup) => void;
}

export default function SwipeCard({ startups, onSwipe }: Props) {
  const [forced, setForced] = useState<SwipeDirection | null>(null);
  const top = startups[0];
  const next = startups[1];

  const handle = (d: SwipeDirection) => {
    setForced(null);
    onSwipe(d, top);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-[540px] w-[min(92vw,380px)]">
        {next && (
          <div className="glass absolute inset-0 scale-95 rounded-3xl opacity-60" aria-hidden="true" />
        )}
        {top && <TopCard key={top.id} startup={top} forced={forced} onSwipe={handle} />}
      </div>

      <div className="flex items-center gap-5" role="group" aria-label="Swipe actions">
        <DockButton label="Pass" onClick={() => setForced("left")} disabled={!top || !!forced} tone="text-coral border-coral/40">
          <X className="h-6 w-6" />
        </DockButton>
        <DockButton label="Super-Invest" onClick={() => setForced("up")} disabled={!top || !!forced} tone="text-amber-400 border-amber-400/40" big>
          <Zap className="h-7 w-7" />
        </DockButton>
        <DockButton label="Match" onClick={() => setForced("right")} disabled={!top || !!forced} tone="text-emerald-400 border-emerald-400/40">
          <Heart className="h-6 w-6" />
        </DockButton>
      </div>
    </div>
  );
}

function DockButton({
  children,
  label,
  onClick,
  disabled,
  tone,
  big,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone: string;
  big?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`glass flex items-center justify-center rounded-full border ${tone} transition disabled:opacity-40 ${
        big ? "h-16 w-16" : "h-14 w-14"
      }`}
    >
      {children}
    </motion.button>
  );
}
