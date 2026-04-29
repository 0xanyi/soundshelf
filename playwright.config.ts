import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    env: {
      BETTER_AUTH_SECRET: "dev-secret-for-e2e-with-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/prayer_tunes",
      MAX_AUDIO_UPLOAD_BYTES: "52428800",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_TELEMETRY_DISABLED: "1",
      R2_ACCESS_KEY_ID: "test-access-key",
      R2_BUCKET_NAME: "test-bucket",
      R2_ENDPOINT: "https://example.invalid",
      R2_SECRET_ACCESS_KEY: "test-secret-key",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
