import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for secrets, same as vitest.setup.ts.
dotenv.config({ path: path.resolve(__dirname, "../contractiq/.env.local") });

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000, // generous: some steps involve a real ~10s GPT-4o call
  expect: { timeout: 15000 },
  fullyParallel: false, // shared live dev Supabase project -- avoid racing
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_APP_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
