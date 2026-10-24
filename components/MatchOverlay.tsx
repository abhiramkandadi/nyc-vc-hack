"use client";

import { motion } from "framer-motion";
import { Check, Send, X, Zap } from "lucide-react";
import { useState } from "react";
import FounderPhoto from "./FounderPhoto";
import type { StealthStartup } from "@/lib/mockData";

interface Props {
  startup: StealthStartup;
  superInvest: boolean;
  onClose: () => void;
  onSend: (s: StealthStartup) => void;
}

export default function MatchOverlay({ startup, superInvest, onClose, onSend }: Props) {
  const [sent, setSent] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Match"
    >
      <motion.div
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="glass relative w-full max-w-md rounded-3xl p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-foreground/50 hover:bg-surface-raised hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-center font-display text-4xl font-bold tracking-tight text-coral drop-shadow-[0_0_24px_var(--coral-glow)]">
          {superInvest ? "SUPER-INVEST!" : "IT'S A MATCH!"}
        </h2>
        {superInvest && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-amber-400">
            <Zap className="h-3.5 w-3.5" /> Priority outreach flagged
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <FounderPhoto startup={startup} className="h-16 w-16 rounded-full border border-white/20 object-cover object-top" />
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{startup.founderName}</p>
            <p className="text-xs text-foreground/60">
              {startup.founderBackground} · {startup.name}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/40">
            Auto-drafted pitch
          </p>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-surface-border bg-surface p-3 font-sans text-sm leading-relaxed text-foreground/80">
            {startup.draftEmail}
          </pre>
        </div>

        <button
          disabled={sent}
          onClick={() => {
            setSent(true);
            onSend(startup);
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-coral py-3 text-sm font-semibold text-white shadow-coral transition hover:brightness-110 disabled:bg-emerald-500/20 disabled:text-emerald-400 disabled:shadow-none"
        >
          {sent ? (
            <>
              <Check className="h-4 w-4" /> Draft saved (not emailed)
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Send Outreach
            </>
          )}
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2 text-xs text-foreground/50 hover:text-foreground">
          Keep swiping
        </button>
      </motion.div>
    </motion.div>
  );
}
