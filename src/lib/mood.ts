/**
 * Per-Playlist mood: a deterministic hue derived from the Playlist id.
 *
 * The hue is SoundShelf's one chromatic element. It behaves like a shelf tab
 * in a physical catalogue — it marks which holding you are looking at, and it
 * is the same mark wherever that Playlist appears (row, register, scrub fill,
 * Studio). Nothing else on the surface is coloured.
 *
 * Only the hue angle travels in the DOM. Saturation and lightness are theme
 * parameters declared in globals.css, because a hue readable on white is not
 * the same hue readable on near-black, and the tab and the text need
 * different treatments of the same colour. See `--mood-*` there.
 *
 * The hash and the hue stops are unchanged from the previous visual system on
 * purpose: an existing Playlist keeps the hue its listeners already associate
 * with it, even though everything around it has been rebuilt.
 */

const HUE_STOPS = [36, 22, 4, 332, 280, 220, 188, 144, 56] as const;

/** Hue used before a Playlist is chosen. */
const NEUTRAL_HUE = 220;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type MoodColors = {
  /** Primary hue, in degrees. */
  hue: number;
  /** Inline custom properties to spread onto a wrapper element. */
  cssVars: { "--mood-h": string };
};

export function getMood(id: string | null | undefined): MoodColors {
  const hue = id ? HUE_STOPS[hash(id) % HUE_STOPS.length] : NEUTRAL_HUE;

  return { hue, cssVars: { "--mood-h": String(hue) } };
}
