# Prayer Tunes Implementation Plan

> **Status (2026-05-02):** This plan is **superseded**. The dashboard refactor on
> branch `refactor/admin-dashboard-simplify` removed the `Tune.status` /
> `Playlist.status` enums (songs go live on upload, playlists are gated by a
> `Playlist.visibility` flag with default `hidden`) and dropped
> `Tune.description`. Treat this document as historical context only; the
> source of truth is `prisma/schema.prisma` and the routes under
> `src/app/api/admin`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Docker-deployable Next.js app where public users play published prayer-tune playlists and admins upload/manage tunes and playlists.

**Architecture:** Use a single Next.js App Router application with public routes, protected admin routes, Better Auth for admin sessions, Prisma/PostgreSQL for metadata, and Cloudflare R2 for audio objects. Keep audio bytes out of the app container; store object keys in the database and generate signed R2 playback URLs for public player use.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Better Auth, Cloudflare R2 via `@aws-sdk/client-s3`, TanStack Query for admin data flows, Vitest, Testing Library, Playwright, Docker/Dokploy.

---

## File Structure

Create this project structure:

- `package.json`: scripts and dependencies.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: TypeScript configuration.
- `postcss.config.mjs`: Tailwind/PostCSS wiring.
- `tailwind.config.ts`: app design tokens.
- `Dockerfile`: production app image for Dokploy.
- `docker-compose.yml`: local app, database, and optional MinIO-compatible development storage.
- `.env.example`: required runtime configuration.
- `prisma/schema.prisma`: database schema for admins, tunes, playlists, playlist items, and Better Auth tables.
- `prisma/seed.ts`: local admin seed data.
- `src/app/layout.tsx`: root layout.
- `src/app/page.tsx`: public playlist/player screen.
- `src/app/admin/layout.tsx`: protected admin shell.
- `src/app/admin/page.tsx`: admin overview.
- `src/app/admin/login/page.tsx`: admin login.
- `src/app/admin/tunes/page.tsx`: tunes library and upload entry point.
- `src/app/admin/playlists/page.tsx`: playlist list.
- `src/app/admin/playlists/[playlistId]/page.tsx`: playlist editor.
- `src/app/api/auth/[...all]/route.ts`: Better Auth route handler.
- `src/app/api/admin/tunes/route.ts`: admin tune list/create endpoints.
- `src/app/api/admin/tunes/[tuneId]/route.ts`: admin tune update/delete endpoints.
- `src/app/api/admin/tunes/upload/route.ts`: authenticated upload endpoint.
- `src/app/api/admin/playlists/route.ts`: admin playlist list/create endpoints.
- `src/app/api/admin/playlists/[playlistId]/route.ts`: admin playlist update/delete endpoints.
- `src/app/api/admin/playlists/[playlistId]/items/route.ts`: playlist item add/reorder/remove endpoint.
- `src/app/api/public/playlists/route.ts`: published playlist list endpoint.
- `src/app/api/public/playlists/[playlistId]/route.ts`: published playlist detail with signed playback URLs.
- `src/components/player/audio-player.tsx`: public audio player UI/state.
- `src/components/player/playlist-browser.tsx`: public playlist and track list.
- `src/components/admin/admin-nav.tsx`: admin navigation shell.
- `src/components/admin/tune-upload-form.tsx`: file upload form.
- `src/components/admin/playlist-editor.tsx`: playlist item manager.
- `src/lib/auth.ts`: Better Auth configuration.
- `src/lib/db.ts`: Prisma client singleton.
- `src/lib/r2.ts`: R2 S3 client and signed URL helpers.
- `src/lib/validation/audio.ts`: file validation constants/helpers.
- `src/lib/playlist/playback.ts`: pure playback next-track logic.
- `src/lib/playlist/order.ts`: pure playlist reorder helpers.
- `src/lib/http/errors.ts`: API error response helpers.
- `src/middleware.ts`: route protection for `/admin`.
- `tests/unit/playback.test.ts`: playback behavior tests.
- `tests/unit/order.test.ts`: playlist ordering tests.
- `tests/unit/audio-validation.test.ts`: upload validation tests.
- `tests/integration/public-playlists.test.ts`: public filtering behavior.
- `tests/e2e/admin-public-flow.spec.ts`: admin create/publish and public playback smoke flow.

## Task 1: Scaffold The Next.js App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.env.example`

- [ ] **Step 1: Initialize package metadata**

Create `package.json` with these scripts:

