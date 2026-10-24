export type StartupStage = "Pre-Seed" | "Seed";
export type TargetSector = "AI Infra" | "AI Agents" | "B2B SaaS" | "Physical AI";

export interface StealthStartup {
  id: string;
  name: string;
  founderName: string;
  founderAvatar: string;
  founderImage: string;
  exCompany: string;
  founderBackground: string;
  headline: string;
  signalScore: number;
  stage: StartupStage;
  signals: [string, string, string];
  pitchSummary: string;
  targetSector: TargetSector;
  draftEmail: string;
  /** Latest akta.pro news item, present only when live hydration succeeds. */
  liveNews?: { title: string; url: string };
}

function avatar(initials: string, background: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${background}"/><text x="64" y="66" dominant-baseline="middle" text-anchor="middle" fill="#fafafa" font-family="Arial,sans-serif" font-size="42">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Seed deck used until live akta.pro signals hydrate it (see app/api/signals/route.ts).
// Portraits are placeholder photos, not verified images of these founders.
export const MOCK_STEALTH_STARTUPS: StealthStartup[] = [
  {
    id: "nyc-001",
    name: "Turnstile Robotics",
    founderName: "Elena Park",
    founderAvatar: avatar("EP", "#064e3b"),
    founderImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
    exCompany: "Boston Dynamics",
    founderBackground: "Staff Engineer, Boston Dynamics",
    headline: "Robot inspection systems for constrained urban facilities.",
    signalScore: 97,
    stage: "Pre-Seed",
    signals: ["182 GitHub commits/mo (ROS perception)", "Delaware C-Corp formed (Long Island City)", "Founding controls role posted"],
    pitchSummary: "Long Island City team building mobile inspection robots for narrow facilities, pairing ROS perception and navigation with operator-reviewed maintenance reports.",
    targetSector: "Physical AI",
    draftEmail: "Hi Elena,\n\nTurnstile Robotics' focus on constrained facilities stood out, and your Boston Dynamics background in perception and controls is exactly what we look for. Would you be open to a short conversation about your first deployment environments and how operators review inspection outcomes?\n\nBest,\nThe investment team",
  },
  {
    id: "nyc-002",
    name: "VectorLayer",
    founderName: "Maya Sethi",
    founderAvatar: avatar("MS", "#312e81"),
    founderImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800",
    exCompany: "Stripe",
    founderBackground: "Staff Infrastructure Lead, Stripe",
    headline: "GPU orchestration for enterprise AI workloads.",
    signalScore: 96,
    stage: "Seed",
    signals: ["340 GitHub commits/mo (GPU orchestration)", "Founder: ex-Stripe Staff Infra Lead", "Stealth hiring post detected"],
    pitchSummary: "Scheduling and orchestration layer that packs inference and training jobs across private and hosted GPUs, balancing latency, privacy, and cost for regulated enterprises.",
    targetSector: "AI Infra",
    draftEmail: "Hi Maya,\n\nVectorLayer's approach to GPU orchestration caught our attention, and your infrastructure leadership at Stripe is a strong signal. We would enjoy hearing how you balance latency, privacy, and cost for enterprise teams. Would you have time for a brief introduction?\n\nBest,\nThe investment team",
  },
  {
    id: "nyc-003",
    name: "Cognitive Mesh",
    founderName: "Julian Mercer",
    founderAvatar: avatar("JM", "#164e63"),
    founderImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800",
    exCompany: "Anthropic",
    founderBackground: "Research Scientist, Anthropic",
    headline: "Agentic frameworks for coordinating long-running AI workflows.",
    signalScore: 95,
    stage: "Seed",
    signals: ["420 GitHub commits/mo (agentic frameworks)", "NYC C-Corp filing detected", "Founder: ex-Anthropic Research Scientist"],
    pitchSummary: "Open framework for composing, supervising, and replaying multi-agent workflows so teams can run long-horizon tasks with clear tool boundaries and human checkpoints.",
    targetSector: "AI Agents",
    draftEmail: "Hi Julian,\n\nCognitive Mesh's take on agentic frameworks aligns closely with our thesis, and your research background at Anthropic shows in the design. Could we schedule a short call about the workflows you are prioritizing and your early adopter feedback?\n\nBest,\nThe investment team",
  },
  {
    id: "nyc-004",
    name: "AeroPulse",
    founderName: "Arjun Vora",
    founderAvatar: avatar("AV", "#713f12"),
    founderImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
    exCompany: "Tesla",
    founderBackground: "Autopilot Lead, Tesla",
    headline: "Drone-based pest and weed detection for precision agriculture.",
    signalScore: 92,
    stage: "Pre-Seed",
    signals: ["WGS84 GIS transformation code in active repos", "Founder: ex-Tesla Autopilot Lead", "Drone pest and weed detection pipeline"],
    pitchSummary: "Aerial imagery pipeline that detects pests and weeds, then georeferences findings with WGS84 GIS transformations so growers can act field by field.",
    targetSector: "Physical AI",
    draftEmail: "Hi Arjun,\n\nAeroPulse's georeferenced approach to pest and weed detection is compelling, and your Autopilot experience at Tesla maps well onto perception in the field. Would you be open to discussing your pilot growers and how detections flow into their existing GIS tools?\n\nBest,\nThe investment team",
  },
  {
    id: "nyc-005",
    name: "SimplyDeal",
    founderName: "Nadia Alvarez",
    founderAvatar: avatar("NA", "#831843"),
    founderImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
    exCompany: "Ramp",
    founderBackground: "#1 Sales Lead, Ramp",
    headline: "AI revenue intelligence for fast-moving sales teams.",
    signalScore: 89,
    stage: "Pre-Seed",
    signals: ["Pre-seed stealth signal detected", "Founder: #1 Sales Lead at Ramp", "AI revenue intelligence positioning"],
    pitchSummary: "Revenue intelligence that turns call, email, and CRM activity into deal-level guidance, built by an early sales leader who scaled Ramp's go-to-market.",
    targetSector: "B2B SaaS",
    draftEmail: "Hi Nadia,\n\nSimplyDeal's focus on revenue intelligence resonates with us, especially coming from someone who built Ramp's sales motion from the start. Could we set up a short conversation about your initial customer segment and what you are learning from early teams?\n\nBest,\nThe investment team",
  },
  {
    id: "nyc-006",
    name: "HyperTriton",
    founderName: "Theo Bennett",
    founderAvatar: avatar("TB", "#3f3f46"),
    founderImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
    exCompany: "Scale AI",
    founderBackground: "ML Infrastructure, Scale AI",
    headline: "Local edge inference and quantization for on-device models.",
    signalScore: 90,
    stage: "Pre-Seed",
    signals: ["Quantization tooling commits (edge inference)", "Founder: ex-Scale AI ML Infra", "Local inference runtime in active development"],
    pitchSummary: "Runtime and quantization toolchain that fits capable models onto local hardware, cutting latency and cloud spend for teams that need inference at the edge.",
    targetSector: "AI Infra",
    draftEmail: "Hi Theo,\n\nHyperTriton's work on local edge inference and quantization stood out, and your ML infrastructure experience at Scale AI is a strong foundation. Would you be open to a brief chat about target hardware and the workloads you are optimizing first?\n\nBest,\nThe investment team",
  },
];
