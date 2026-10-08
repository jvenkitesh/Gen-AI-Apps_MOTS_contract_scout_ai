import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { submitFeedback } from "../helpers/contractApi";

// Priority: P1 -- feedback doesn't require extraction to have run, so this
// covers submit, upsert-on-resubmit, validation, and cross-user isolation
// using a single upload -- zero OpenAI cost.
describe("feedback-full", () => {
  let userA: TestUser;
  let userB: TestUser;
  let cookieA: string;
  let cookieB: string;
  let contractId: string;
  const filename = "Aurelios System NDA 1.pdf";

  beforeAll(async () => {
    userA = await createConfirmedTestUser("feedback-a");
    userB = await createConfirmedTestUser("feedback-b");
    cookieA = await loginAndGetCookieHeader(userA.email, userA.password);
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

  it("submits feedback and resubmission upserts the same row", async () => {
    const first = await submitFeedback(cookieA, contractId, "up", "Great tool!");
    expect(first.status).toBe(200);
    const feedbackId = first.body.feedback.id;

    const second = await submitFeedback(cookieA, contractId, "down", "Changed my mind");
    expect(second.status).toBe(200);
    expect(second.body.feedback.id).toBe(feedbackId);
    expect(second.body.feedback.rating).toBe("down");
    expect(second.body.feedback.comment).toBe("Changed my mind");
  });

  it("rejects a comment over 2000 characters with 422", async () => {
    const { status, body } = await submitFeedback(cookieA, contractId, "up", "a".repeat(2001));
    expect(status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("blocks userB from submitting feedback on userA's contract (404)", async () => {
    const { status } = await submitFeedback(cookieB, contractId, "up");
    expect(status).toBe(404);
  });
});
