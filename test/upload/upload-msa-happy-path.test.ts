import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_MSA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";

// Priority: P0 -- same core path as NDA, but the MSA term list is a
// different length/content -- a regression here wouldn't be caught by the
// NDA test alone.
describe("upload-msa-happy-path", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string | undefined;
  const filename = "Morningstar Inc MSA.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("upload-msa");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
  });

  afterAll(async () => {
    if (contractId) {
      await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    }
    await deleteTestUser(user.id);
  });

  it("uploads a real MSA and returns the correct standard term list", async () => {
    const file = await loadPdfAsFile(SAMPLE_MSA_PATH, filename);
    const { status, body } = await uploadContract(cookie, file, "MSA");

    expect(status).toBe(201);
    expect(body.contract_type).toBe("MSA");
    expect(body.page_count).toBeGreaterThan(0);
    expect(body.standard_terms).toEqual([
      "Parties",
      "Service Scope",
      "Payment Terms",
      "Invoice Schedule",
      "Late Payment Penalty",
      "Liability Cap",
      "Indemnification",
      "IP Ownership",
      "Termination Clause",
      "Governing Law",
      "Dispute Resolution",
      "Notice Period",
    ]);
    contractId = body.contract_id;
  });
});
