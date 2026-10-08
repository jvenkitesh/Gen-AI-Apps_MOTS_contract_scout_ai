import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!contract) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data: feedback, error } = await supabase
    .from("user_feedback")
    .upsert(
      {
        contract_id: contract.id,
        user_id: user.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
      { onConflict: "contract_id,user_id" }
    )
    .select()
    .single();

  if (error || !feedback) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ feedback }, { status: 200 });
}
