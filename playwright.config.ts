import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a production build (`npm run build` first).
 * ALLOW_MEMORY_STORE=1 lets a local `next start` accept inquiries without Supabase
 * (never possible on Vercel). Set PLAYWRIGHT_CHROME_PATH to use a system Chrome,
 * or run `npx playwright install chromium`.
 */
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH;
const port = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`,
    launchOptions: executablePath ? { executablePath } : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${port}`,
        port,
        reuseExistingServer: true,
        env: { ALLOW_MEMORY_STORE: "1", NEXT_PUBLIC_SITE_URL: `http://localhost:${port}` },
        timeout: 60_000,
      },
});
