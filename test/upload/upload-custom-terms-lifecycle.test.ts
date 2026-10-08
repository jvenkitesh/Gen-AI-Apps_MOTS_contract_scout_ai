import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract, addCustomTerm, deleteCustomTerm } from "../helpers/uploadHelpers";

// Priority: P1 -- covers FR-05 end to end: add up to 5, enforce the cap,
// remove, and confirm removal frees a slot back up.
describe("upload-custom-terms-lifecycle", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("custom-terms");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { body } = await uploadContract(cookie, file, "NDA");
    contractId = body.contract_id!;
  });

  afterAll(async () => {
    await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    await deleteTestUser(user.id);
  });

  it("adds terms up to the 5-term cap, then rejects the 6th", async () => {
    const names = ["Exclusivity", "Audit Rights", "Data Residency", "Change of Control", "Insurance Requirements"];
    const addedIds: string[] = [];

    for (const name of names) {
      const { status, body } = await addCustomTerm(cookie, contractId, name);
      expect(status).toBe(201);
      addedIds.push(body.id!);
    }

    const { status, body } = await addCustomTerm(cookie, contractId, "One Too Many");
    expect(status).toBe(422);
    expect(body.error).toBe("MAX_CUSTOM_TERMS");

    // Removing one frees a slot back up to 5.
    const { status: deleteStatus } = await deleteCustomTerm(cookie, contractId, addedIds[0]);
    expect(deleteStatus).toBe(204);

    const { status: readdStatus } = await addCustomTerm(cookie, contractId, "Back To Five");
    expect(readdStatus).toBe(201);
  });

  it("returns 404 when deleting a term that doesn't exist", async () => {
    const { status } = await deleteCustomTerm(cookie, contractId, "00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });

  it("rejects a term name shorter than 2 characters with 422", async () => {
    const { status, body } = await addCustomTerm(cookie, contractId, "A");
    expect(status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
