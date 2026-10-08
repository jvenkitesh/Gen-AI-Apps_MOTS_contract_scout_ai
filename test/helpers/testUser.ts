import { randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabaseAdmin";
import { APP_URL } from "./fixtures";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** Unique per call so parallel/repeated test runs never collide. */
export function uniqueTestEmail(label: string): string {
  return `contractiq.e2e.${label}.${randomUUID().slice(0, 8)}@example.com`;
}

export async function createConfirmedTestUser(
  label: string,
  password = "TestPassword123"
): Promise<TestUser> {
  const email = uniqueTestEmail(label);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createConfirmedTestUser(${label}) failed: ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

export async function createUnconfirmedTestUser(
  label: string,
  password = "TestPassword123"
): Promise<TestUser> {
  const email = uniqueTestEmail(label);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });
  if (error || !data.user) {
    throw new Error(`createUnconfirmedTestUser(${label}) failed: ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

/** Deletes the auth user -- cascades to profiles/contracts/custom_key_terms. */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`deleteTestUser(${userId}) failed: ${error.message}`);
  }
}

/** For users created through the app's own signup API (not admin.createUser),
 *  where we don't already have the id -- used only for test cleanup. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(`findUserIdByEmail failed: ${error.message}`);
  return data.users.find((u: User) => u.email === email)?.id ?? null;
}

/** Logs in via the app's real API route and returns a Cookie header value. */
export async function loginAndGetCookieHeader(email: string, password: string): Promise<string> {
  const res = await fetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`loginAndGetCookieHeader failed: ${res.status} ${await res.text()}`);
  }
  const setCookies = res.headers.getSetCookie();
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}
