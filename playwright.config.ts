import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: "artifacts/e2e-results",
  reporter: [["list"], ["html", { outputFolder: "artifacts/e2e-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:4318", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "node scripts/validation/e2e-server.mjs", url: "http://127.0.0.1:4318/horarios-onibus", reuseExistingServer: false, timeout: 180_000 },
});
