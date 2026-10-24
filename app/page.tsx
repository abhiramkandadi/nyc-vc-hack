"use client";

import { AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header, { type Preset } from "@/components/Header";
import MatchOverlay from "@/components/MatchOverlay";
import SwipeCard, { type SwipeDirection } from "@/components/SwipeCard";
import TraceDrawer, { type TraceEntry } from "@/components/TraceDrawer";
import { MOCK_STEALTH_STARTUPS, type StealthStartup, type TargetSector } from "@/lib/mockData";

const PRESET_SECTORS: Record<Preset, TargetSector[]> = {
  "Plug & Play": ["B2B SaaS"],
  "Everywhere VC": ["AI Infra", "B2B SaaS", "Physical AI"],
  "AI Agents": ["AI Infra"],
};

let seq = 0;
const stamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });

export default function Home() {
  const [preset, setPreset] = useState<Preset>("Everywhere VC");
  const [index, setIndex] = useState(0);
  const [matches, setMatches] = useState<StealthStartup[]>([]);
  const [overlay, setOverlay] = useState<{ startup: StealthStartup; superInvest: boolean } | null>(null);
  const [logs, setLogs] = useState<TraceEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<{ startup: StealthStartup; wasMatch: boolean }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const deck = useMemo(
    () => MOCK_STEALTH_STARTUPS.filter((s) => PRESET_SECTORS[preset].includes(s.targetSector)),
    [preset],
  );
  const remaining = deck.slice(index);

  const log = useCallback((step: TraceEntry["step"], message: string, status: TraceEntry["status"]) => {
    setLogs((l) => [...l, { id: `t${seq++}`, ts: stamp(), step, message, status }]);
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const runPipeline = useCallback(
    (s: StealthStartup) => {
      const steps: [TraceEntry["step"], string][] = [
        ["akta.pro signal fetch", `${s.signals.length} signals for ${s.name} (mock fixture)`],
        ["Thor/Nicrron LLM evaluation", `Thesis fit scored ${s.signalScore}/100 for ${s.targetSector}`],
        ["Roundtable bus handoff", "SourcingAgent → ICDiligenceAgent deal_brief queued (simulated)"],
        ["PRISM export", `Trace exported for ${s.name} (simulated)`],
      ];
      steps.forEach(([step, msg], i) => {
        timers.current.push(setTimeout(() => log(step, msg, "ok"), 350 * (i + 1)));
      });
    },
    [log],
  );

  const handleRewind = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
    if (last.wasMatch) setMatches((m) => m.filter((x) => x.id !== last.startup.id));
    setOverlay(null);
    log("swipe", `Rewind: ${last.startup.name}`, "info");
  };

  const handleSwipe = (d: SwipeDirection, s: StealthStartup) => {
    setIndex((i) => i + 1);
    setHistory((h) => [...h, { startup: s, wasMatch: d !== "left" && !matches.some((x) => x.id === s.id) }]);
    log("swipe", `${d === "left" ? "Pass" : d === "up" ? "Super-Invest" : "Match"}: ${s.name}`, "info");
    if (d === "left") return;
    setMatches((m) => (m.some((x) => x.id === s.id) ? m : [...m, s]));
    setOverlay({ startup: s, superInvest: d === "up" });
    runPipeline(s);
  };

  const changePreset = (p: Preset) => {
    setPreset(p);
    setIndex(0);
    setHistory([]);
    log("swipe", `Preset → ${p}`, "info");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(255,56,92,0.12),transparent_55%)]">
      <Header preset={preset} onPreset={changePreset} matchCount={matches.length} />

      <main className="flex flex-col items-center px-4 py-6">
        {remaining.length > 0 ? (
          <SwipeCard startups={remaining} onSwipe={handleSwipe} onRewind={handleRewind} canRewind={history.length > 0} />
        ) : (
          <div className="mt-16 flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[32px] border border-white/15 bg-zinc-950/90 p-10 text-center backdrop-blur-2xl">
            <h2 className="font-display text-2xl font-bold">You&apos;re all caught up</h2>
            <p className="text-sm text-foreground/60">No more stealth startups for this preset.</p>
            <button
              onClick={() => {
                setIndex(0);
                setHistory([]);
              }}
              className="flex items-center gap-2 rounded-full bg-[#FF385C] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,56,92,0.4)]"
            >
              <RotateCcw className="h-4 w-4" /> Reset deck
            </button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {overlay && (
          <MatchOverlay
            key={overlay.startup.id}
            startup={overlay.startup}
            superInvest={overlay.superInvest}
            onClose={() => setOverlay(null)}
            onSend={(s) => log("Roundtable bus handoff", `Outreach to ${s.founderName} queued (demo, nothing sent)`, "ok")}
          />
        )}
      </AnimatePresence>

      <TraceDrawer open={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} logs={logs} />
    </div>
  );
}
