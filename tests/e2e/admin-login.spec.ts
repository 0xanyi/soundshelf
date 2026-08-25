import { expect, test, type Page } from "playwright/test";

import {
  ADMIN_USER,
  NON_ADMIN_USER,
  WRONG_PASSWORD,
} from "./auth-fixtures";

/**
 * Real credential sign-in against a seeded Postgres. The rest of the E2E suite
 * mocks the API boundary, but sign-in is precisely the flow that cannot be
 * mocked usefully: password verification, session issuance, and the cookie
 * round-trip all live in Better Auth and the database.
 */
test.describe("admin credential login", () => {
  test("signs a seeded admin in and opens the admin area", async ({ page }) => {
    await signIn(page, ADMIN_USER.email, ADMIN_USER.password);

    await expect(page).toHaveURL(/\/admin$/);
    // The sidebar renders the email resolved from the session, so this asserts
    // the session identifies the seeded admin rather than merely existing.
    await expect(page.getByText(ADMIN_USER.email)).toBeVisible();
  });

  test("issues a session cookie that survives a reload", async ({ page }) => {
    await signIn(page, ADMIN_USER.email, ADMIN_USER.password);
    await expect(page).toHaveURL(/\/admin$/);

    const sessionCookie = await findSessionCookie(page);
    expect(sessionCookie, "expected Better Auth to set a session cookie").toBeDefined();
    // HttpOnly keeps the token away from page scripts; asserted here because a
    // regression would still let every other assertion in this file pass.
    expect(sessionCookie?.httpOnly).toBe(true);

    // A fresh navigation proves the session was persisted server-side rather
    // than only held in the client that performed the sign-in.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeHidden();
  });

  test("keeps a wrong password out and issues no session", async ({ page }) => {
    await signIn(page, ADMIN_USER.email, WRONG_PASSWORD);

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(await findSessionCookie(page)).toBeUndefined();

    // The admin area must still be closed, not merely un-navigated-to.
    await page.goto("/admin/playlists");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("refuses the admin area to a valid non-admin account", async ({ page }) => {
    await signIn(page, NON_ADMIN_USER.email, NON_ADMIN_USER.password);

    // Authentication succeeds here, so a session cookie is expected; it is
    // authorization that must fail.
    await expect(
      page.getByText("This account is not an admin."),
    ).toBeVisible();
    expect(await findSessionCookie(page)).toBeDefined();

    await page.goto("/admin/playlists");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("signing out revokes access to the admin area", async ({ page }) => {
    await signIn(page, ADMIN_USER.email, ADMIN_USER.password);
    await expect(page).toHaveURL(/\/admin$/);

    // For an admin the sign-out control lives in the /admin sidebar; the login
    // page only offers one to a signed-in non-admin.
    await page.getByRole("button", { name: /Sign out/ }).click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.goto("/admin/playlists");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
}

async function findSessionCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name.includes("session_token"));
}
