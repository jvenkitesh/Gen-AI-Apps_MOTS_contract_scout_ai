import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../");

export const APP_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

const TEST_CONTRACTS_DIR = path.join(REPO_ROOT, "test_contracts");
export const SAMPLE_NDA_PATH = path.join(TEST_CONTRACTS_DIR, "Aurelios System NDA 1.pdf");
export const SAMPLE_MSA_PATH = path.join(TEST_CONTRACTS_DIR, "Morningstar Inc MSA.pdf");

export async function loadPdfAsFile(filePath: string, filename: string): Promise<File> {
  const buffer = await readFile(filePath);
  return new File([buffer], filename, { type: "application/pdf" });
}

/** An 11MB buffer -- big enough to trip the 10MB upload limit, no real PDF needed. */
export function oversizeFile(): File {
  const buffer = Buffer.alloc(11 * 1024 * 1024, 0);
  return new File([buffer], "oversize.pdf", { type: "application/pdf" });
}

/**
 * A syntactically broken PDF (invalid xref table) -- enough to make
 * pdf-parse throw, which is exactly what UNREADABLE_PDF handling exists for.
 * No PDF library needed to generate it; a minimal hand-rolled PDF with a
 * deliberately wrong xref offset is sufficient and doesn't need to be valid.
 */
export function malformedPdfFile(): File {
  const content =
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
    "xref\n0 4\n0000000000 65535 f \n0000000001 00000 n \n0000000002 00000 n \n0000000003 00000 n \n" +
    "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF";
  return new File([Buffer.from(content, "latin1")], "malformed.pdf", { type: "application/pdf" });
}
