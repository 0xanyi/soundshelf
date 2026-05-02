-- DropIndex
DROP INDEX IF EXISTS "Tune_status_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Playlist_status_createdAt_idx";

-- AlterTable
ALTER TABLE "Tune" DROP COLUMN IF EXISTS "description";

-- AlterTable
ALTER TABLE "Tune" DROP COLUMN IF EXISTS "status";

-- AlterTable
ALTER TABLE "Playlist" DROP COLUMN IF EXISTS "status";

-- DropEnum
DROP TYPE IF EXISTS "TuneStatus";

-- DropEnum
DROP TYPE IF EXISTS "PlaylistStatus";
