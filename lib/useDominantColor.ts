"use client";

import { useEffect, useState } from "react";

/** Pushes a color toward a vivid, mid-lightness version so the stage glow reads clearly. */
function vivid(r: number, g: number, b: number): string {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const d = max - min;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l0 = (max + min) / 2;
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  const s = Math.min(1, Math.max(0.65, s0 * 1.5));
  const l = Math.min(0.58, Math.max(0.45, l0));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r1 + m, g1 + m, b1 + m].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

/** Most prominent vivid color in an image (hex). Falls back to `fallback` until loaded or if the image can't be read. */
export function useDominantColor(src: string | undefined, fallback: string): string {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const l = (max + min) / 510;
          if (l < 0.12 || l > 0.92) continue;
          const sat = max === 0 ? 0 : (max - min) / max;
          const weight = 1 + sat * 4;
          const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
          const e = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
          e.w += weight; e.r += r * weight; e.g += g * weight; e.b += b * weight;
          buckets.set(key, e);
        }
        let best: { w: number; r: number; g: number; b: number } | null = null;
        buckets.forEach((e) => { if (!best || e.w > best.w) best = e; });
        if (!best || cancelled) return;
        const { w, r, g, b } = best as { w: number; r: number; g: number; b: number };
        setColor(vivid(r / w, g / w, b / w));
      } catch {
        // Canvas tainted (no CORS) or unreadable: keep the fallback.
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (src && color) || fallback;
}
