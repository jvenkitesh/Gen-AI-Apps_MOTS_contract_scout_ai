import { describe, it, expect, afterAll } from "vitest";
import { APP_URL } from "../helpers/fixtures";
import { uniqueTestEmail, findUserIdByEmail, deleteTestUser } from "../helpers/testUser";

// Priority: P0 -- foundational; everything else depends on signup working.
describe("auth-signup-happy-path", () => {
  const email = uniqueTestEmail("signup-happy");
  const password = "TestPassword123";

  afterAll(async () => {
    const userId = await findUserIdByEmail(email);
    if (userId) await deleteTestUser(userId);
  });

  it("creates a real Supabase Auth user and a matching profiles row", async () => {
    const res = await fetch(`${APP_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(res.status).toBe(201);

    const userId = await findUserIdByEmail(email);
    expect(userId).not.toBeNull();
  });
});
