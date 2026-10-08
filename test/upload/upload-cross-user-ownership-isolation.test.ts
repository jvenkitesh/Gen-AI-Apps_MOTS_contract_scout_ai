import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract, addCustomTerm, deleteCustomTerm } from "../helpers/uploadHelpers";

// Priority: P0 -- the single highest-severity test in this suite: a failure
// here means one user's legal documents are reachable by another user.
// RLS is the primary defense; this exercises it through the real API, not
// just a direct DB check.
describe("upload-cross-user-ownership-isolation", () => {
  let userA: TestUser;
  let userB: TestUser;
  let cookieA: string;
  let cookieB: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    userA = await createConfirmedTestUser("isolation-a");
    userB = await createConfirmedTestUser("isolation-b");
    cookieA = await loginAndGetCookieHeader(userA.email, userA.password);
    cookieB = await loginAndGetCookieHeader(userB.email, userB.password);

    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { body } = await uploadContract(cookieA, file, "NDA");
    contractId = body.contract_id!;
  });

  afterAll(async () => {
    await deleteStorageObject(`${userA.id}/${contractId}/${filename}`);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it("blocks userB from adding a custom term to userA's contract (404, not 403)", async () => {
    const { status, body } = await addCustomTerm(cookieB, contractId, "Hostile Takeover");
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("blocks userB from deleting a term on userA's contract (404)", async () => {
    const { status } = await deleteCustomTerm(cookieB, contractId, "00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });
});
