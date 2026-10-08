import { describe, it, expect } from "vitest";
import { APP_URL } from "../helpers/fixtures";

// Priority: P0 -- security-critical: the single most basic access control
// check on the single most sensitive route (file upload).
describe("upload-unauthenticated-rejected", () => {
  it("rejects an upload attempt with no session cookie", async () => {
    const formData = new FormData();
    formData.append("contract_type", "NDA");
    // No file needed -- auth is checked before body parsing.

    const res = await fetch(`${APP_URL}/api/contracts/upload`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(401);
  });
});
