import { test, expect } from "@playwright/test";
import { createConfirmedTestUser, deleteTestUser, type TestUser } from "../helpers/testUser";

// Priority: P0 -- real browser login flow: form fill, submit, redirect,
// and the empty-state copy actually rendering for a brand-new account.
test("auth-login-redirects-to-dashboard: real login redirects and shows the empty dashboard state", async ({
  page,
}) => {
  const user: TestUser = await createConfirmedTestUser("e2e-login");

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/No contracts reviewed yet/i)).toBeVisible();
  } finally {
    await deleteTestUser(user.id);
  }
});
