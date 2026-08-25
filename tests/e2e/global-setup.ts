import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createLocalAccountIssuer } from "better-auth";
import { hashPassword } from "better-auth/crypto";

import {
  applyMigrations,
  ensureDatabase,
  redactDatabaseUrl,
} from "../helpers/database";
import { ADMIN_USER, NON_ADMIN_USER, e2eDatabaseUrl } from "./auth-fixtures";

const CREDENTIAL_PROVIDER_ID = "credential";
// Taken from Better Auth itself, exactly as prisma/seed.ts does, so the seeded
// row matches whatever the installed version expects at sign-in.
const CREDENTIAL_ISSUER = createLocalAccountIssuer(CREDENTIAL_PROVIDER_ID);

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
};

/**
 * Prepares the login tests' database: creates it, migrates it, and seeds the
 * accounts the specs sign in with. Mirrors how prisma/seed.ts provisions the
 * first admin, so the tests exercise a realistically shaped credential row
 * rather than one built to suit them.
 */
export default async function globalSetup(): Promise<void> {
  const databaseUrl = e2eDatabaseUrl();

  try {
    await ensureDatabase(databaseUrl);
    applyMigrations(databaseUrl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Login E2E tests need Postgres at ${redactDatabaseUrl(databaseUrl)}. Start it with: docker compose up postgres\n${detail}`,
    );
  }

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    // Old sessions would let a spec appear signed in before it signs in.
    await db.session.deleteMany();

    await seedUser(db, ADMIN_USER);
    await seedUser(db, NON_ADMIN_USER);
  } finally {
    await db.$disconnect();
  }
}

async function seedUser(db: PrismaClient, seed: SeedUser): Promise<void> {
  const user = await db.user.upsert({
    where: { email: seed.email },
    update: { name: seed.name, emailVerified: true, role: seed.role },
    create: {
      id: randomUUID(),
      email: seed.email,
      name: seed.name,
      emailVerified: true,
      role: seed.role,
    },
  });

  // Rewrite the password every run so a hash left by an older better-auth
  // version can never make a green suite depend on a stale credential.
  const passwordHash = await hashPassword(seed.password);
  const existing = await db.account.findFirst({
    where: { userId: user.id, providerId: CREDENTIAL_PROVIDER_ID },
  });

  if (existing) {
    await db.account.update({
      where: { id: existing.id },
      data: { issuer: CREDENTIAL_ISSUER, password: passwordHash },
    });
    return;
  }

  await db.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: CREDENTIAL_PROVIDER_ID,
      issuer: CREDENTIAL_ISSUER,
      password: passwordHash,
    },
  });
}