```json
{
  "name": "prayer-tunes",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install next react react-dom @prisma/client better-auth @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @tanstack/react-query zod lucide-react clsx
npm install -D typescript @types/node @types/react @types/react-dom prisma tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom playwright tsx eslint eslint-config-next
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 3: Add baseline configuration files**

Create standard Next.js TypeScript, Tailwind, and PostCSS config files. Set `experimental.typedRoutes` to `true` in `next.config.ts`.

- [ ] **Step 4: Add root layout and placeholder public page**

Create `src/app/layout.tsx` with metadata and global CSS import. Create `src/app/page.tsx` returning a simple public player placeholder with heading `Prayer Tunes`.

- [ ] **Step 5: Verify scaffold**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts src/app .env.example
git commit -m "chore: scaffold next app"
```

## Task 2: Add Database Schema And Prisma Client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Modify: `.env.example`

- [ ] **Step 1: Define Prisma models**

Create `prisma/schema.prisma` with PostgreSQL datasource and models: `User`, `Session`, `Account`, `Verification`, `Tune`, `Playlist`, and `PlaylistItem`. Add enums `TuneStatus { draft active }` and `PlaylistStatus { draft published }`. Add a unique index on `PlaylistItem(playlistId, position)`.

- [ ] **Step 2: Add Prisma client singleton**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 3: Add environment documentation**

Add these variables to `.env.example`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prayer_tunes"
BETTER_AUTH_SECRET="replace-with-a-strong-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
MAX_AUDIO_UPLOAD_BYTES="52428800"
```

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
npm run db:generate
```

Expected: Prisma client generation succeeds.

- [ ] **Step 5: Commit**

Run:

```bash
git add prisma src/lib/db.ts .env.example package.json package-lock.json
git commit -m "feat: add prisma data model"
```

## Task 3: Add Pure Domain Logic With Tests

**Files:**
- Create: `src/lib/playlist/playback.ts`
- Create: `src/lib/playlist/order.ts`
- Create: `src/lib/validation/audio.ts`
- Create: `tests/unit/playback.test.ts`
- Create: `tests/unit/order.test.ts`
- Create: `tests/unit/audio-validation.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write playback tests**

Test these cases in `tests/unit/playback.test.ts`: advance to next track, stop at end, loop playlist at end, repeat current track, handle empty playlist by returning `null`.

- [ ] **Step 2: Implement playback helper**

Create `getNextTrackIndex({ currentIndex, trackCount, repeatMode })` in `src/lib/playlist/playback.ts`, where `repeatMode` is `"off" | "track" | "playlist"`.

- [ ] **Step 3: Write ordering tests**

Test that `normalizePositions([{ id: "b", position: 10 }, { id: "a", position: 5 }])` returns items sorted by position with positions `0` and `1`. Test that `moveItem(items, "a", 2)` moves the item and normalizes positions.

- [ ] **Step 4: Implement ordering helpers**

Create `normalizePositions` and `moveItem` in `src/lib/playlist/order.ts`.

- [ ] **Step 5: Write audio validation tests**

Test that MP3 is accepted, PDF is rejected, and files above `MAX_AUDIO_UPLOAD_BYTES` are rejected.

- [ ] **Step 6: Implement audio validation**

Create `ALLOWED_AUDIO_TYPES`, `getMaxAudioUploadBytes`, and `validateAudioFileMetadata` in `src/lib/validation/audio.ts`.

- [ ] **Step 7: Run tests**

Run:

```bash
npm run test -- tests/unit
```

Expected: all unit tests pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/playlist src/lib/validation tests/unit vitest.config.ts package.json package-lock.json
git commit -m "feat: add playlist and audio validation logic"
```

## Task 4: Configure Better Auth And Admin Protection

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/admin-nav.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Configure Better Auth**

Create `src/lib/auth.ts` using Better Auth with Prisma adapter and email/password enabled for admin accounts.

- [ ] **Step 2: Add auth route handler**

Create `src/app/api/auth/[...all]/route.ts` exporting GET and POST handlers from the Better Auth instance.

- [ ] **Step 3: Protect admin routes**

Create `src/middleware.ts` that redirects unauthenticated `/admin` requests to `/admin/login`, while allowing `/admin/login` and `/api/auth`.

- [ ] **Step 4: Add admin login page**

Create an email/password login form that posts through the Better Auth client and redirects to `/admin` on success.

- [ ] **Step 5: Add admin shell**

