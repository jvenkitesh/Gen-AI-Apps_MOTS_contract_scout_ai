import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { sendChatMessage, getChatHistory } from "../helpers/contractApi";

// Priority: P1 -- chat must not be usable before extraction completes.
// Deliberately skips processing -- zero OpenAI cost.
describe("chat-blocked-before-completed", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("chat-blocked");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { body } = await uploadContract(cookie, file, "NDA");
    contractId = body.contract_id!;
  });

  afterAll(async () => {
    await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    await deleteTestUser(user.id);
  });

  it("GET history on an unprocessed contract returns empty, not an error", async () => {
    const { status, body } = await getChatHistory(cookie, contractId);
    expect(status).toBe(200);
    expect(body.session_id).toBeNull();
    expect(body.messages).toEqual([]);
  });

  it("POST a message before processing completes returns 404", async () => {
    const { status } = await sendChatMessage(cookie, contractId, "Hello?");
    expect(status).toBe(404);
  });
});
