import { APP_URL } from "./fixtures";

function headers(cookieHeader: string): HeadersInit {
  return { "Content-Type": "application/json", Cookie: cookieHeader };
}

export async function processContract(cookieHeader: string, contractId: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/process`, {
    method: "POST",
    headers: headers(cookieHeader),
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function getContract(cookieHeader: string, contractId: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function getPdfUrl(cookieHeader: string, contractId: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/pdf-url`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function patchTerm(cookieHeader: string, contractId: string, termId: string, value: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/terms/${termId}`, {
    method: "PATCH",
    headers: headers(cookieHeader),
    body: JSON.stringify({ value }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function deleteContract(cookieHeader: string, contractId: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}`, {
    method: "DELETE",
    headers: { Cookie: cookieHeader },
  });
  return { status: res.status };
}

/** Reads the full SSE stream to completion and returns the assembled text -- tests don't need live incremental chunks, just the final content. */
export async function sendChatMessage(cookieHeader: string, contractId: string, message: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/chat`, {
    method: "POST",
    headers: headers(cookieHeader),
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    return { status: res.status, text: "", body };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return { status: res.status, text, body: null as unknown };
}

export async function getChatHistory(cookieHeader: string, contractId: string) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/chat`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function getContracts(cookieHeader: string, query = "") {
  const res = await fetch(`${APP_URL}/api/contracts${query}`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function getDashboardSummary(cookieHeader: string) {
  const res = await fetch(`${APP_URL}/api/dashboard/summary`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function submitFeedback(
  cookieHeader: string,
  contractId: string,
  rating: "up" | "down",
  comment?: string
) {
  const res = await fetch(`${APP_URL}/api/contracts/${contractId}/feedback`, {
    method: "POST",
    headers: headers(cookieHeader),
    body: JSON.stringify({ rating, comment }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}
