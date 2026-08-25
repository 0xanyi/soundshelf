import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoundShelf — Curated audio, in the order it was meant to be heard",
  description:
    "A register of curated audio Playlists. Every Playlist is filed under a shelfmark, listed with its running time, and played in the order its curator set.",
};

/**
 * One family, two axes. Archivo carries headings, register rows, controls and
 * data; the `wdth` axis supplies the narrow column voice that a second family
 * would otherwise be hired for, and its tabular figures are what make the
 * running-time columns align.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

/**
 * Resolve the theme before first paint. Reads the stored preference, falls
 * back to the OS setting, and writes the class synchronously so a dark-mode
 * listener never gets a white flash on load.
 */
const themeScript = `(function(){try{var s=localStorage.getItem("soundshelf-theme");var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.theme=s||"system";}catch(e){}})();`;

/**
 * The direction contract this build is held to. It ships in the emitted HTML
 * rather than living only in source, so the finish review can audit the built
 * page against what was promised. Grep the production output for the seed key
 * to confirm it survived the build.
 */
const directionContract = `
THESIS: A Playlist is a catalogued holding. Refuses the cover-art grid and the floating player card this category always ships: SoundShelf stores no artwork, so identity is a shelfmark, a hue tab and exact figures.
OWN-WORLD: Achromatic ground, 1px hairlines, Archivo at two widths, tabular figures on every quantity. No cards, panels, boxes or meaningful shadows; 2px radii. One deterministic hue per Playlist with text-safe and fill variants per theme. Light and dark, both first-class.
STORY: A listener reads an ordered register, sees what each Playlist holds and how long it runs, and plays it in the curator's order.
FIRST VIEWPORT: Wordmark and holdings figure top-left; Playlist rows beneath on the register measure, shelfmark and tab leading, open title in mood-ink, item count and running time right-aligned on the same baseline, hairline between each. Fixed transport register at the foot.
FORM: Shelfmark; candidate 4 of the grounded list; seed key b41e20a2.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script>{themeScript}</script>
      </head>
      <body className="font-sans">
        <script type="text/impeccable-contract">{directionContract}</script>
        {children}
      </body>
    </html>
  );
}
