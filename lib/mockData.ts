export type StartupStage = "Pre-Seed" | "Seed";
export type TargetSector = "AI Infra" | "B2B SaaS" | "Physical AI";

export interface StealthStartup {
  id: string;
  name: string;
  founderName: string;
  founderAvatar: string;
  founderImage: string;
  exCompany: string;
  headline: string;
  signalScore: number;
  stage: StartupStage;
  signals: [string, string, string];
  pitchSummary: string;
  targetSector: TargetSector;
  draftEmail: string;
}

function avatar(initials: string, background: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${background}"/><text x="64" y="66" dominant-baseline="middle" text-anchor="middle" fill="#fafafa" font-family="Arial,sans-serif" font-size="42">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// founderImage values are Unsplash stock portraits used as placeholders; they are not the fictional founders.
// All identities, affiliations, scores, and akta.pro-style signals are synthetic.
// These fixtures are not provider observations or investment recommendations.
export const MOCK_STEALTH_STARTUPS: StealthStartup[] = [
  {
    id: "mock-nyc-001",
    name: "Canal Compute",
    founderName: "Maya Sethi",
    founderAvatar: avatar("MS", "#312e81"),
    founderImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800",
    exCompany: "Anthropic",
    headline: "GPU-aware inference routing for enterprise AI workloads.",
    signalScore: 98,
    stage: "Pre-Seed",
    signals: ["320 GitHub commits/mo", "Delaware C-Corp formed; Manhattan address", "2 founding infrastructure roles posted in NYC"],
    pitchSummary: "A fictional SoHo team building an inference routing layer across private GPUs and hosted models, balancing latency, privacy, and cost for regulated enterprises.",
    targetSector: "AI Infra",
    draftEmail: "Hi Maya,\n\nCanal Compute's approach to inference routing caught our attention. We would enjoy learning about your customer discovery and how you balance latency, privacy, and cost. Would you be open to a brief introduction?\n\nBest,\nThe investment team",
  },
  {
    id: "mock-nyc-002",
    name: "Ledgerline",
    founderName: "Julian Mercer",
    founderAvatar: avatar("JM", "#164e63"),
    founderImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800",
    exCompany: "Stripe",
    headline: "An exception-resolution workspace for finance operations.",
    signalScore: 94,
    stage: "Seed",
    signals: ["185 GitHub commits/mo across reconciliation connectors", "Delaware C-Corp formed; Brooklyn address", "Founding accounting integrations role posted in NYC"],
    pitchSummary: "A fictional Brooklyn company turning payment discrepancies into traceable workflows, combining reconciliation connectors, supporting evidence, and human approval for accounting teams.",
    targetSector: "B2B SaaS",
    draftEmail: "Hi Julian,\n\nLedgerline's work on reconciliation exceptions aligns with our interest in finance operations software. Could we schedule a short conversation about the workflows you are prioritizing and your early customer feedback?\n\nBest,\nThe investment team",
  },
  {
    id: "mock-nyc-003",
    name: "Turnstile Robotics",
    founderName: "Elena Park",
    founderAvatar: avatar("EP", "#064e3b"),
    founderImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
    exCompany: "Boston Dynamics",
    headline: "Robot inspection systems for constrained urban facilities.",
    signalScore: 91,
    stage: "Pre-Seed",
    signals: ["142 GitHub commits/mo across ROS perception packages", "Delaware C-Corp formed; Queens address", "Founding controls role posted in Long Island City"],
    pitchSummary: "A fictional Long Island City team designing mobile inspection systems for narrow facilities, pairing perception and navigation with operator-reviewed maintenance reports.",
    targetSector: "Physical AI",
    draftEmail: "Hi Elena,\n\nTurnstile Robotics' focus on constrained facilities is interesting to us. Would you be open to discussing your initial deployment environments and how operators review inspection outcomes?\n\nBest,\nThe investment team",
  },
  {
    id: "mock-nyc-004",
    name: "Tracewell",
    founderName: "Arjun Vora",
    founderAvatar: avatar("AV", "#713f12"),
    founderImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
    exCompany: "OpenAI",
    headline: "Reproducible evaluation and debugging for AI agents.",
    signalScore: 96,
    stage: "Seed",
    signals: ["410 GitHub commits/mo across agent evaluation tooling", "Delaware C-Corp formed; New York qualification filed", "3 founding developer tools roles posted in Manhattan"],
    pitchSummary: "A fictional Flatiron developer tools company recording tool outcomes, replaying controlled scenarios, and comparing agent behavior across model and application versions.",
    targetSector: "AI Infra",
    draftEmail: "Hi Arjun,\n\nTracewell's emphasis on reproducible agent evaluations caught our eye. We would enjoy learning how you help teams reproduce failures across changing tool and application state. Would you have time for a brief introduction?\n\nBest,\nThe investment team",
  },
  {
    id: "mock-nyc-005",
    name: "Permit House",
    founderName: "Nadia Alvarez",
    founderAvatar: avatar("NA", "#831843"),
    founderImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
    exCompany: "Ramp",
    headline: "Permitting coordination for commercial buildouts.",
    signalScore: 88,
    stage: "Pre-Seed",
    signals: ["96 GitHub commits/mo across municipal document connectors", "Delaware C-Corp formed; Manhattan address", "Founding permit operations role posted in NYC"],
    pitchSummary: "A fictional Chelsea startup building a shared workspace for contractors, architects, and commercial operators to track permit documents, ownership, deadlines, and reviewed status updates.",
    targetSector: "B2B SaaS",
    draftEmail: "Hi Nadia,\n\nPermit House's approach to commercial permitting aligns with our interest in vertical workflow software. Could we arrange a short conversation about your initial customer segment and the handoffs you are working to improve?\n\nBest,\nThe investment team",
  },
  {
    id: "mock-nyc-006",
    name: "Dockhand Systems",
    founderName: "Theo Bennett",
    founderAvatar: avatar("TB", "#3f3f46"),
    founderImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
    exCompany: "Amazon Robotics",
    headline: "Vision-assisted handling for small urban warehouses.",
    signalScore: 85,
    stage: "Pre-Seed",
    signals: ["167 GitHub commits/mo across grasp-planning repositories", "Delaware C-Corp formed; Brooklyn address", "Founding manipulation engineer role posted in Sunset Park"],
    pitchSummary: "A fictional Sunset Park team developing robotic handling software for varied packaging and limited floor space, pairing perception and grasp planning with operator intervention for uncertain picks.",
    targetSector: "Physical AI",
    draftEmail: "Hi Theo,\n\nDockhand Systems' focus on smaller urban warehouses stood out. Would you be open to sharing which handling tasks you are targeting first and how operator intervention fits into deployment?\n\nBest,\nThe investment team",
  },
];
