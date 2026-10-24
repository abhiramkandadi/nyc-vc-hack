import type { StartupProfile } from "./akta";

export const THESIS_NAMES = ["Everywhere VC", "AI Agents", "Plug & Play"] as const;
export type ThesisName = typeof THESIS_NAMES[number];
export const THESIS_RULE_VERSION = "provisional-v1";

/** Explicit provisional defaults; replace centrally after the VC interviews. */
export const THESIS_WEIGHTS = {
  everywhere: { confirmedPreSeed: 35, confirmedSeed: 10, activeStealth: 25, highMonthlyCommits: 40 },
  agents: { agenticFramework: 80, llmOrchestration: 85, revenueIntelligence: 75 },
  physical: { sector: 45, robotics: 40, perception: 30, robotHardware: 25 },
} as const;

export class UnsupportedThesisError extends Error {
  constructor() { super("Unsupported thesis. Use Everywhere VC, AI Agents, or Plug & Play."); this.name = "UnsupportedThesisError"; }
}
export interface ThesisAssessment {
  thesis: ThesisName;
  ruleVersion: typeof THESIS_RULE_VERSION;
  score: number;
  matched: boolean;
  reasons: string[];
  unknowns: string[];
  monthlyCommits: number | null;
}
export interface ThesisRankedProfile extends StartupProfile {
  /** Thesis fit, kept separate from the source evidence-coverage signalScore. */
  thesisScore: number;
  thesisMatch: ThesisAssessment;
}

export function normalizeThesis(value: string): ThesisName {
  if (typeof value !== "string" || value.length > 80) throw new UnsupportedThesisError();
  const key = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (key === "everywhere vc") return "Everywhere VC";
  if (key === "ai agents") return "AI Agents";
  if (key === "plug & play" || key === "plug and play") return "Plug & Play";
  throw new UnsupportedThesisError();
}

function monthlyCommits(profile: StartupProfile): number | null {
  const values = new Set<number>();
  const labels = [...profile.signals, ...profile.signalEvidence.map((evidence) => evidence.text)];
  for (const label of labels) {
    if (/unavailable|not available|unknown|unverified|no evidence|unconfirmed|not reported|target|projected|planned/i.test(label)) continue;
    const patterns = [
      /\b(\d[\d,]*)\s+(?:github\s+)?commits?\s*(?:\/\s*(?:mo(?:nth)?s?|30\s*days?)\b|per\s+month\b|in\s+(?:the\s+last\s+)?30\s+days\b)/gi,
      /\b(?:github\s+)?commits?\s*(?:\/\s*(?:mo(?:nth)?s?)\b|per\s+month\b)\s*[:=]\s*(\d[\d,]*)\b/gi,
    ];
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(label)) !== null) {
        const value = Number(match[1].replace(/,/g, ""));
        if (Number.isSafeInteger(value) && value >= 0) values.add(value);
      }
    }
  }
  // Conflicting observations need reconciliation; never select the highest value.
  return values.size === 1 ? Array.from(values)[0] : null;
}

