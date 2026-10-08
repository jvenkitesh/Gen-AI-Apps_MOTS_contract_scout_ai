import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConfirmedTestUser, deleteTestUser, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_NDA_PATH = path.resolve(__dirname, "../../test_contracts/Aurelios System NDA 1.pdf");

test.setTimeout(90000); // real OpenAI calls (extraction + chat) are involved

// Priority: P0 -- the one test in the whole suite that drives the actual
// rendered UI end to end: real clicks, a real file upload, watching the
// auto-triggered processing banner appear and disappear, inline-editing a
// term by clicking it, and watching a real streamed chat response render.
// None of this is verifiable from the API-level test suite alone.
test("contract-golden-path: upload -> process -> results -> inline edit -> feedback -> chat, all via real UI interaction", async ({
  page,
}) => {
  const user: TestUser = await createConfirmedTestUser("e2e-golden");
  let contractId: string | undefined;

  try {
    // --- Login ---
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // --- Navigate to upload ---
    await page.getByRole("link", { name: "Review a Contract" }).click();
    await expect(page).toHaveURL(/\/contracts\/upload$/);

    // --- Select type, upload the real sample file ---
    await page.getByRole("button", { name: "NDA", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_NDA_PATH);

    // --- Pre-processing preview renders with the real standard term list ---
    await expect(page.getByText(/Standard terms for NDA/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Effective Date", { exact: true })).toBeVisible();

    // --- Trigger processing, land on the results page ---
    await page.getByRole("button", { name: "Process Contract" }).click();
    await expect(page).toHaveURL(/\/contracts\/[0-9a-f-]+$/);
    contractId = page.url().split("/contracts/")[1];

    // --- Processing is auto-triggered by the page; wait for the real
    //     extraction call to complete and the banner to clear ---
    await expect(page.getByText(/Analysing with AI/i)).toBeVisible();
    const governingLawRow = page.getByTestId("term-row-Governing Law");
    await expect(governingLawRow).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Analysing with AI/i)).not.toBeVisible();

    // --- Inline correction via a real click + type + save ---
    await governingLawRow.getByTestId("term-value-button").click();
    await governingLawRow.locator("input").fill("Corrected via Playwright");
    await governingLawRow.getByRole("button", { name: "Save" }).click();
    await expect(governingLawRow.getByText("Edited")).toBeVisible();
    await expect(governingLawRow.getByText("Corrected via Playwright")).toBeVisible();

    // --- Feedback (before opening chat, which occupies the same screen area) ---
    await page.getByLabel("Thumbs up").click();
    await expect(page.getByText("Thanks for your feedback!")).toBeVisible();

    // --- Chat: open panel, send a real message, see a real streamed,
    //     grounded response render ---
    await page.getByRole("button", { name: "Chat with Contract" }).click();
    await page.getByPlaceholder("Ask a question about this contract...").fill("What is the effective date?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/Based on the document/i)).toBeVisible({ timeout: 20000 });
  } finally {
    if (contractId) {
      await deleteStorageObject(`${user.id}/${contractId}/Aurelios System NDA 1.pdf`);
    }
    await deleteTestUser(user.id);
  }
});
