import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const unconfirmed = error.message?.toLowerCase().includes("email not confirmed");
    return NextResponse.json(
      {
        error: unconfirmed ? "EMAIL_NOT_CONFIRMED" : "AUTH_ERROR",
        message: unconfirmed
          ? "Please verify your email first -- check your inbox."
          : "Invalid email or password.",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({}, { status: 200 });
}
