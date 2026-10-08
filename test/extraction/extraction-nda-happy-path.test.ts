import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { processContract } from "../helpers/contractApi";

// Priority: P0 -- real GPT-4o extraction against a real contract is the
// product's core value. Also covers the 409 re-process guard using the same
// completed contract, avoiding a second real OpenAI call.
describe("extraction-nda-happy-path", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("extract-nda");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { body } = await uploadContract(cookie, file, "NDA");
    contractId = body.contract_id!;
  }, 20000);

  afterAll(async () => {
    await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    await deleteTestUser(user.id);
  });

  it("extracts standard NDA terms with grounded, well-formed results", async () => {
    const { status, body } = await processContract(cookie, contractId);

    expect(status).toBe(200);
    expect(Array.isArray(body.terms)).toBe(true);
    expect(body.terms.length).toBeGreaterThan(0);

    const standardTermNames = [
      "Parties", "Effective Date", "Confidentiality Obligations", "Permitted Disclosures",
      "Term & Duration", "Governing Law", "Jurisdiction", "IP Ownership",
      "Non-Solicitation", "Breach & Remedy",
    ];
    for (const term of body.terms) {
      expect(standardTermNames).toContain(term.term_name);
      expect(term.page_number).toBeGreaterThanOrEqual(1);
      expect(term.confidence_score).toBeGreaterThanOrEqual(0);
      expect(term.confidence_score).toBeLessThanOrEqual(100);
      expect(typeof term.source_sentence).toBe("string");
      expect(term.source_sentence.length).toBeGreaterThan(0);
      expect(term.is_manual).toBe(false);
    }
  }, 30000);

  it("rejects re-processing an already-completed contract with 409", async () => {
    const { status, body } = await processContract(cookie, contractId);
    expect(status).toBe(409);
    expect(body.error).toBe("INVALID_STATUS");
  });
});
