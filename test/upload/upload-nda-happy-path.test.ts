import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject, createAdminClient } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";

// Priority: P0 -- core product value: a real NDA must upload, extract text
// with page markers, and persist to Storage.
describe("upload-nda-happy-path", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string | undefined;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("upload-nda");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
  });

  afterAll(async () => {
    if (contractId) {
      await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    }
    await deleteTestUser(user.id); // cascades contracts/custom_key_terms/profile
  });

  it("uploads a real NDA and returns the correct standard term list", async () => {
    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { status, body } = await uploadContract(cookie, file, "NDA");

    expect(status).toBe(201);
    expect(body.contract_type).toBe("NDA");
    expect(body.page_count).toBeGreaterThan(0);
    expect(body.standard_terms).toEqual([
      "Parties",
      "Effective Date",
      "Confidentiality Obligations",
      "Permitted Disclosures",
      "Term & Duration",
      "Governing Law",
      "Jurisdiction",
      "IP Ownership",
      "Non-Solicitation",
      "Breach & Remedy",
    ]);
    contractId = body.contract_id;
  });

  it("persists extracted text with [PAGE N] markers and sets file_path", async () => {
    expect(contractId).toBeDefined();
    const admin = createAdminClient();
    const { data } = await admin
      .from("contracts")
      .select("status, contract_text, file_path")
      .eq("id", contractId!)
      .single();

    expect(data?.status).toBe("uploaded");
    expect(data?.contract_text).toContain("[PAGE 1]");
    expect(data?.file_path).toBe(`${user.id}/${contractId}/${filename}`);
  });
});
