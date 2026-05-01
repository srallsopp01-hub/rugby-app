import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redeemInviteToken } from "@/lib/inviteServer";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: string; playerSquadId?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const result = await redeemInviteToken({
    supabase,
    token,
    user,
    playerSquadId: body.playerSquadId,
    displayName: body.displayName,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    role: result.role,
    ownerUserId: result.ownerUserId,
    playerSquadId: result.playerSquadId,
  });
}
