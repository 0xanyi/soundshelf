/**
 * Per-playlist mood: a deterministic, warm-leaning hue derived from the id.
 *
 * The palette skews toward jewel tones and embers — amber, copper, ruby,
 * teal, indigo, violet — so the player always feels like a candlelit room
 * rather than a neon ad.
 */

const HUE_STOPS: Array<{ h: number; complement: number }> = [
  { h: 36, complement: 12 },   // honey   → ember
  { h: 22, complement: 348 },  // copper  → ruby
  { h: 4, complement: 332 },   // ruby    → magenta
  { h: 332, complement: 280 }, // magenta → violet
  { h: 280, complement: 220 }, // violet  → indigo
  { h: 220, complement: 188 }, // indigo  → teal
  { h: 188, complement: 160 }, // teal    → moss
  { h: 144, complement: 60 },  // moss    → lime
  { h: 56, complement: 28 },   // lime    → marigold
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type MoodColors = {
  /** Primary hue, degrees */
  hue: number;
  /** Complementary hue, degrees */
  hue2: number;
  /** Inline CSS variables to spread onto a wrapper element */
  cssVars: { "--mood": string; "--mood-2": string };
};

export function getMood(id: string | null | undefined): MoodColors {
  if (!id) {
    const fallback = HUE_STOPS[0];
    return {
      hue: fallback.h,
      hue2: fallback.complement,
      cssVars: {
        "--mood": `${fallback.h} 96% 62%`,
        "--mood-2": `${fallback.complement} 86% 56%`,
      },
    };
  }

  const stop = HUE_STOPS[hash(id) % HUE_STOPS.length];

  return {
    hue: stop.h,
    hue2: stop.complement,
    cssVars: {
      "--mood": `${stop.h} 92% 60%`,
      "--mood-2": `${stop.complement} 84% 56%`,
    },
  };
}
