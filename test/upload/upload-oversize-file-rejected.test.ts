import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { oversizeFile } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";

// Priority: P1 -- input validation guard (FR-02's 10MB limit).
describe("upload-oversize-file-rejected", () => {
  let user: TestUser;
  let cookie: string;

  beforeAll(async () => {
    user = await createConfirmedTestUser("upload-oversize");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("rejects an 11MB file with 422 before parsing it", async () => {
    const { status, body } = await uploadContract(cookie, oversizeFile(), "NDA");
    expect(status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
