/**
 * Login tests run against their own database so that signing in, and the
 * session rows it creates, never touch the development data in `soundshelf`.
 */
const E2E_DATABASE_NAME = "soundshelf_e2e";

/**
 * Port 5434 matches the host mapping in docker-compose.override.yml. The
 * container listens on 5432, so anything reaching Postgres from the host must
 * use 5434 or it will silently connect to a different database.
 */
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5434/soundshelf";

export function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) {
    return process.env.E2E_DATABASE_URL;
  }

  const url = new URL(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  url.pathname = `/${E2E_DATABASE_NAME}`;
  return url.toString();
}

/** Seeded by tests/e2e/global-setup.ts. Passwords are fixed so tests can sign in. */
export const ADMIN_USER = {
  email: "e2e-admin@soundshelf.test",
  name: "E2E Admin",
  password: "e2e-admin-password",
  role: "admin",
} as const;

/**
 * A valid account with no admin role. Proves that a *successful* sign-in is
 * still refused entry to the admin area, which a wrong-password test cannot
 * show: authentication and authorization fail the same way from the outside
 * unless one of them is known to have succeeded.
 */
export const NON_ADMIN_USER = {
  email: "e2e-listener@soundshelf.test",
  name: "E2E Listener",
  password: "e2e-listener-password",
  role: "user",
} as const;

export const WRONG_PASSWORD = "not-the-right-password";
