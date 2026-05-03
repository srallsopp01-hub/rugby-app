import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type InviteMember = {
  id: string;
  email: string;
  status: string;
};

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { memberId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  if (!body.memberId || !email) {
    return NextResponse.json({ error: "memberId and email are required" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, email, status")
    .eq("id", body.memberId)
    .single<InviteMember>();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.status !== "invited") {
    return NextResponse.json(
      { error: "Only pending invite emails can be changed" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("team_members")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update invite email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, email });
}
