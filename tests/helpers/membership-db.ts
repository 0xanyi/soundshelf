import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

import "dotenv/config";

const TEST_DATABASE_NAME = "soundshelf_test";

export function membershipTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  const source = process.env.DATABASE_URL;

  if (!source) {
    throw new Error(
      "Playlist membership tests need DATABASE_URL or TEST_DATABASE_URL.",
    );
  }

  const url = new URL(source);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
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

async function ensureDatabase(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("TEST_DATABASE_URL is missing a database name.");
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

function applyMigrations(databaseUrl: string): void {
  const prismaBin = fileURLToPath(
    new URL("../../node_modules/prisma/build/index.js", import.meta.url),
  );

  execFileSync(process.execPath, [prismaBin, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

function redactDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.password = url.password ? "****" : "";
  return url.toString();
}