export function assessThesis(profile: StartupProfile, thesis: string): ThesisAssessment {
  const name = normalizeThesis(thesis);
  const core = `${profile.headline} ${profile.pitchSummary}`.replace(/\s+/g, " ");
  const reasons: string[] = [], unknowns: string[] = [];
  const commits = monthlyCommits(profile);
  let score = 0, matched = false;
  if (name === "Everywhere VC") {
    const weights = THESIS_WEIGHTS.everywhere;
    if (profile.stageIsInferred) unknowns.push("Funding stage is unconfirmed; the display default receives no stage boost.");
    else if (profile.stage === "Pre-Seed") { score += weights.confirmedPreSeed; reasons.push("Confirmed pre-seed stage."); }
    else { score += weights.confirmedSeed; reasons.push("Confirmed seed stage."); }
    const status = (profile as StartupProfile & { stealthStatus?: unknown }).stealthStatus;
    if (status === "stealth") { score += weights.activeStealth; reasons.push("Source explicitly identifies an active stealth team."); }
    else if (status === "emerged") reasons.push("Company has publicly emerged from stealth.");
    else unknowns.push("Current stealth status is not established.");
    if (commits === null) unknowns.push("Monthly commit velocity is missing or conflicting.");
    else if (commits > 200) { score += weights.highMonthlyCommits; reasons.push(`${commits} commits/month exceeds the 200-commit threshold.`); }
    else reasons.push(`${commits} commits/month does not exceed the 200-commit threshold.`);
    matched = score > 0;
  } else if (name === "AI Agents") {
    const workflow = /\bagents?\b/i.test(core) && /\b(?:automating|automate|workflows?|change management|context|data layer|autonomous runtimes)\b/i.test(core) && !/\b(?:serves|customers|companies building)\b/i.test(core);
    const framework = workflow || /\b(?:agentic|multi[ -]agent)\s+(?:frameworks?|workflows?|platforms?|systems?)\b|\bagent\s+(?:frameworks?|runtimes?|workflows?|operating systems?)\b/i.test(core);
    const orchestration = /\b(?:llm|language[ -]model|ai[ -]agent|agent)\s+orchestrat\w*\b|\b(?:frameworks?|orchestration)\s+(?:for|of)\s+(?:ai\s+)?agents?\b|\bllm\s+frameworks?\b|\bllmops\b/i.test(core);
    const revenue = /\brevenue[ -](?:intelligence|analytics)\b/i.test(core);
    if (framework) { score += THESIS_WEIGHTS.agents.agenticFramework; reasons.push("Core product describes an agentic framework or workflow platform."); }
    if (orchestration) { score += THESIS_WEIGHTS.agents.llmOrchestration; reasons.push("Core product describes LLM orchestration or framework tooling."); }
    if (revenue) { score += THESIS_WEIGHTS.agents.revenueIntelligence; reasons.push("Core product explicitly targets revenue intelligence."); }
    matched = framework || orchestration || revenue;
    if (!matched) reasons.push("No qualifying framework, revenue-intelligence, or LLM-orchestration evidence in the core product description.");
  } else {
    const weights = THESIS_WEIGHTS.physical;
    const physical = profile.targetSector === "Physical AI";
    const robotics = /\brobots?\b|\brobotics\b|\bphysical ai\b|\bembodied (?:ai|intelligence)\b/i.test(core);
    const perception = /\bsensors?\b|\bperception\b|\blidar\b|\bcomputer vision\b/i.test(core);
    const hardware = /\bactuators?\b|\brobot(?:ic)? hardware\b|\bgrippers?\b/i.test(core);
    if (physical) { score += weights.sector; reasons.push(profile.sectorIsInferred ? "Classified in the physical-AI display group; classification is provisional." : "Physical-AI sector classification."); }
    if (robotics) { score += weights.robotics; reasons.push("Core product describes robotics or embodied AI."); }
    if (perception) { score += weights.perception; reasons.push("Core product describes sensors or perception."); }
    if (hardware) { score += weights.robotHardware; reasons.push("Core product describes robotic hardware or actuators."); }
    matched = physical || robotics || perception || hardware;
    if (!matched) reasons.push("No direct physical-AI, robotics-hardware, or sensor-perception fit identified.");
  }
  return { thesis: name, ruleVersion: THESIS_RULE_VERSION, score: Math.min(100, score), matched, reasons, unknowns, monthlyCommits: commits };
}

/** Everywhere/Plug & Play prioritize; AI Agents strictly excludes non-matches. */
export function filterByThesis(profiles: StartupProfile[], thesis: string): ThesisRankedProfile[] {
  const name = normalizeThesis(thesis);
  return profiles.map((profile, index) => ({ profile, index, assessment: assessThesis(profile, name) }))
    .filter(({ assessment }) => name !== "AI Agents" || assessment.matched)
    .sort((left, right) => right.assessment.score - left.assessment.score || right.profile.signalScore - left.profile.signalScore || left.index - right.index)
    .map(({ profile, assessment }) => ({ ...structuredClone(profile), thesisScore: assessment.score, thesisMatch: assessment }));
}
