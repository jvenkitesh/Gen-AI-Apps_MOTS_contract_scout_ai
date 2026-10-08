import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { APP_URL } from "../helpers/fixtures";
import { createConfirmedTestUser, deleteTestUser, type TestUser } from "../helpers/testUser";

// Priority: P1 -- security-adjacent: confirms Supabase's empty-identities
// signal is correctly translated into a clear "already exists" message
// rather than the generic fallback error.
describe("auth-signup-duplicate-confirmed-email", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createConfirmedTestUser("signup-dup");
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("returns 409 EMAIL_ALREADY_REGISTERED for an already-confirmed account", async () => {
    const res = await fetch(`${APP_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("EMAIL_ALREADY_REGISTERED");
  });
});
