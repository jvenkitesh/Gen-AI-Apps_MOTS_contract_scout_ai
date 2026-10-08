import { describe, it, expect } from "vitest";
import { APP_URL } from "../helpers/fixtures";

// Priority: P1 -- input validation guard, no server state created either way.
describe("auth-signup-invalid-payload", () => {
  it("rejects a malformed email and a too-short password with 422", async () => {
    const res = await fetch(`${APP_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