Create `src/app/admin/layout.tsx`, `src/components/admin/admin-nav.tsx`, and `src/app/admin/page.tsx` with links to Tunes and Playlists.

- [ ] **Step 6: Verify auth build**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/auth.ts src/app/api/auth src/middleware.ts src/app/admin src/components/admin package.json package-lock.json
git commit -m "feat: add admin authentication"
```

## Task 5: Add R2 Storage Helpers And Upload Endpoint

**Files:**
- Create: `src/lib/r2.ts`
- Create: `src/lib/http/errors.ts`
- Create: `src/app/api/admin/tunes/upload/route.ts`
- Test: `tests/unit/audio-validation.test.ts`

- [ ] **Step 1: Add R2 helper**

Create `src/lib/r2.ts` with:

- `r2Client`
- `putAudioObject({ key, body, contentType })`
- `getSignedAudioUrl(key)`
- `buildTuneObjectKey(fileName)`

Use `S3Client`, `PutObjectCommand`, `GetObjectCommand`, and `getSignedUrl`.

- [ ] **Step 2: Add API error helpers**

Create `jsonError(message, status)` and `requireAdminSession()` helpers in `src/lib/http/errors.ts` or split session logic into `src/lib/auth-session.ts` if Better Auth requires framework-specific request handling.

- [ ] **Step 3: Add upload endpoint**

Create `src/app/api/admin/tunes/upload/route.ts` that accepts `multipart/form-data`, validates admin session, validates audio metadata, uploads to R2, creates a `Tune` record with `draft` status, and returns the created tune.

- [ ] **Step 4: Verify upload endpoint types**

Run:

```bash
npm run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/r2.ts src/lib/http src/app/api/admin/tunes/upload package.json package-lock.json
git commit -m "feat: add r2 tune upload endpoint"
```

## Task 6: Build Admin Tune Management

**Files:**
- Create: `src/app/api/admin/tunes/route.ts`
- Create: `src/app/api/admin/tunes/[tuneId]/route.ts`
- Create: `src/app/admin/tunes/page.tsx`
- Create: `src/components/admin/tune-upload-form.tsx`

- [ ] **Step 1: Add admin tune APIs**

Implement:

- `GET /api/admin/tunes`: list tunes ordered by newest first.
- `PATCH /api/admin/tunes/[tuneId]`: update title, description, and status.
- `DELETE /api/admin/tunes/[tuneId]`: block deletion when the tune is referenced by any `PlaylistItem`; otherwise delete the tune record.

- [ ] **Step 2: Add upload form component**

Create a client component that submits a selected audio file to `/api/admin/tunes/upload`, shows upload progress state, and refreshes the tunes list after success.

- [ ] **Step 3: Add tunes admin page**

Create `/admin/tunes` with upload form, tunes table, draft/active status controls, edit fields, and delete button with disabled state when a tune is in use.

- [ ] **Step 4: Verify admin tune flow manually**

Run:

```bash
npm run dev
```

Open `http://localhost:3000/admin/tunes`, log in, upload an MP3, edit the title, mark active, and confirm the row updates.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/api/admin/tunes src/app/admin/tunes src/components/admin/tune-upload-form.tsx
git commit -m "feat: add admin tune management"
```

## Task 7: Build Admin Playlist Management

**Files:**
- Create: `src/app/api/admin/playlists/route.ts`
- Create: `src/app/api/admin/playlists/[playlistId]/route.ts`
- Create: `src/app/api/admin/playlists/[playlistId]/items/route.ts`
- Create: `src/app/admin/playlists/page.tsx`
- Create: `src/app/admin/playlists/[playlistId]/page.tsx`
- Create: `src/components/admin/playlist-editor.tsx`

- [ ] **Step 1: Add playlist APIs**

Implement:

- `GET /api/admin/playlists`
- `POST /api/admin/playlists`
- `PATCH /api/admin/playlists/[playlistId]`
- `DELETE /api/admin/playlists/[playlistId]`
- `POST /api/admin/playlists/[playlistId]/items`
- `PATCH /api/admin/playlists/[playlistId]/items`
- `DELETE /api/admin/playlists/[playlistId]/items`

Use `normalizePositions` and `moveItem` for item order updates.

- [ ] **Step 2: Add playlists list page**

Create `/admin/playlists` with create form, playlist table, status controls, and edit links.

- [ ] **Step 3: Add playlist editor**

Create `/admin/playlists/[playlistId]` with editable title/description/status, current ordered items, add-tune selector limited to active tunes, remove item control, and move up/down controls.

- [ ] **Step 4: Verify playlist admin flow manually**

Run:

```bash
npm run dev
```

Create a playlist, add two active tunes, reorder them, publish the playlist, refresh, and confirm order persists.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/api/admin/playlists src/app/admin/playlists src/components/admin/playlist-editor.tsx
git commit -m "feat: add admin playlist management"
```

