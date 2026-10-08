import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { malformedPdfFile } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";

// Priority: P1 -- regression guard for a real bug found during manual
// testing: an unparseable PDF used to crash the route with an uncaught 500.
describe("upload-malformed-pdf-rejected", () => {
  let user: TestUser;
  let cookie: string;

  beforeAll(async () => {
    user = await createConfirmedTestUser("upload-malformed");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("returns a clean 422 UNREADABLE_PDF instead of crashing", async () => {
    const { status, body } = await uploadContract(cookie, malformedPdfFile(), "NDA");
    expect(status).toBe(422);
    expect(body.error).toBe("UNREADABLE_PDF");
  });
});
