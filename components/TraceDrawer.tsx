"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronsRight, Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

export type TraceStep =
  | "akta.pro signal fetch"
  | "Thor/Nicrron LLM evaluation"
  | "Roundtable bus handoff"
  | "PRISM export"
  | "swipe";

export interface TraceEntry {
  id: string;
  ts: string;
  step: TraceStep;
  message: string;
  status: "run" | "ok" | "info";
}

const STEP_STYLE: Record<TraceStep, string> = {
  "akta.pro signal fetch": "text-sky-400",
  "Thor/Nicrron LLM evaluation": "text-violet-400",
  "Roundtable bus handoff": "text-emerald-400",
  "PRISM export": "text-amber-400",
  swipe: "text-coral",
};

interface Props {
  open: boolean;
  onToggle: () => void;
  logs: TraceEntry[];
  source: "live" | "sample";
}

export default function TraceDrawer({ open, onToggle, logs, source }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs, open]);

  return (
    <>
      {!open && (
        <button
          onClick={onToggle}
          aria-label="Open agent trace"
          className="glass fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-xs text-foreground/80 transition hover:text-foreground"
        >
          <Terminal className="h-4 w-4 text-coral" />
          Trace
          <span className="rounded-full bg-coral-soft px-1.5 text-coral">{logs.length}</span>
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-surface-border bg-[#09090b]/90 backdrop-blur-glass"
            aria-label="Agent telemetry"
          >
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/70">
                <Terminal className="h-4 w-4 text-coral" />
                Agent telemetry · PRISM
              </div>
              <button
                onClick={onToggle}
                aria-label="Collapse trace"
                className="rounded-full p-1.5 text-foreground/60 transition hover:bg-surface-raised hover:text-foreground"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
              {logs.length === 0 && (
                <p className="text-foreground/40">Swipe a card to start an agent run…</p>
              )}
              {logs.map((l) => (
                <div key={l.id} className="rounded-lg border border-surface-border bg-surface p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={STEP_STYLE[l.step]}>[{l.step}]</span>
                    <span className="text-foreground/30">{l.ts}</span>
                  </div>
                  <p className="mt-1 text-foreground/70">
                    {l.status === "run" && <span className="mr-1 text-amber-400">▸</span>}
                    {l.status === "ok" && <span className="mr-1 text-emerald-400">✓</span>}
                    {l.message}
                  </p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-surface-border px-4 py-2 font-mono text-[10px] text-foreground/30">
              {source === "live" ? "Signals: live from akta.pro" : "Signals: seed deck (akta.pro not connected)"} · handoff steps are not yet wired to external services
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
