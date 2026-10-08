import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { sendChatMessage, getChatHistory } from "../helpers/contractApi";

// Priority: P0 -- security-critical. The route's ownership check and its
// status==='completed' check both return 404 identically, so this needs no
// real extraction call to verify isolation.
describe("chat-cross-user-rejected", () => {
  let userA: TestUser;
  let userB: TestUser;
  let cookieB: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    userA = await createConfirmedTestUser("chat-cross-a");
    userB = await createConfirmedTestUser("chat-cross-b");
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

  it("GET history -> 404", async () => {
    const { status } = await getChatHistory(cookieB, contractId);
    expect(status).toBe(404);
  });

  it("POST message -> 404", async () => {
    const { status } = await sendChatMessage(cookieB, contractId, "hostile question");
    expect(status).toBe(404);
  });
});
