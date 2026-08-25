# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences share one codebase.

**Listeners** arrive by link, unauthenticated, and want to hear a curated collection. They land on `/` to browse public Playlists, pick one, and play it through. A shared link (`/?playlist=<id>`) opens only that Playlist — not the rest of the shelf. They never sign in, never upload, and never see storage details. Sharing a Playlist is a link, not an account.

**Admins (curators)** sign in at `/admin/login` with email + password. They upload Tunes, arrange them onto Playlists in a deliberate order, and control who can see each Playlist. Curation is careful, low-volume, and repeated: this is a shelf someone tends, not a firehose someone ingests. There is no self-serve signup — the first admin is created by `npm run db:seed`.

## Product Purpose

SoundShelf publishes and plays curated audio Playlists. An admin uploads audio, orders it, and publishes; a listener opens a link and hears exactly the sequence the curator intended. Success is a listener playing a Playlist through in the intended order, and a curator being able to publish or unpublish without ceremony.

## Positioning

Curation is the product, not discovery. There is no algorithm, no recommendation, no infinite feed, no social layer, no user accounts for listeners. The ordered Playlist is the authored artifact and its Position sequence is meaningful — this is the mechanism a feed-driven audio product structurally cannot copy.

Each Playlist carries its own **mood hue**, derived deterministically from its id (`src/lib/mood.ts`). The identity of a Playlist is visual as well as textual, and it stays stable across sessions and across shared links without any stored field. **The user confirmed this mechanism is binding and survives the 2026-08-25 redesign.**

## Operating Context

- **Listener:** one page. Browse public Playlists, select, play, scrub, skip, adjust volume, copy a share link. Frequently a background activity in another tab — playback state must stay legible at a glance and survive being ignored.
- **Curator:** the `/admin` Studio, a persistent shell with a sidebar. Three jobs: `/admin/tunes` (upload audio, manage the library, delete), `/admin/playlists` (create Playlists, set Visibility), and `/admin/playlists/[playlistId]` (order a Playlist's items, add and remove Tunes). A Tune can be added to Playlists in bulk from the library table.
- Uploads are real files over the network with real failure modes: size limits (`MAX_AUDIO_UPLOAD_BYTES`, default 50 MiB), MIME validation, duration probing, and R2 round trips. Progress and failure are part of the job, not edge cases.
- Deleting a Tune removes the database record first, then the R2 object. When R2 cleanup fails the API returns a warning the Studio must surface — a partial success is a real, reachable state.

## Capabilities and Constraints

**Terminology is fixed** and defined in `CONTEXT.md`; UI copy must follow it: **Tune** (the uploaded audio file), **Playlist** (ordered collection with a Visibility), **PlaylistItem** (one Tune on one Playlist at one Position), **Position** (zero-based, contiguous after every change), **Visibility** (`hidden` | `public`), **Track** (the listener-facing view of a PlaylistItem — title, duration, playable URL, never storage keys). Avoid "album", "queue", "song", "draft", "published", "track" on the curation side.

- A Playlist is listed and playable to a listener only when Visibility is `public` **and** it has at least one PlaylistItem. A hidden Playlist id and an unknown id are indistinguishable to a listener.
- A Tune appears at most once on a given Playlist.
- Stack: Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-first `@theme`), TypeScript, Prisma 7 + PostgreSQL, Better Auth (admin sessions), Cloudflare R2 for audio, TanStack Query, lucide-react icons.
- `AGENTS.md` requires reading `node_modules/next/dist/docs/` before writing framework code; this Next.js differs from training data.
- **Confirmed 2026-08-25:** the interface must support **both light and dark themes**. The incumbent is dark-only and hard-codes `color-scheme: dark`.
- Test suites cover playback, membership, admin HTTP, and E2E login flows. Redesign must not break them; several assert on rendered text and roles.

## Brand Commitments

- Name: **SoundShelf**. Confirmed and unchanged.
- Per-Playlist mood hue as an identity mechanism (see Positioning). Confirmed binding.
- Tagline, confirmed 2026-08-25: "Curated audio, in the order it was meant to be heard." It ships in `src/app/layout.tsx` metadata. The vinyl-brief line "Curated audio, beautifully played." is discarded with that world.
- No logo file exists. The brand mark is drawn in code (`src/components/ui/brand-icon.tsx`).

**Explicitly discarded 2026-08-25:** the "late-night vinyl listening room" visual world — warm midnight ground, honey→ember gradients, Fraunces serif display, film grain, glass panels, spinning vinyl. The user asked for modern, minimalist and sleek. Do not rebuild it.

## Evidence on Hand

- No demo content exists. `prisma/seed.ts` creates only an admin account — no Tunes, no Playlists. Every screenshot and empty state must therefore be authored or clearly labeled synthetic.
- No testimonials, customers, pricing, usage numbers, press, or case studies exist. Do not invent any.
- No brand photography, illustration, or audio assets. `public/` contains only `favicon.ico`.
- Real, verifiable product facts live in `README.md` (deployment, R2, seeding) and `CONTEXT.md` (domain language).

## Product Principles

1. **The order is the authorship.** Position is meaningful everywhere it appears; never present a Playlist in a way that implies shuffle or ranking.
2. **A listener never meets the machinery.** Storage keys, MIME types, byte sizes, Visibility, and admin concepts stay on the admin side of the wall.
3. **Curation is deliberate and low-volume.** Optimize the Studio for care and correctness over bulk throughput.
4. **Partial failure is a real state.** Uploads, duration probing, and R2 cleanup fail in ways the Studio must show honestly rather than swallow.
5. **A Playlist has an identity.** The mood hue is the product's one distinctive visual mechanism; it must survive any restyling.

## Accessibility & Inclusion

No product-specific standard was established. Baseline obligations that follow from the product itself: transport controls must be keyboard-operable and labeled; playback state must be conveyed by more than the mood hue alone; both themes must hold contrast; the existing `prefers-reduced-motion` handling must be preserved.
