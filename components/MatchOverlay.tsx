"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Flame, Mail, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import FounderPhoto from "./FounderPhoto";
import type { StealthStartup } from "@/lib/mockData";

interface Props {
  startup: StealthStartup;
  superInvest: boolean;
  /** "match" celebrates a fresh match; "chat" reopens an existing one without confetti. */
  mode: "match" | "chat";
  thesis: string;
  emailOpened: boolean;
  onClose: () => void;
  onSend: (s: StealthStartup) => void;
}

interface Memo {
  generatedBy: "thor" | "nicrron" | "rules";
  bullets: { title: string; content: string }[];
}

export default function MatchOverlay({ startup, superInvest, mode, thesis, emailOpened, onClose, onSend }: Props) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [memoState, setMemoState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/memo?id=${encodeURIComponent(startup.id)}&thesis=${encodeURIComponent(thesis)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { success?: boolean; data?: Memo } | null) => {
        if (d?.success && d.data?.bullets?.length) {
          setMemo(d.data);
          setMemoState("ready");
        } else setMemoState("failed");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setMemoState("failed");
      });
    return () => ctrl.abort();
  }, [startup.id, thesis]);
  const [draft, setDraft] = useState(startup.draftEmail);
  const [sent, setSent] = useState(emailOpened);

  useEffect(() => {
    if (mode !== "match") return;
    if (superInvest) {
      const colors = ["#38BDF8", "#0EA5E9", "#FFD700", "#FFFFFF", "#FF385C", "#10B981"];
      const star = confetti.shapeFromText({ text: "⚡", scalar: 2 });
      const fire = (opts: confetti.Options) => confetti({ colors, zIndex: 100, disableForReducedMotion: true, ...opts });
      fire({ particleCount: 400, spread: 360, startVelocity: 55, origin: { x: 0.5, y: 0.5 }, scalar: 1.3 });
      fire({ particleCount: 60, spread: 120, origin: { x: 0.5, y: 0.5 }, shapes: [star], scalar: 3 });
      const end = Date.now() + 2800;
      const id = setInterval(() => {
        if (Date.now() > end) return clearInterval(id);
        fire({ particleCount: 70, angle: 60, spread: 70, startVelocity: 70, origin: { x: 0, y: 0.8 } });
        fire({ particleCount: 70, angle: 120, spread: 70, startVelocity: 70, origin: { x: 1, y: 0.8 } });
        fire({ particleCount: 40, spread: 360, startVelocity: 30, gravity: 0.6, origin: { x: Math.random(), y: Math.random() * 0.4 } });
      }, 220);
      return () => {
        clearInterval(id);
        confetti.reset();
      };
    }
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#FF385C", "#FF1744", "#FFD700", "#10B981"],
      zIndex: 100,
    });
    const side = (x: number, angle: number) =>
      confetti({ particleCount: 60, spread: 70, angle, origin: { x, y: 0.7 }, colors: ["#FF385C", "#FFD700", "#10B981"], zIndex: 100 });
    side(0, 60);
    side(1, 120);
  }, [mode, superInvest]);

  const sendIntro = () => {
    const subject = `Intro: ${startup.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
    setSent(true);
    onSend(startup);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "match" ? "Match" : `${startup.name} pitch`}
    >
      <motion.div
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative max-h-[95vh] w-full max-w-md overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="bg-gradient-to-r from-[#FF385C] via-rose-500 to-amber-400 bg-clip-text text-center font-display text-4xl font-extrabold italic tracking-tight text-transparent">
          {mode === "chat" ? startup.name : superInvest ? "SUPER-INVEST!" : "IT'S A MATCH!"}
        </h2>
        {mode === "match" && (
          <p className="mt-1 text-center text-xs text-gray-500">
            {superInvest ? (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Zap className="h-3.5 w-3.5" /> Priority outreach flagged
              </span>
            ) : (
              <>You and {startup.founderName} both want this conversation.</>
            )}
          </p>
        )}

        <div className="mt-5 flex items-center justify-center">
          <span className="z-10 -mr-3 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FF385C] to-rose-500 shadow-lg">
            <Flame className="h-9 w-9 fill-white text-white" aria-label="You" />
          </span>
          <FounderPhoto
            startup={startup}
            className="h-20 w-20 rounded-full border-4 border-white object-cover object-top shadow-lg"
          />
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-gray-900">{startup.founderName}</p>
        <p className="text-center text-xs text-gray-500">
          {startup.founderBackground} · {startup.name}
        </p>

        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">{startup.pitchSummary}</p>

        {memoState !== "failed" && (
          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3" aria-label="Investment committee memo">
            <p className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[#FF385C]">
              <span>IC memo</span>
              {memo && <span className="text-gray-400">{memo.generatedBy === "rules" ? "Rules-based" : "AI-drafted"}</span>}
            </p>
            {memoState === "loading" ? (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-rose-100" />
                ))}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {memo?.bullets.map((b) => (
                  <li key={b.title} className="text-xs leading-relaxed text-gray-700">
                    <span className="font-bold text-gray-900">{b.title}: </span>
                    {b.content}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="intro-draft" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Intro email (editable)
          </label>
          <textarea
            id="intro-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-[#FF385C]"
          />
        </div>

        <button
          onClick={sendIntro}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF385C] to-rose-600 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          <Mail className="h-4 w-4" /> {sent ? "Open in mail app again" : "Send Intro Email"}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-gray-400">Opens your mail app with this draft. Add the recipient and send.</p>
        <button onClick={onClose} className="mt-1 w-full py-2 text-xs text-gray-500 hover:text-gray-900">
          Keep swiping
        </button>
      </motion.div>
    </motion.div>
  );
}
