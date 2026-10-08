import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { processContract, sendChatMessage, getChatHistory } from "../helpers/contractApi";

// Priority: P0/P1 -- real streaming chat against a real contract: grounding,
// page citation, conversation memory, session reuse, and validation, all
// against ONE extraction call + 2 real chat turns to keep cost reasonable.
describe("chat-full-flow", () => {
  let user: TestUser;
  let cookie: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    user = await createConfirmedTestUser("chat-flow");
    cookie = await loginAndGetCookieHeader(user.email, user.password);
    const file = await loadPdfAsFile(SAMPLE_NDA_PATH, filename);
    const { body: uploadBody } = await uploadContract(cookie, file, "NDA");
    contractId = uploadBody.contract_id!;
    await processContract(cookie, contractId);
  }, 30000);

  afterAll(async () => {
    await deleteStorageObject(`${user.id}/${contractId}/${filename}`);
    await deleteTestUser(user.id);
  });

  it("answers a grounded question with a page citation", async () => {
    const { status, text } = await sendChatMessage(cookie, contractId, "What is the governing law of this agreement?");
    expect(status).toBe(200);
    expect(text.toLowerCase()).toContain("delaware");
    expect(text).toMatch(/\[Page \d+\]/);
  }, 20000);

  it("recalls the prior answer from conversation history on a follow-up", async () => {
    const { status, text } = await sendChatMessage(cookie, contractId, "What governing law did you say earlier?");
    expect(status).toBe(200);
    expect(text.toLowerCase()).toContain("delaware");
  }, 20000);

  it("persists both turns in order, reusing a single session", async () => {
    const { status, body } = await getChatHistory(cookie, contractId);
    expect(status).toBe(200);
    expect(body.messages.length).toBe(4); // 2 user + 2 assistant
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[1].role).toBe("assistant");
  });

  it("rejects a message over 5000 characters with 422, no OpenAI call made", async () => {
    const { status, body } = await sendChatMessage(cookie, contractId, "a".repeat(5001));
    expect(status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
