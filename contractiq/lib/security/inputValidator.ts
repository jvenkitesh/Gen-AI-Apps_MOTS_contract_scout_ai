import { z } from "zod";
import { MAX_FILE_SIZE_BYTES, MAX_MESSAGE_LENGTH } from "@/lib/security/tokenLimiter";

// Centralized, reusable Zod schemas -- each API route previously defined
// its own inline copy of these; routes now import from here instead.
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const customTermSchema = z.object({
  term_name: z.string().min(2).max(100),
});

export const feedbackSchema = z.object({
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).optional(),
});

export const chatMessageSchema = z.object({ message: z.string().min(1).max(MAX_MESSAGE_LENGTH) });

export const termPatchSchema = z.object({ value: z.string().min(1) });

// The app only ever extracts text from PDFs (lib/pdf/extractText.ts is
// pdf-parse only) -- unlike the security-foundation skill's generic
// ".pdf, .docx" template, allowing .docx here would accept files the app
// cannot actually process. PDF-only matches real capability.
const ALLOWED_EXTENSIONS = [".pdf"];
const BLOCKED_EXTENSIONS = [".exe", ".js", ".mjs", ".cjs", ".php", ".zip", ".sh", ".bat", ".cmd", ".py", ".rb", ".ps1"];

export type FileValidationResult = { valid: true } | { valid: false; error: string; message: string };

// Order matters: extension (blocklist, then allowlist) -> MIME type -> size.
export function validateFileUpload(file: File): FileValidationResult {
  const name = file.name.toLowerCase();
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";

  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: "VALIDATION_ERROR", message: "This file type is not allowed." };
  }
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: "VALIDATION_ERROR", message: "Only PDF files are supported." };
  }
  if (file.type !== "application/pdf") {
    return { valid: false, error: "VALIDATION_ERROR", message: "Only PDF files are supported." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "VALIDATION_ERROR", message: "File must be 10MB or smaller." };
  }

  return { valid: true };
}
