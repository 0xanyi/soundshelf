import { expect, test } from "playwright/test";

test.describe("admin and public smoke flow", () => {
  test("redirects unauthenticated admin users to login", async ({ page }) => {
    await page.goto("/admin/playlists");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  // This smoke test mocks the public API boundary so CI does not need Postgres or R2.
  // It covers public routing, data loading, playlist selection, and player controls;
  // it does not cover authenticated playlist creation or real signed audio URLs.
  test("shows a mocked published playlist on the public player", async ({ page }) => {
    await page.route("**/api/public/playlists", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          playlists: [
            {
              id: "playlist-task-9-smoke",
              title: "Task 9 Published Smoke",
              description: "Mocked public playlist data for deterministic E2E.",
              itemCount: 1,
            },
          ],
        }),
      });
    });
    await page.route("**/api/public/playlists/playlist-task-9-smoke", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "playlist-task-9-smoke",
          title: "Task 9 Published Smoke",
          description: "Mocked public playlist data for deterministic E2E.",
          tracks: [
            {
              id: "tune-task-9-smoke",
              playlistItemId: "item-task-9-smoke",
              title: "Smoke Test Tune",
              description: "Active tune from mocked API data.",
              durationSeconds: 90,
              audioUrl:
                "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: /Task 9 Published Smoke/ }).click();

    await expect(
      page.getByRole("heading", { name: "Smoke Test Tune" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Play" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Next track" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Seek" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Volume" })).toBeVisible();
  });
});
