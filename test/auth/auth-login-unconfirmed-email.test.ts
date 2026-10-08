import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { APP_URL } from "../helpers/fixtures";
import { createUnconfirmedTestUser, deleteTestUser, type TestUser } from "../helpers/testUser";

// Priority: P1 -- confirms the PRD's explicit edge case: login must be
// blocked for an unverified account with a helpful, specific message.
describe("auth-login-unconfirmed-email", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createUnconfirmedTestUser("login-unconfirmed");
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("blocks login with EMAIL_NOT_CONFIRMED", async () => {
    const res = await fetch(`${APP_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("EMAIL_NOT_CONFIRMED");
  });
});
