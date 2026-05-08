import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const requiredEnv = [
  "DATABASE_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_NAME",
] as const;
const credentialProviderId = "credential";

const getRequiredEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required seed environment variable(s): ${missing.join(
        ", "
      )}. Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME before running npm run db:seed.`
    );
  }

  const password = process.env.ADMIN_PASSWORD!.trim();

  if (password.length < 8 || password.length > 128) {
    throw new Error(
      "ADMIN_PASSWORD must be between 8 and 128 characters to match Better Auth password limits."
    );
  }

  return {
    databaseUrl: process.env.DATABASE_URL!.trim(),
    email: process.env.ADMIN_EMAIL!.trim().toLowerCase(),
    password,
    name: process.env.ADMIN_NAME!.trim(),
  };
};

async function main() {
  const env = getRequiredEnv();
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  const db = new PrismaClient({ adapter });

  try {
    // The role is asserted on every run so an admin account that lost the
    // privilege (e.g. created before the role column existed) is healed by
    // the next deployment without a manual database edit.
    const user = await db.user.upsert({
      where: { email: env.email },
      update: {
        name: env.name,
        emailVerified: true,
        role: "admin",
      },
      create: {
        id: randomUUID(),
        email: env.email,
        name: env.name,
        emailVerified: true,
        role: "admin",
      },
    });

    const existingCredentialAccount = await db.account.findFirst({
      where: {
        userId: user.id,
        providerId: credentialProviderId,
      },
    });

    if (existingCredentialAccount) {
      console.info(
        `Admin user ${env.email} already has a credential account; ensured role=admin.`
      );
      return;
    }

    const passwordHash = await hashPassword(env.password);

    await db.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: credentialProviderId,
        password: passwordHash,
      },
    });

    console.info(`Created first admin credential account for ${env.email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
