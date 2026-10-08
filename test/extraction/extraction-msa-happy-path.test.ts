import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_MSA_PATH } from "../helpers/fixtures";
import { uploadContract, addCustomTerm } from "../helpers/uploadHelpers";
import { processContract } from "../helpers/contractApi";

// Priority: P0 -- MSA term list is a different shape than NDA's, and this
// also covers custom-term matching (is_manual flag + custom_key_term_id
// link) using the same single real extraction call.
describe("extraction-msa-happy-path", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string;
  const filename = "Morningstar Inc MSA.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("extract-msa");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
    const file = await loadPdfAsFile(SAMPLE_MSA_PATH, filename);
    const { body } = await uploadContract(cookie, file, "MSA");
    contractId = body.contract_id!;
    // "Confidentiality" is a real clause in this sample MSA (confirmed
    // during manual testing), so this reliably exercises the match path.
    await addCustomTerm(cookie, contractId, "Confidentiality");
  }, 20000);

  afterAll(async () => {
    await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    await deleteTestUser(user.id);
  });

  it("extracts standard MSA terms and correctly flags the matched custom term", async () => {
    const { status, body } = await processContract(cookie, contractId);

    expect(status).toBe(200);
    expect(body.terms.length).toBeGreaterThan(0);

    const standardTermNames = [
      "Parties", "Service Scope", "Payment Terms", "Invoice Schedule", "Late Payment Penalty",
      "Liability Cap", "Indemnification", "IP Ownership", "Termination Clause",
      "Governing Law", "Dispute Resolution", "Notice Period",
    ];
    for (const term of body.terms) {
      if (term.term_name !== "Confidentiality") {
        expect(standardTermNames).toContain(term.term_name);
      }
    }

    const customMatch = body.terms.find((t: { term_name: string }) => t.term_name === "Confidentiality");
    expect(customMatch).toBeDefined();
    expect(customMatch.is_manual).toBe(true);
    expect(customMatch.custom_key_term_id).not.toBeNull();
  }, 30000);
});
