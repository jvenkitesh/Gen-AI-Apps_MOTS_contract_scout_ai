import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Live-network tests against a shared dev Supabase project -- run
    // sequentially to avoid test users/contracts racing each other.
    fileParallelism: false,
    // Only *.test.ts -- e2e/*.spec.ts belongs to Playwright, not Vitest.
    include: ["**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
