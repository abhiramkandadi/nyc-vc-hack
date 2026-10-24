export type StartupStage = "Pre-Seed" | "Seed";
export type TargetSector = "AI Infra" | "AI Agents" | "B2B SaaS" | "Physical AI";

export interface StealthStartup {
  id: string;
  name: string;
  founderName: string;
  founderAvatar: string;
  founderImage: string;
  /** Accent hex used for the ambient stage glow; derived from the id when absent. */
  themeColor?: string;
  exCompany: string;
  founderBackground: string;
  headline: string;
  signalScore: number;
  stage: StartupStage;
  signals: [string, string, string];
  pitchSummary: string;
  targetSector: TargetSector;
  draftEmail: string;
  /** Founder pitch video (YouTube/Vimeo embed or .mp4). Optional. */
  videoUrl?: string;
  /** When the source news item was published (ISO), from akta.pro data. */
  sourcePublishedAt?: string;
  /**
   * The thesis service's learned match for this company. Present only on a learned ranking.
   * `probability` is null until the model has fitted, and then the badge must stay hidden.
   */
  learnedMatch?: { probability: number | null; reasons: string[]; fitted: boolean };
  /** The source's own sector label, finer than the four-way targetSector. */
  sectorLabel?: string;
  /** Latest akta.pro news item, present only when live hydration succeeds. */
  liveNews?: { title: string; url: string };
}

/** Seeded profiles use this label where the source has no founder or former employer. */
export const NOT_DISCLOSED = "Not disclosed";
export const isDisclosed = (value?: string): boolean => !!value && value !== NOT_DISCLOSED;
/** The founder's name, or the company name when the source lists no founder. */
export const founderLabel = (s: Pick<StealthStartup, "founderName" | "name">): string => (isDisclosed(s.founderName) ? s.founderName : s.name);

export type MediaKind = "headshot" | "hq" | "hardware" | "infra";

/** Verified Unsplash media across four visual types, used when a founder image is missing or already taken. */
export const MEDIA_POOL: readonly { url: string; kind: MediaKind }[] = [
  { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1557862921-37829c790f19?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=1200", kind: "headshot" },
  { url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1625314868143-20e93ce3ff33?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200", kind: "hq" },
  { url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=1200", kind: "hardware" },
  { url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1200", kind: "infra" },
];

export const DIVERSE_MEDIA_POOL: readonly string[] = MEDIA_POOL.map((m) => m.url);

/** Headshots only, for the per-image error fallback. */
export const FALLBACK_PORTRAITS: readonly string[] = MEDIA_POOL.filter((m) => m.kind === "headshot").map((m) => m.url);

/** Recency of a founder's latest news, from real akta.pro data. Null when the date is unknown. */
export function recentActivity(s: Pick<StealthStartup, "sourcePublishedAt">): { label: string; recent: boolean } | null {
  if (!s.sourcePublishedAt) return null;
  const t = Date.parse(s.sourcePublishedAt);
  if (!Number.isFinite(t)) return null;
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  const label = days === 0 ? "today" : days === 1 ? "1d ago" : days < 60 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
  return { label, recent: days <= 60 };
}

/** The founder's pitch video URL: from the data, else the manual map in founderVideos.ts. */
export function videoFor(s: Pick<StealthStartup, "id" | "videoUrl">): string | undefined {
  return s.videoUrl || FOUNDER_VIDEOS[s.id] || undefined;
}

export function hashString(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

const THEME_PALETTE = ["#E11D48", "#8B5CF6", "#0284C7", "#D97706", "#059669", "#DB2777", "#4F46E5", "#0D9488"] as const;

export function themeColorFor(s: Pick<StealthStartup, "id" | "themeColor">): string {
  return s.themeColor || THEME_PALETTE[hashString(s.id) % THEME_PALETTE.length];
}

export function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const photoKey = (url: string): string => url.match(/photo-[\w-]+/)?.[0] ?? url;
const KIND_BY_PHOTO = new Map(MEDIA_POOL.map((m) => [photoKey(m.url), m.kind] as const));

export function mediaKindOf(url: string): MediaKind {
  return KIND_BY_PHOTO.get(photoKey(url)) ?? "headshot";
}

import { FOUNDER_PHOTOS } from "./founderPhotos";
import { FOUNDER_VIDEOS } from "./founderVideos";

export interface AssignedMedia {
  src: string;
  kind: MediaKind;
}

const SECTOR_KIND: Record<TargetSector, MediaKind> = {
  "Physical AI": "hardware",
  "AI Infra": "infra",
  "AI Agents": "infra",
  "B2B SaaS": "hq",
};

/**
 * Assigns every startup a distinct image. A valid founder image is kept unless an earlier startup already
 * uses it. Otherwise the next unused pool image is taken: headshots first, then the sector's own category,
 * then anything unused. Repeats happen only once the whole pool is used.
 */
export function assignUniquePortraits(
  startups: readonly Pick<StealthStartup, "id" | "founderImage" | "targetSector">[],
): Record<string, AssignedMedia> {
  const used = new Set<string>();
  const out: Record<string, AssignedMedia> = {};
  for (const s of startups) {
    const real = FOUNDER_PHOTOS[s.id];
    if (real) out[s.id] = { src: real, kind: "headshot" };
  }
  for (const s of startups) {
    if (out[s.id]) continue;
    if (isValidUrl(s.founderImage) && !used.has(photoKey(s.founderImage))) {
      used.add(photoKey(s.founderImage));
      out[s.id] = { src: s.founderImage, kind: mediaKindOf(s.founderImage) };
    }
  }
  for (const s of startups) {
    if (out[s.id]) continue;
    const sector = SECTOR_KIND[s.targetSector] ?? "headshot";
    const order = [
      ...MEDIA_POOL.filter((m) => m.kind === "headshot"),
      ...MEDIA_POOL.filter((m) => m.kind === sector),
      ...MEDIA_POOL,
    ];
    const free = order.filter((m) => !used.has(photoKey(m.url)));
    const list = free.length ? free : MEDIA_POOL;
    const pick = list[hashString(s.id) % Math.min(list.length, free.length ? 4 : list.length)];
    used.add(photoKey(pick.url));
    out[s.id] = { src: pick.url, kind: pick.kind };
  }
  return out;
}

/** Deterministic headshot fallback for a single broken image. */
export function fallbackPortrait(key: string): string {
  return FALLBACK_PORTRAITS[hashString(key) % FALLBACK_PORTRAITS.length];
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
