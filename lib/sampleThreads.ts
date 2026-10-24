export interface SampleThread {
  id: string;
  name: string;
  org: string;
  preview: string;
  time: string;
  unread?: boolean;
}

/**
 * Placeholder conversations shown in the inbox, labeled "Sample" in the UI.
 * Names and organizations come from the Deal Flow event's judges and sponsors.
 * The messages are invented sample text, not real correspondence.
 */
export const SAMPLE_THREADS: readonly SampleThread[] = [
  { id: "s-akta", name: "akta.pro", org: "Signals", preview: "Signal sync finished: 50 companies pulled for your thesis.", time: "2m", unread: true },
  { id: "s-roundtable", name: "Arjun Padmajan", org: "Roundtable", preview: "The agent handoff looks clean. Want to compare notes on message formats?", time: "9m", unread: true },
  { id: "s-plugplay", name: "Abeera Saeed", org: "Plug and Play", preview: "Enjoyed the demo. Which design partners are you talking to first?", time: "24m" },
  { id: "s-everywhere", name: "Michael Barone", org: "Everywhere Ventures", preview: "Curious how you rank pre-seed founders. Can you walk me through the signals?", time: "41m" },
  { id: "s-wand", name: "Radhika Khandelwal", org: "Wand AI", preview: "Nice agent workflow. How do you handle noisy data from sources?", time: "1h" },
  { id: "s-seedlegals", name: "SeedLegals", org: "Sponsor", preview: "Congrats on the match! Need help with the Delaware C-corp and SAFE paperwork?", time: "1h" },
  { id: "s-yaven", name: "Bettina Sosa", org: "Yaven", preview: "Love the swipe idea. Would a local-first version work for small funds?", time: "2h" },
  { id: "s-blockconvey", name: "Block Convey", org: "PRISM", preview: "Your agent trace export arrived. Everything looks healthy.", time: "3h" },
  { id: "s-nicrron", name: "Nicrron", org: "Sponsor", preview: "Usage report: your thesis readbacks ran on 65+ models without failover.", time: "4h" },
];
