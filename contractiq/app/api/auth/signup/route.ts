import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Please wait a moment before trying again." },
        { status: 429 }
      );
    }
    if (error.code === "user_already_exists" || error.message?.toLowerCase().includes("already registered")) {
      return NextResponse.json(
        { error: "EMAIL_ALREADY_REGISTERED", message: "An account with this email already exists." },
        { status: 409 }
      );
    }
    // Unexpected/unhandled Supabase error -- worth server-side visibility,
    // while the client still only sees a generic message.
    console.error("[signup] unexpected Supabase error:", error.code, error.message);
    return NextResponse.json(
      { error: "AUTH_ERROR", message: "Something went wrong. Please try again." },
      { status: 401 }
    );
  }

  // Supabase returns a user with an empty `identities` array (no error) when
  // the email is already registered, to avoid leaking account existence via
  // error messages. Detect that case to show the correct, specific message.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return NextResponse.json(
      { error: "EMAIL_ALREADY_REGISTERED", message: "An account with this email already exists." },
      { status: 409 }
    );
  }

  return NextResponse.json({}, { status: 201 });
}
