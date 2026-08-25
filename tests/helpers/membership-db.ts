import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import "dotenv/config";

import {
  applyMigrations,
  ensureDatabase,
  redactDatabaseUrl,
  testDatabaseUrl,
} from "./database";

const TEST_DATABASE_NAME = "soundshelf_test";

export function membershipTestDatabaseUrl(): string {
  try {
    return testDatabaseUrl(TEST_DATABASE_NAME, process.env.TEST_DATABASE_URL);
  } catch {
    throw new Error(
      "Playlist membership tests need DATABASE_URL or TEST_DATABASE_URL.",
    );
  }
}

export async function createMembershipTestClient(): Promise<PrismaClient> {
  const databaseUrl = membershipTestDatabaseUrl();

  try {
    await ensureDatabase(databaseUrl);
    applyMigrations(databaseUrl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Playlist membership tests need Postgres at ${redactDatabaseUrl(databaseUrl)}. Start it with: docker compose up postgres\n${detail}`,
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export async function resetMembershipTables(db: PrismaClient): Promise<void> {
  await db.playlistItem.deleteMany();
  await db.playlist.deleteMany();
  await db.tune.deleteMany();
}
