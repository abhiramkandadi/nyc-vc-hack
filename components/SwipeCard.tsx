"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, animate, motion, useAnimationControls, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { BadgeCheck, Heart, Landmark, RotateCcw, Star, TrendingUp, Users, X, type LucideIcon } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import FounderPhoto, { PortraitContext } from "./FounderPhoto";
import { recentActivity, type MediaKind, type StealthStartup } from "@/lib/mockData";

export type SwipeDirection = "left" | "right" | "up";

const X_THRESHOLD = 120;
const Y_THRESHOLD = 140;

type SignalKind = "velocity" | "team" | "legal";

const SIGNAL_STYLE: Record<SignalKind, { icon: LucideIcon; pill: string }> = {
  velocity: { icon: TrendingUp, pill: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  team: { icon: Users, pill: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  legal: { icon: Landmark, pill: "border-amber-200 bg-amber-50 text-amber-700" },
};

const MEDIA_LABEL: Partial<Record<MediaKind, string>> = {
  hq: "🏢 NYC HQ",
  hardware: "🤖 Physical AI Lab",
  infra: "⚡ Stealth Infra",
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
  onImpact: (d: SwipeDirection) => void;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

function TopCard({ startup, forced, onSwipe, onImpact, x, y }: TopCardProps) {
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const mediaKind = useContext(PortraitContext)[startup.id]?.kind;
  const mediaLabel = mediaKind ? MEDIA_LABEL[mediaKind] : undefined;
  const activity = recentActivity(startup);

  const fling = (d: SwipeDirection) => {
    onImpact(d);
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

        {activity && (
          <div className="absolute left-3 top-6 flex items-center gap-1.5 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <span className={`h-2 w-2 rounded-full ${activity.recent ? "animate-pulse bg-emerald-400" : "bg-gray-300"}`} />
            In the news · {activity.label}
          </div>
        )}
        <div className="absolute right-3 top-6 rounded-full bg-[#FF385C] px-3 py-1 text-xs font-bold text-white shadow-md">
          {startup.signalScore}% match
        </div>
        {mediaLabel && (
          <div className="absolute right-3 top-[3.25rem] rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {mediaLabel}
          </div>
        )}

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

    </motion.div>
  );
}

/** Full-screen "grand" moment for a Super-Invest: blue flash, sweeping spotlight beams, and a first confetti blast. */
function SuperBurst({ burstKey }: { burstKey: number }) {
  useEffect(() => {
    if (!burstKey) return;
    const colors = ["#38BDF8", "#0EA5E9", "#7DD3FC", "#FFFFFF", "#FFD700"];
    confetti({ particleCount: 250, spread: 100, startVelocity: 60, origin: { x: 0.5, y: 0.9 }, colors, zIndex: 120, disableForReducedMotion: true });
    confetti({ particleCount: 120, spread: 70, angle: 60, startVelocity: 65, origin: { x: 0, y: 0.9 }, colors, zIndex: 120, disableForReducedMotion: true });
    confetti({ particleCount: 120, spread: 70, angle: 120, startVelocity: 65, origin: { x: 1, y: 0.9 }, colors, zIndex: 120, disableForReducedMotion: true });
  }, [burstKey]);

  return (
    <AnimatePresence>
      {burstKey > 0 && (
        <motion.div
          key={burstKey}
          className="pointer-events-none fixed inset-0 z-[110] overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: 1.9, times: [0, 0.7, 1] }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-0 bg-sky-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.75, 0.55] }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute inset-0 bg-sky-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {[-24, 0, 24].map((deg, i) => (
            <motion.div
              key={deg}
              className="absolute left-1/2 top-[-10%] h-[130%] w-[60vmax] origin-top -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(224,242,254,0.95) 0%, rgba(125,211,252,0.55) 45%, rgba(56,189,248,0) 100%)",
                clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
                filter: "blur(6px)",
              }}
              initial={{ rotate: deg * 2.2, opacity: 0 }}
              animate={{ rotate: [deg * 2.2, deg * 0.4, deg * 0.9], opacity: [0, 0.9, 0.7] }}
              transition={{ duration: 1.4, delay: 0.08 * i, ease: "easeOut" }}
            />
          ))}
          <motion.div
            className="absolute left-1/2 top-0 h-[80%] w-[70%] -translate-x-1/2"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.95), rgba(56,189,248,0.45) 45%, transparent 72%)" }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0.8], scale: [0.6, 1.15, 1] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
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
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useEffect(() => setStage(document.getElementById("stage-root")), []);
  // A new top card starts centered; the previous card's fling offset must not carry over.
  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [top?.id, x, y]);
  const likeOpacity = useTransform(x, [20, X_THRESHOLD], [0, 1]);
  const likeScale = useTransform(x, [20, X_THRESHOLD], [0.5, 1.3]);
  const nopeOpacity = useTransform(x, [-X_THRESHOLD, -20], [1, 0]);
  const nopeScale = useTransform(x, [-X_THRESHOLD, -20], [1.3, 0.5]);
  const superOpacity = useTransform(y, [-Y_THRESHOLD, -20], [1, 0]);
  const superScale = useTransform(y, [-Y_THRESHOLD, -20], [1.3, 0.5]);
  const stampBase =
    "absolute flex select-none flex-col items-center rounded-[3rem] border-[1.1rem] px-[0.35em] py-[0.18em] text-center text-[min(9cqw,9rem)] font-black uppercase leading-[0.95] tracking-widest backdrop-blur-md";
  const [burstKey, setBurstKey] = useState(0);
  const impact = (d: SwipeDirection) => {
    if (d === "up") {
      setBurstKey((k) => k + 1);
      try {
        const horn = new Audio("/sfx/airhorn.mp3");
        horn.volume = 0.9;
        void horn.play().catch(() => undefined);
      } catch {
        // Audio unavailable; the visual burst still plays.
      }
    }
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
            x={x}
            y={y}
            onImpact={impact}
            onSwipe={(d) => {
              setForced(null);
              onSwipe(d, top);
            }}
          />
        )}
      </motion.div>

      {typeof document !== "undefined" && createPortal(<SuperBurst burstKey={burstKey} />, document.body)}
      {stage &&
        createPortal(
          <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center overflow-hidden" aria-hidden="true">
            <motion.div
              style={{ opacity: likeOpacity, scale: likeScale, rotate: 18 }}
              className={`${stampBase} border-double border-emerald-500 bg-emerald-950/40 text-emerald-400 drop-shadow-[0_20px_50px_rgba(16,185,129,0.7)]`}
            >
              <span>Term</span>
              <span>Sheet ❤️</span>
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity, scale: nopeScale, rotate: -18 }}
              className={`${stampBase} border-dashed border-red-600 bg-red-950/40 text-red-600 drop-shadow-[0_20px_50px_rgba(220,38,38,0.7)]`}
            >
              <span>No</span>
              <span>Deal ❌</span>
            </motion.div>
            <motion.div
              style={{ opacity: superOpacity, scale: superScale, rotate: -8 }}
              className={`${stampBase} border-sky-300 bg-sky-600/80 text-white drop-shadow-[0_0_40px_rgba(56,189,248,0.95)]`}
            >
              <span>Super</span>
              <span>Invest ⚡</span>
            </motion.div>
          </div>,
          stage,
        )}

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
        <span className="relative flex h-14 w-14 items-center justify-center">
          <motion.span
            aria-hidden="true"
            className="absolute inset-[-6px] rounded-full bg-sky-400/60 blur-md"
            animate={{ scale: [1, 1.45, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-sky-300"
            animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <button
            onClick={() => setForced("up")}
            disabled={locked}
            aria-label="Super-Invest"
            title="Super-Invest"
            className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky-300 bg-white text-sky-500 shadow-[0_0_26px_rgba(56,189,248,0.95)] transition hover:scale-110 disabled:opacity-40"
          >
            <Star className="h-6 w-6 fill-sky-400" />
          </button>
        </span>
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
