import type { StealthStartup } from "./mockData";
import type { ThesisData } from "./thesisTypes";

export interface DemoThesisAction {
  startup: StealthStartup;
  action: "pass" | "save" | "track" | "intro";
}
/** Illustrative priors for the Somya demo persona, not claims about his actual investments. */
const STARTING_WEIGHTS: Record<string, number> = {
  "developer tools and AI agents": 1.1,
  "technical founder background": 0.85,
  "pre-seed teams": 0.65,
  "B2B software": 0.5,
  "hardware and robotics": -0.35,
  "services and consulting": -0.45,
};

/** Pure, browser-local session: reload restores priors, rewind recomputes from history. */
export function createSomyaDemoThesis(actions: DemoThesisAction[]): ThesisData {
  const weights = { ...STARTING_WEIGHTS };
  for (const { startup, action } of actions) {
    if (action === "track") continue;
    const change = action === "pass" ? -0.18 : action === "intro" ? 0.26 : 0.18;
    const text = `${startup.headline} ${startup.pitchSummary}`;
    const features: Record<string, boolean> = {
      "developer tools and AI agents": startup.targetSector === "AI Agents" || startup.targetSector === "AI Infra" || /agent|developer|orchestrat/i.test(text),
      "technical founder background": Boolean(startup.exCompany && startup.exCompany !== "Not disclosed"),
      "pre-seed teams": startup.stage === "Pre-Seed",
      "B2B software": startup.targetSector === "B2B SaaS",
      "hardware and robotics": startup.targetSector === "Physical AI",
      "services and consulting": /consulting|consultancy|professional services/i.test(text),
    };
    for (const [feature, present] of Object.entries(features)) {
      if (present) weights[feature] = Math.round(Math.max(-2, Math.min(2, weights[feature] + change)) * 100) / 100;
    }
  }
  const top = Object.entries(weights).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);
  const passed = actions.filter(({ action }) => action === "pass").length;
  const saved = actions.filter(({ action }) => action === "save" || action === "intro").length;
  return {
    n_actions: actions.length, weights, mode: "demo", readback_pending: false,
    readback_error: null, fund: null,
    readback: actions.length
      ? `Strongest preferences are ${top.join(" and ")}. This session: ${saved} saved or intro-ready, ${passed} passed. Track keeps a company on watch without changing preference weights.`
      : "Your filter starts with a preference for technical founders, developer tools and AI agents, and early B2B teams. Pass, save, track or request an intro to shape this session’s filter.",
  };
}
