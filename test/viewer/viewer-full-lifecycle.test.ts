import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject, setContractStatus, createAdminClient } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { processContract, getContract, getPdfUrl, patchTerm, deleteContract } from "../helpers/contractApi";

// Priority: P0/P1 -- covers GET shape, pdf-url fetchability, inline
// correction (including original-value preservation across edits), the
// processing-block guard, and cascading delete -- all against ONE real
// extraction call to keep this fast and cheap.
describe("viewer-full-lifecycle", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string;
  let firstTermId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("viewer-lifecycle");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { body: uploadBody } = await uploadContract(cookie, file, "NDA");
    contractId = uploadBody.contract_id!;
    const { body: processBody } = await processContract(cookie, contractId);
    firstTermId = processBody.terms[0].id;
  }, 30000);

  afterAll(async () => {
    // Contract may already be deleted by the last test in this file --
    // removing a non-existent storage object is a harmless no-op.
    await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    await deleteTestUser(user.id);
  });

  it("GET returns the full contract shape with pdf_available true", async () => {
    const { status, body } = await getContract(cookie, contractId);
    expect(status).toBe(200);
    expect(body.contract.status).toBe("completed");
    expect(body.pdf_available).toBe(true);
    expect(body.contract.contract_text).toContain("[PAGE 1]");
    expect(body.terms.length).toBeGreaterThan(0);
  });

  it("pdf-url returns a real, fetchable signed URL", async () => {
    const { status, body } = await getPdfUrl(cookie, contractId);
    expect(status).toBe(200);
    expect(body.signed_url).toMatch(/^https:\/\//);

    const fetched = await fetch(body.signed_url);
    expect(fetched.status).toBe(200);
    expect(fetched.headers.get("content-type")).toBe("application/pdf");
  });

  it("inline correction preserves the original AI value across multiple edits", async () => {
    const { status: s1, body: b1 } = await patchTerm(cookie, contractId, firstTermId, "First correction");
    expect(s1).toBe(200);
    expect(b1.term.is_edited).toBe(true);
    const originalValue = b1.term.original_ai_value;
    expect(originalValue).not.toBeNull();

    const { status: s2, body: b2 } = await patchTerm(cookie, contractId, firstTermId, "Second correction");
    expect(s2).toBe(200);
    expect(b2.term.original_ai_value).toBe(originalValue);
    expect(b2.term.value).toBe("Second correction");
  });

  it("blocks edits while status is processing (409)", async () => {
    await setContractStatus(contractId, "processing");
    const { status, body } = await patchTerm(cookie, contractId, firstTermId, "Should not save");
    expect(status).toBe(409);
    expect(body.error).toBe("CONTRACT_PROCESSING");
    await setContractStatus(contractId, "completed");
  });

  it("delete cascades the DB rows and removes the storage object", async () => {
    const { status } = await deleteContract(cookie, contractId);
    expect(status).toBe(204);

    const admin = createAdminClient();
    const { count: contractRows } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("id", contractId);
    expect(contractRows).toBe(0);

    const { data: storageList } = await admin.storage.from("contracts").list(`${user.id}/${contractId}`);
    expect(storageList?.length ?? 0).toBe(0);
  });
});
