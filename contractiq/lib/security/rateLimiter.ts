import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60 * 1000 }, // 10 requests / minute
  chat: { limit: 30, windowMs: 60 * 1000 }, // 30 requests / minute
  process: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 requests / hour
  upload: { limit: 20, windowMs: 24 * 60 * 60 * 1000 }, // 20 uploads / day
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

// `identifier` is "user:<uuid>" for authenticated actions (chat, process,
// upload) or "ip:<address>" for pre-auth actions (login, signup) -- login
// and signup must be rate-limited before a user_id exists (or even before
// we know if the attempted email is real), so this can't be keyed by
// user_id alone. Use getClientIp() below to build the pre-auth identifier.
export async function checkRateLimit(identifier: string, action: RateLimitAction): Promise<RateLimitResult> {
  const { limit, windowMs } = RATE_LIMITS[action];
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const { count } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= limit) {
    const { data: oldest } = await admin
      .from("rate_limit_events")
      .select("created_at")
      .eq("identifier", identifier)
      .eq("action", action)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const oldestMs = oldest ? new Date(oldest.created_at).getTime() : Date.now();
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestMs + windowMs - Date.now()) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  await admin.from("rate_limit_events").insert({ identifier, action });
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "RATE_LIMITED", message: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// Netlify Functions (and most proxies/CDNs) set x-forwarded-for; the first
// entry is the original client. Falls back to a constant so a missing
// header degrades to "one shared bucket" rather than throwing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
