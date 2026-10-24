"use client";

import type { ThesisData } from "@/lib/thesisTypes";

/** First readback arrives at this many actions, then every this many. Must match the service. */
const READBACK_EVERY = 10;
const MAX_BARS = 6;

function Bar({ name, weight, max }: { name: string; weight: number; max: number }) {
  const share = Math.min(1, Math.abs(weight) / max) * 50; // each side of the centre line is 50%
  const positive = weight >= 0;
  return (
    <li className="grid grid-cols-[1fr_96px] items-center gap-3 text-xs">
      <span className="truncate text-gray-600" title={name}>
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </span>
      <span
        className="relative h-2 rounded-full bg-gray-100"
        role="img"
        aria-label={`${name}: ${positive ? "leans toward" : "leans away from"} (${weight.toFixed(2)})`}
      >
        <span className="absolute left-1/2 top-[-2px] h-3 w-px bg-gray-300" />
        <span
          className={`absolute top-0 h-full rounded-full transition-[width,left] duration-300 motion-reduce:transition-none ${positive ? "bg-emerald-500" : "bg-[#FF385C]"}`}
          style={positive ? { left: "50%", width: `${share}%` } : { left: `${50 - share}%`, width: `${share}%` }}
        />
      </span>
    </li>
  );
}

export default function ThesisPanel({ data }: { data: ThesisData | null }) {
  const weights = Object.entries(data?.weights ?? {})
    .filter(([, w]) => Math.abs(w) >= 0.005)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, MAX_BARS);
  const max = Math.max(...weights.map(([, w]) => Math.abs(w)), 0.01);
  const n = data?.n_actions ?? 0;

  let readback: React.ReactNode;
  if (data?.readback_pending) {
    // Shown in place of the old text, so a stale readback is never mistaken for the new one.
    readback = (
      <p className="flex items-center gap-2 text-sm text-gray-500" role="status">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-[#FF385C]" aria-hidden="true" />
        Reading your swipes…
      </p>
    );
  } else if (data?.readback) {
    readback = <p className="text-sm leading-relaxed text-gray-800">{data.readback}</p>;
  } else if (data?.readback_error) {
    readback = <p className="text-xs text-amber-600">Readback failed: {data.readback_error}</p>;
  } else {
    const left = Math.max(0, READBACK_EVERY - n);
    readback = (
      <p className="text-sm text-gray-500">
        {left > 0 ? `Act on ${left} more ${left === 1 ? "company" : "companies"} and your filter appears here.` : "Your filter appears after the next batch of actions."}
      </p>
    );
  }

  return (
    <section className="border-b border-gray-200 py-5" aria-label="Your thesis">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Your thesis</h3>
        <span className="text-[11px] font-medium text-gray-400">{n} {n === 1 ? "action" : "actions"}</span>
      </div>
      <p className="mb-2 text-[11px] font-medium text-gray-500">{data?.mode === "demo" ? "Starting preferences" : data?.mode === "learned" ? "Learned from session feedback" : "Session feedback"}</p>
      <div aria-live="polite" aria-atomic="true">{readback}</div>
      {data?.readback_error && data.readback && <p className="mt-2 text-xs text-amber-600">Latest readback failed: {data.readback_error}</p>}

      <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">What the model weighs</h3>
      {weights.length ? (
        <ul className="flex flex-col gap-2">
          {weights.map(([name, w]) => (
            <Bar key={name} name={name} weight={w} max={max} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">Weights appear once you have saved one company and passed on another.</p>
      )}
    </section>
  );
}