## Task 8: Build Public Playlist API And Player UI

**Files:**
- Create: `src/app/api/public/playlists/route.ts`
- Create: `src/app/api/public/playlists/[playlistId]/route.ts`
- Create: `src/components/player/audio-player.tsx`
- Create: `src/components/player/playlist-browser.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add public playlist APIs**

Implement:

- `GET /api/public/playlists`: return published playlists with item counts.
- `GET /api/public/playlists/[playlistId]`: return one published playlist with ordered active tunes and signed R2 URLs.

Do not return draft playlists or inactive tunes.

- [ ] **Step 2: Add public playlist browser**

Create a client component that loads playlists, selects a playlist, renders track list, and passes tracks to the player.

- [ ] **Step 3: Add audio player**

Create player controls for play/pause, previous, next, seek, volume, repeat off, repeat track, and repeat playlist. Use `getNextTrackIndex` for track end behavior.

- [ ] **Step 4: Wire public page**

Update `src/app/page.tsx` to render the playlist browser as the first screen.

- [ ] **Step 5: Verify public playback manually**

Run:

```bash
npm run dev
```

Open `http://localhost:3000`, select a published playlist, start playback, skip tracks, and test repeat track and repeat playlist.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/api/public src/components/player src/app/page.tsx
git commit -m "feat: add public playlist player"
```

## Task 9: Add Integration And E2E Coverage

**Files:**
- Create: `tests/integration/public-playlists.test.ts`
- Create: `tests/e2e/admin-public-flow.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add public filtering integration test**

Test that draft playlists are excluded, published playlists are included, and inactive tunes inside published playlists are excluded from public output.

- [ ] **Step 2: Add Playwright config**

Create `playwright.config.ts` with `baseURL: "http://localhost:3000"` and a web server command `npm run dev`.

- [ ] **Step 3: Add e2e smoke test**

Create a smoke flow that logs in as admin, creates or uses a seeded active tune, creates a playlist, publishes it, opens the public page, selects the playlist, and sees the player controls.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run test
npm run test:e2e
```

Expected: unit, integration, and e2e tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests playwright.config.ts package.json package-lock.json
git commit -m "test: cover playlist publishing flow"
```

## Task 10: Add Docker And Dokploy Readiness

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add Dockerfile**

Create a multi-stage Dockerfile that installs dependencies, runs `prisma generate`, builds Next.js, and starts with `npm run start`.

- [ ] **Step 2: Add docker-compose for local development**

Create `docker-compose.yml` with `postgres` and `app` services. Keep Cloudflare R2 as the expected object storage target; do not rely on local disk for uploaded files.

- [ ] **Step 3: Add Docker ignore file**

Ignore `node_modules`, `.next`, `.env`, test output, and local brainstorm artifacts.

- [ ] **Step 4: Add deployment README**

Document Dokploy setup: configure PostgreSQL, set environment variables, provide R2 credentials, run migrations, seed first admin, and deploy the Dockerized app.

- [ ] **Step 5: Verify production build**

Run:

```bash
npm run build
docker build -t prayer-tunes .
```

Expected: Next.js build and Docker image build pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add Dockerfile docker-compose.yml .dockerignore README.md .env.example
git commit -m "chore: add dokploy deployment setup"
```

## Final Verification

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run build`.
- [ ] Run `docker build -t prayer-tunes .`.
- [ ] Confirm no audio files are written into the repository or app container.
- [ ] Confirm public APIs only expose published playlists and active tunes.
- [ ] Confirm admin routes redirect unauthenticated users to `/admin/login`.

## Notes

- This workspace was not a git repository when the plan was created. Initialize git before executing commit steps:

```bash
git init
git add docs/superpowers/specs/2026-04-29-prayer-tunes-design.md docs/superpowers/plans/2026-04-29-prayer-tunes.md
git commit -m "docs: add prayer tunes design and plan"
```

- The first implementation task should create `.gitignore` if git is initialized. Include `.env`, `node_modules`, `.next`, `.superpowers`, and uploaded local test media in `.gitignore`.
