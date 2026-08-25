-- Better Auth 1.7 added a required Account.issuer column and now resolves a
-- credential account by (providerId, issuer, accountId). Rows written before
-- this migration have no issuer, so that lookup fails and every credential
-- sign-in returns "Invalid email or password" -- indistinguishable from a
-- wrong password. This backfills the synthetic issuer Better Auth expects:
--   * local methods (email/password): "local:<providerId>"
--   * OAuth providers:                "local:oauth:<providerId>"
-- The two namespaces are kept distinct so an OAuth provider id can never
-- collide with a local one.
--
-- Better Auth URL-encodes the provider id when building the issuer. Provider
-- ids in use here are plain slugs, for which encoding is the identity, so the
-- concatenation below matches. A provider id containing reserved characters
-- would need encoding to match.
--
-- Each step is idempotent so it can be retried safely.

-- AlterTable: add nullable first so existing rows can be backfilled.
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "issuer" TEXT;

-- Backfill every row that predates the column.
UPDATE "Account"
SET "issuer" = CASE
  WHEN "providerId" = 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "providerId"
END
WHERE "issuer" IS NULL;

-- Only enforce NOT NULL once the backfill has run.
ALTER TABLE "Account" ALTER COLUMN "issuer" SET NOT NULL;

-- The uniqueness guarantee moves from (providerId, accountId) to
-- (issuer, accountId): issuer now carries the provider identity, and it
-- distinguishes a local provider from an OAuth one of the same name.
DROP INDEX IF EXISTS "Account_providerId_accountId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Account_issuer_accountId_key" ON "Account"("issuer", "accountId");
