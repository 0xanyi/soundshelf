import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

/**
 * Derives a sibling database URL from DATABASE_URL by swapping only the
 * database name, so test databases inherit the host, port, and credentials of
 * whatever Postgres the project is already pointed at.
 */
export function testDatabaseUrl(databaseName: string, override?: string): string {
  if (override) {
    return override;
  }

  const source = process.env.DATABASE_URL;

  if (!source) {
    throw new Error(
      `Cannot derive the ${databaseName} database: set DATABASE_URL first.`,
    );
  }

  const url = new URL(source);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/** Creates the database if it does not exist yet. Safe to call repeatedly. */
export async function ensureDatabase(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("The test database URL is missing a database name.");
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

/** Brings the target database up to the committed migration history. */
export function applyMigrations(databaseUrl: string): void {
  // Resolved from the working directory rather than import.meta.url: Playwright
  // loads its config as CommonJS, where import.meta is a syntax error.
  const prismaBin = join(process.cwd(), "node_modules/prisma/build/index.js");

  if (!existsSync(prismaBin)) {
    throw new Error(
      `Could not find the Prisma CLI at ${prismaBin}. Run test commands from the project root.`,
    );
  }

  execFileSync(process.execPath, [prismaBin, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

export function redactDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.password = url.password ? "****" : "";
  return url.toString();
}
