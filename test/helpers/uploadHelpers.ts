import { APP_URL } from "./fixtures";

export interface UploadResult {
  status: number;
  body: {
    contract_id?: string;
    contract_type?: "NDA" | "MSA";
    page_count?: number;
    standard_terms?: string[];
    error?: string;
    message?: string;
  };
}

export async function uploadContract(
  cookieHeader: string,
  file: File,
  contractType: "NDA" | "MSA"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("contract_type", contractType);

  const res = await fetch(`${APP_URL}/api/contracts/upload`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function addCustomTerm(
  cookieHeader: string,
  contractId: string,
  termName: string
): Promise<{ status: number; body: { id?: string; term_name?: string; error?: string; message?: string } }> {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/custom-terms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ term_name: termName }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function deleteCustomTerm(
  cookieHeader: string,
  contractId: string,
  termId: string
): Promise<{ status: number }> {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/custom-terms/${termId}`, {
    method: "DELETE",
    headers: { Cookie: cookieHeader },
  });
  return { status: res.status };
}
