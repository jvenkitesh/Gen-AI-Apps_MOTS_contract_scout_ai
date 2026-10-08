import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { getContract, getPdfUrl, patchTerm, deleteContract } from "../helpers/contractApi";

// Priority: P0 -- security-critical across all 4 contract-detail routes.
// No extraction needed: ownership is checked before any status logic.
describe("viewer-cross-user-rejected", () => {
  let userA: TestUser;
  let userB: TestUser;
  let cookieB: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    userA = await createConfirmedTestUser("viewer-cross-a");
    userB = await createConfirmedTestUser("viewer-cross-b");
    const cookieA = await loginAndGetCookieHeader(userA.email, userA.password);
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

  it("GET -> 404", async () => {
    const { status } = await getContract(cookieB, contractId);
    expect(status).toBe(404);
  });

  it("pdf-url -> 404", async () => {
    const { status } = await getPdfUrl(cookieB, contractId);
    expect(status).toBe(404);
  });

  it("PATCH term -> 404", async () => {
    const { status } = await patchTerm(cookieB, contractId, "00000000-0000-0000-0000-000000000000", "hostile");
    expect(status).toBe(404);
  });

  it("DELETE -> 404", async () => {
    const { status } = await deleteContract(cookieB, contractId);
    expect(status).toBe(404);
  });
});
