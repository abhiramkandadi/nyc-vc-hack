"use client";

import { AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header, { type Preset } from "@/components/Header";
import GallerySidebar from "@/components/GallerySidebar";
import MessagesSidebar, { type MatchRecord } from "@/components/MessagesSidebar";
import MatchOverlay from "@/components/MatchOverlay";
import SwipeCard, { type SwipeDirection } from "@/components/SwipeCard";
import TraceDrawer, { type TraceEntry } from "@/components/TraceDrawer";
import { PortraitContext } from "@/components/FounderPhoto";
import { useDominantColor } from "@/lib/useDominantColor";
import { MOCK_STEALTH_STARTUPS, assignUniquePortraits, themeColorFor, type StealthStartup } from "@/lib/mockData";

/** left = pass, right = save, up = track, and the Intro button sends "down". */
const ACTION = { left: "pass", right: "save", up: "track", down: "intro" } as const;
const ACTION_LABEL = { pass: "Pass", save: "Save", track: "Track", intro: "Intro" } as const;

let seq = 0;
const stamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });

export default function Home() {
  const [preset, setPreset] = useState<Preset>("Everywhere VC");
  const [index, setIndex] = useState(0);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [overlay, setOverlay] = useState<{ startup: StealthStartup; superInvest: boolean; mode: "match" | "chat" } | null>(null);
  const [logs, setLogs] = useState<TraceEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<{ startup: StealthStartup; wasMatch: boolean }[]>([]);
  const [startups, setStartups] = useState<StealthStartup[]>(MOCK_STEALTH_STARTUPS);
  const [source, setSource] = useState<"live" | "sample">("sample");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The API already filters and ranks the deck for the active thesis.
  const remaining = startups.slice(index);
  const portraits = useMemo(() => assignUniquePortraits(startups), [startups]);

  const log = useCallback((step: TraceEntry["step"], message: string, status: TraceEntry["status"]) => {
    setLogs((l) => [...l, { id: `t${seq++}`, ts: stamp(), step, message, status }]);
  }, []);

  const indexRef = useRef(0);
  indexRef.current = index;
  const syncId = useRef(0);

  /**
   * After an action the service has refit, so ask it for the new order. Cards already acted on
   * stay at the front, in order, and the rest follow the model's ranking.
   */
  const reorderDeck = useCallback((thesisName: Preset) => {
    const id = ++syncId.current;
    fetch(`/api/signals?thesis=${encodeURIComponent(thesisName)}&ranking=learned`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { startups: StealthStartup[]; meta?: { ranking?: { source?: string } } } | null) => {
        if (id !== syncId.current || !d?.startups?.length || d.meta?.ranking?.source !== "model") return;
        setStartups((prev) => {
          const acted = prev.slice(0, indexRef.current);
          const actedIds = new Set(acted.map((x) => x.id));
          return [...acted, ...d.startups.filter((x) => !actedIds.has(x.id))];
        });
      })
      .catch(() => undefined);
  }, []);

  const requestId = useRef(0);
  const loadDeck = useCallback((thesisName: Preset) => {
    const id = ++requestId.current;
    fetch(`/api/signals?thesis=${encodeURIComponent(thesisName)}&ranking=learned`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { source: "live" | "sample"; startups: StealthStartup[] } | null) => {
        // Ignore stale responses from an earlier tab click.
        if (id !== requestId.current || !d?.startups?.length) return;
        setStartups(d.startups);
        setSource(d.source);
        setIndex(0);
        setHistory([]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadDeck("Everywhere VC");
  }, [loadDeck]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const runPipeline = useCallback(
    (s: StealthStartup) => {
      const steps: [TraceEntry["step"], string][] = [
        ["akta.pro signal fetch", `${s.signals.length} signals for ${s.name}${s.liveNews ? " + latest news" : ""}`],
        ["Thor/Nicrron LLM evaluation", `Thesis fit scored ${s.signalScore}/100 for ${s.targetSector}`],
        ["Roundtable bus handoff", "SourcingAgent → ICDiligenceAgent deal_brief queued"],
        ["PRISM export", `Trace exported for ${s.name}`],
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
    if (last.wasMatch) setMatches((m) => m.filter((x) => x.startup.id !== last.startup.id));
    setOverlay(null);
    log("swipe", `Rewind: ${last.startup.name}`, "info");
    // Take the action back in the model too, so the screen and the learned weights agree.
    fetch("/api/feedback", { method: "DELETE" })
      .then(() => reorderDeck(preset))
      .catch(() => undefined);
  };

  const handleSwipe = (d: SwipeDirection, s: StealthStartup) => {
    const action = ACTION[d];
    const isMatch = d === "right" || d === "down"; // save and intro open the match flow
    setIndex((i) => i + 1);
    setHistory((h) => [...h, { startup: s, wasMatch: isMatch && !matches.some((x) => x.startup.id === s.id) }]);
    log("swipe", `${ACTION_LABEL[action]}: ${s.name}`, "info");
    // Record the action with the thesis service, then ask for the new order.
    // The swipe animation never waits on the network.
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, action }),
      keepalive: true,
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        reorderDeck(preset);
      })
      .catch(() => log("swipe", `Thesis service did not record ${ACTION_LABEL[action]} for ${s.name}`, "info"));
    if (d === "left") return;
    if (d === "up") {
      log("swipe", `Tracking ${s.name}: right company, wrong time`, "ok");
      return;
    }
    setMatches((m) =>
      m.some((x) => x.startup.id === s.id)
        ? m
        : [...m, { startup: s, matchedAt: Date.now(), superInvest: d === "down", emailOpened: false, unread: true }],
    );
    // Beat of suspense before the match reveal.
    timers.current.push(setTimeout(() => setOverlay({ startup: s, superInvest: d === "down", mode: "match" }), 400));
    runPipeline(s);
  };

  const handleOpenChat = (m: MatchRecord) => {
    setMatches((all) => all.map((x) => (x.startup.id === m.startup.id ? { ...x, unread: false } : x)));
    setOverlay({ startup: m.startup, superInvest: m.superInvest, mode: "chat" });
  };

  const handleSelectFounder = (s: StealthStartup) => {
    const at = startups.findIndex((x) => x.id === s.id);
    if (at < 0) return;
    if (at < index) {
      log("swipe", `${s.name} already has an action. Use Rewind to change it.`, "info");
      return;
    }
    // Move this founder to the front of the cards still to come. Cards already acted on stay put.
    setStartups((prev) => [...prev.slice(0, index), s, ...prev.slice(index).filter((x) => x.id !== s.id)]);
    log("swipe", `Jumped to ${s.name}`, "info");
  };

  const changePreset = (p: Preset) => {
    setPreset(p);
    setIndex(0);
    setHistory([]);
    log("swipe", `Preset → ${p}`, "info");
    loadDeck(p);
  };

  const activeStartup = remaining[0] ?? startups[0];
  const auraFallback = activeStartup ? themeColorFor(activeStartup) : "#FF385C";
  const aura = useDominantColor(activeStartup ? portraits[activeStartup.id]?.src : undefined, auraFallback);
  const thesis = preset === "Everywhere VC" ? "Thesis: Everywhere VC" : `Thesis: ${preset}`;

  return (
    <PortraitContext.Provider value={portraits}>
    <div className="m-0 flex h-screen w-screen max-w-none flex-row items-stretch justify-between overflow-hidden bg-[#F8F9FA] p-0 font-sans text-gray-900">
      <GallerySidebar
        startups={startups}
        currentId={remaining[0]?.id ?? null}
        matchedIds={new Set(matches.map((m) => m.startup.id))}
        live={source === "live"}
        onSelect={handleSelectFounder}
      />

      <div id="stage-root"
        className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-between overflow-hidden bg-[#F1F3F5] [container-type:inline-size]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-90 transition-colors duration-700 ease-out"
          style={{
            backgroundColor: aura,
            WebkitMaskImage: "radial-gradient(ellipse 110% 95% at 50% 40%, black 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.25) 85%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 110% 95% at 50% 40%, black 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.25) 85%, transparent 100%)",
          }}
        />
        <Header preset={preset} onPreset={changePreset} matchCount={matches.length} />

        <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-4">
          <div className="relative flex h-full w-full max-w-[580px] flex-col">
            {remaining.length > 0 ? (
              <SwipeCard startups={remaining} onSwipe={handleSwipe} onRewind={handleRewind} canRewind={history.length > 0} />
            ) : (
              <div className="flex h-[780px] max-h-full w-full flex-col items-center justify-center gap-4 rounded-[36px] border border-gray-200/80 bg-white p-10 text-center shadow-xl">
                <h2 className="font-display text-2xl font-bold text-gray-900">You&apos;re all caught up</h2>
                <p className="text-sm text-gray-500">No more stealth startups for this preset.</p>
                <button
                  onClick={() => {
                    setIndex(0);
                    setHistory([]);
                  }}
                  className="flex items-center gap-2 rounded-full bg-[#FF385C] px-5 py-2 text-sm font-semibold text-white shadow-md"
                >
                  <RotateCcw className="h-4 w-4" /> Reset deck
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <MessagesSidebar
        matches={matches}
        thesis={thesis}
        selectedId={overlay?.mode === "chat" ? overlay.startup.id : null}
        onSelectMatch={handleOpenChat}
      />

      <AnimatePresence>
        {overlay && (
          <MatchOverlay
            key={`${overlay.mode}-${overlay.startup.id}`}
            startup={overlay.startup}
            superInvest={overlay.superInvest}
            mode={overlay.mode}
            thesis={preset}
            emailOpened={matches.find((m) => m.startup.id === overlay.startup.id)?.emailOpened ?? false}
            onClose={() => setOverlay(null)}
            onSend={(s) => {
              setMatches((all) => all.map((x) => (x.startup.id === s.id ? { ...x, emailOpened: true, unread: false } : x)));
              log("Roundtable bus handoff", `Intro draft for ${s.founderName} opened in mail app`, "ok");
            }}
          />
        )}
      </AnimatePresence>

      <TraceDrawer open={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} logs={logs} source={source} />
    </div>
    </PortraitContext.Provider>
  );
}
