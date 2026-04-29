# Prayer Tunes

Prayer Tunes is a Next.js app for publishing and playing curated prayer tune playlists. PostgreSQL stores app and auth data through Prisma, Better Auth handles admin sessions, and uploaded audio stays in Cloudflare R2.

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy the environment example and fill in local values:

   ```bash
   cp .env.example .env
   ```

   `DATABASE_URL` should point at PostgreSQL. `BETTER_AUTH_SECRET` must be a strong random value of at least 32 characters. R2 variables are required for real audio upload and playback flows.

3. Start PostgreSQL locally or with Docker Compose:

   ```bash
   docker compose up postgres
   ```

4. Prepare Prisma and run the app:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

5. Seed the first admin account when needed:

   ```bash
   ADMIN_EMAIL=admin@example.com \
   ADMIN_PASSWORD='replace-with-a-strong-admin-password' \
   ADMIN_NAME='Prayer Tunes Admin' \
   npm run db:seed
   ```

   The seed is idempotent. It creates or updates the configured user and creates a Better Auth credential account only when one does not already exist.

## Docker

Build the production image:

```bash
docker build -t prayer-tunes .
```

Run the app with the included PostgreSQL service:

```bash
docker compose up --build
```

On a fresh PostgreSQL volume, Compose first runs the one-shot `migrate` service with `npm run db:deploy`. The `app` service starts only after that migration job exits successfully. To run migrations without starting the app, use:

```bash
docker compose run --rm migrate
```

The compose file wires R2 environment variables through from your shell or `.env`, but it does not provide fake object storage. Audio uploads are expected to use Cloudflare R2 and should not be stored on the container filesystem.

## Dokploy Deployment

1. Create a Dokploy PostgreSQL service for the app.
2. Create an application from this repository and use the Dockerfile build.
3. Configure production environment variables:

   ```bash
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB
   BETTER_AUTH_SECRET=<strong-random-32-plus-character-secret>
   BETTER_AUTH_URL=https://your-domain.example
   NEXT_PUBLIC_APP_URL=https://your-domain.example
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=<strong-initial-admin-password>
   ADMIN_NAME="Prayer Tunes Admin"
   R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<r2-access-key-id>
   R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
   R2_BUCKET_NAME=<r2-bucket-name>
   MAX_AUDIO_UPLOAD_BYTES=52428800
   ```

   `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must match the deployed public URL, including protocol. Use the same URL in Better Auth and the browser-facing app configuration to avoid auth callback and cookie issues.
   `MAX_AUDIO_UPLOAD_BYTES` is the exact uploaded audio file-size limit. Multipart upload requests are allowed an additional 1 MiB of request overhead before parsing.

4. Run production migrations after the database is attached and before serving traffic:

   ```bash
   npm run db:deploy
   ```

   The initial Prisma migration is committed under `prisma/migrations`, so this command applies the production schema without requiring `prisma migrate dev`.

   In Dokploy, configure this as a pre-deploy command or one-shot job using the built image when possible. If you do not want migrations to run from the web container, run the same command in a separate job that has the production `DATABASE_URL` before the app container is started or updated.

5. Seed the first admin account:

   ```bash
   npm run db:seed
   ```

   The seed requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`. It hashes the password with Better Auth's server-side password hashing, writes the standard Better Auth credential account, and does not create a login session.

6. Deploy the Dockerized app and expose port `3000`.

## Cloudflare R2 Notes

Create an R2 bucket and API token with object read/write/delete permissions for that bucket. If browsers will access audio through signed URLs, make sure the bucket CORS policy allows requests from `NEXT_PUBLIC_APP_URL` and permits the methods and headers used by audio playback. Do not mount a local uploads volume for production audio; R2 is the source of truth.

## Testing

Useful checks:

```bash
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e
docker build -t prayer-tunes .
```

The E2E suite currently uses mocked public data and does not cover the real R2 upload path or a full Postgres-backed Better Auth flow.
