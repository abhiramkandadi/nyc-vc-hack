"use client";

import { useEffect, useState } from "react";

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
        const hex = [r / w, g / w, b / w].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
        setColor(`#${hex}`);
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
