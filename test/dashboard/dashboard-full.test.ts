import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createConfirmedTestUser, deleteTestUser, loginAndGetCookieHeader, type TestUser } from "../helpers/testUser";
import { deleteStorageObject } from "../helpers/supabaseAdmin";
import { loadPdfAsFile, SAMPLE_NDA_PATH, SAMPLE_MSA_PATH } from "../helpers/fixtures";
import { uploadContract } from "../helpers/uploadHelpers";
import { getContracts, getDashboardSummary } from "../helpers/contractApi";

// Priority: P1 -- dashboard doesn't need extraction to have run, so this
// covers empty state, populated summary/list, sorting, and cross-user
// isolation using only 2 uploads -- zero OpenAI cost.
describe("dashboard-full", () => {
  let userA: TestUser;
  let userB: TestUser;
  let cookieA: string;
  let cookieB: string;
  let ndaId: string;
  let msaId: string;
  const ndaFile = "Aurelios System NDA 1.pdf";
  const msaFile = "Morningstar Inc MSA.pdf";

  beforeAll(async () => {
    userA = await createConfirmedTestUser("dash-a");
    userB = await createConfirmedTestUser("dash-b");
    cookieA = await loginAndGetCookieHeader(userA.email, userA.password);
    cookieB = await loginAndGetCookieHeader(userB.email, userB.password);
  });

  afterAll(async () => {
    await deleteStorageObject(`${userA.id}/${ndaId}/${ndaFile}`);
    await deleteStorageObject(`${userA.id}/${msaId}/${msaFile}`);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it("shows empty state before any uploads", async () => {
    const { status, body } = await getDashboardSummary(cookieA);
    expect(status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.recent).toEqual([]);
  });

  it("reflects uploads in the summary and list, sortable by name", async () => {
    const ndaUpload = await uploadContract(cookieA, await loadPdfAsFile(SAMPLE_NDA_PATH, ndaFile), "NDA");
    ndaId = ndaUpload.body.contract_id!;
    const msaUpload = await uploadContract(cookieA, await loadPdfAsFile(SAMPLE_MSA_PATH, msaFile), "MSA");
    msaId = msaUpload.body.contract_id!;

    const { body: summary } = await getDashboardSummary(cookieA);
    expect(summary.total).toBe(2);
    expect(summary.by_type).toEqual({ NDA: 1, MSA: 1 });

    const { body: sortedByName } = await getContracts(cookieA, "?sort=name&order=asc");
    expect(sortedByName.items.map((i: { original_filename: string }) => i.original_filename)).toEqual([
      ndaFile,
      msaFile,
    ]);
  });

  it("isolates userB's dashboard from userA's contracts", async () => {
    const { body } = await getDashboardSummary(cookieB);
    expect(body.total).toBe(0);
    const { body: list } = await getContracts(cookieB);
    expect(list.items).toEqual([]);
  });
});
