import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("id, owner_user_id, status")
    .eq("id", body.memberId)
    .eq("status", "pending_approval")
    .single();

  if (fetchError || !member) {
    return NextResponse.json({ error: "Member not found or not pending approval" }, { status: 404 });
  }

  const ownerIsUser = member.owner_user_id === user.id;
  if (!ownerIsUser) {
    const { data: callerMembership } = await supabase
      .from("team_members")
      .select("can_manage_team")
      .eq("owner_user_id", member.owner_user_id)
      .eq("member_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!callerMembership?.can_manage_team) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("team_members")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ error: "Failed to reject member" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
