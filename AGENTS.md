<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SoundShelf

Curated audio Playlists: admins upload Tunes, order them, and set Visibility; listeners play public Playlists in that order.

**Stack:** Node.js 24, TypeScript 6.x, Next.js 16.3 (App Router), React 19, Tailwind CSS 4, Prisma 7 + PostgreSQL 17, Better Auth 1.7, Cloudflare R2, Vitest 4, Playwright 1.62. Package manager: **npm**. Single package.

Read `CONTEXT.md` (domain terms), `PRODUCT.md` (constraints), `DESIGN.md` (UI), and `node_modules/next/dist/docs/` before writing Next.js code.

## Commands

```bash
npm ci
cp .env.example .env
docker compose up postgres          # host port 5434 via docker-compose.override.yml
npm run db:generate && npm run db:migrate
npm run db:seed                     # requires ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
npm run dev                         # http://localhost:3000
npm run build                       # prisma generate && next build
npm run lint
npm run typecheck
npm test
npm test -- tests/unit/format.test.ts
npm run test:e2e
npm run test:e2e -- tests/e2e/admin-login.spec.ts
```

`tests/integration/` needs Postgres (`soundshelf_test`); E2E uses `soundshelf_e2e`. Start Compose first. Do not run `db:migrate` unless a schema change is approved.

## Git Workflow

- Create a feature branch before writing code: `git checkout -b feature/[name]`
- Never commit directly to `main`
- Commit after every new function or meaningful change
- Conventional Commits: `type(scope): description` (e.g. `feat(auth): add login flow`)

## Code Quality Gates

Before marking any task complete, run `npm run lint && npm run typecheck && npm test` and fix all errors in files you created or modified. For UI, auth, or playback work, also run `npm run test:e2e`.

## Development Practices

Write secure, modular, readable code. Write tests for each new function and run them immediately. Iterate until tests pass, then remove throwaway scripts. Commit per function.

## Code Style

Prefer clean, simple, modular code over clever abstractions. Follow existing patterns. Read files in full before editing. Path alias: `@/*` → `src/*`. Use domain words from `CONTEXT.md` (Tune, Playlist, PlaylistItem, Position, Visibility; Track is listener-facing only). Markdown: fenced code blocks with language tags.

## Code Documentation

Self-documenting names. Comments only for non-obvious *why*, short and in plain language. Update or remove comments when the code changes.

## Plan Mode

When asked to plan, write `tasks/TASK_NAME.md` with implementation steps, reasoning, and a task list. Keep it MVP-focused. End with unresolved questions. Wait for approval before implementing.

## During Implementation

Keep `tasks/TASK_NAME.md` updated. After each completed task, append what changed so a later agent can pick up.

## Boundaries — Never Do

- Commit secrets, API keys, credentials, or `.env`
- Modify `node_modules/`, `package-lock.json`, `.next/`, or other build output
- Change `prisma/schema.prisma` or `prisma/migrations/` without explicit approval
- Delete or weaken tests without explicit approval
- Add a dependency if an existing one already solves it
- Store uploaded audio on disk (R2 is the source of truth)
- Add `middleware.ts` — Next.js 16 uses `src/proxy.ts`
- Bump eslint to 10, TypeScript to 7, or Prisma to 8; do not run `npm audit fix` (see `package.json` `maintenanceNotes` / `overridesNote`)

## Where to Look

- `src/app/` — `/` listener, `/admin` Studio, `api/admin`, `api/public`, `api/auth/[...all]`
- `src/components/{admin,player,ui}/` — Studio UI, listener player, brand/theme
- `src/lib/playlists/` — membership writes, public serialization, admin parsers
- `src/lib/playlist/playback.ts` — listener playback helpers (singular path on purpose)
- `src/lib/http/errors.ts` — `requireAdminSession`, `enforceSameOrigin`, `recordAudit`
- `src/proxy.ts` — cookie-presence redirect for `/admin/:path*` (not full auth)
- `prisma/schema.prisma` + `prisma.config.ts` — models; datasource URL is in the config file
- `tests/{unit,integration,e2e}/` — Vitest, Postgres membership tests, Playwright

```bash
rg -n "export async function (GET|POST|PATCH|PUT|DELETE)" src/app/api
rg -n "status: \"" src/lib/playlists/membership.ts
rg -n "requireAdminSession|enforceSameOrigin" src/app/api
```

**Conventions:** mutating admin routes (example: `src/app/api/admin/playlists/[playlistId]/items/route.ts`) run `enforceSameOrigin` then `requireAdminSession`, then a domain function that returns `{ status }`. Membership verbs live only in `src/lib/playlists/membership.ts` (`append`/`move`/`remove`/`bulkAdd`/`sync`, injected `PrismaClient`). `context.params` is a `Promise`. Route handlers set `runtime = "nodejs"`. Hidden and unknown Playlist ids are the same 404 to listeners. Tune delete: DB row first, then R2; HTTP 202 if storage cleanup fails. Seed `Account.issuer` with `createLocalAccountIssuer("credential")` (`prisma/seed.ts`). Host Postgres is port **5434**, not 5432.
