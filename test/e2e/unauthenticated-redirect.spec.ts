import { test, expect } from "@playwright/test";

// Priority: P0 -- real-browser confirmation that middleware actually
// redirects an unauthenticated visitor, not just that the API 401s.
test("unauthenticated-redirect: visiting /dashboard without a session redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
