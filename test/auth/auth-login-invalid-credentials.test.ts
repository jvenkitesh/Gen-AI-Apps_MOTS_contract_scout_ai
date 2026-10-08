import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { APP_URL } from "../helpers/fixtures";
import { createConfirmedTestUser, deleteTestUser, type TestUser } from "../helpers/testUser";

// Priority: P1 -- security-adjacent: wrong password must get a generic
// error, never a hint about which field was wrong.
describe("auth-login-invalid-credentials", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createConfirmedTestUser("login-bad-creds");
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("rejects a wrong password with a generic 401 message", async () => {
    const res = await fetch(`${APP_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "WrongPassword999" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("AUTH_ERROR");
    expect(body.message).toBe("Invalid email or password.");
  });
});
