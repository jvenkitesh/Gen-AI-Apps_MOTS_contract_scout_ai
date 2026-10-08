import { test, expect } from "@playwright/test";
import { uniqueTestEmail, findUserIdByEmail, deleteTestUser } from "../helpers/testUser";

// Priority: P0 -- real browser form submission, not just the API route.
// Doesn't need email confirmation to verify the resulting UI state.
test("auth-signup-shows-confirmation: real signup form submission shows the check-your-email screen", async ({
  page,
}) => {
  const email = uniqueTestEmail("e2e-signup");

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("TestPassword123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  const userId = await findUserIdByEmail(email);
  if (userId) await deleteTestUser(userId);
});
