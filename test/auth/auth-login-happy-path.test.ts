import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { APP_URL } from "../helpers/fixtures";
import { createConfirmedTestUser, deleteTestUser, type TestUser } from "../helpers/testUser";

// Priority: P0 -- foundational; every protected-route test depends on login working.
describe("auth-login-happy-path", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createConfirmedTestUser("login-happy");
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("logs in a confirmed user and sets a session cookie", async () => {
    const res = await fetch(`${APP_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().length).toBeGreaterThan(0);
  });
});
