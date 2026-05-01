import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoundShelf — Curated Audio, Beautifully Played",
  description:
    "A modern home for curated audio playlists. Listen, browse, and immerse yourself in carefully prepared collections.",
};

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const displaySerif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sans.variable} ${mono.variable} ${displaySerif.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
