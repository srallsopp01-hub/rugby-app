import { createClient } from "@/lib/supabase/server";
import { linkSquadPlayerToUser } from "@/lib/inviteServer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/coach";
  const inviteToken = searchParams.get("invite_token");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && inviteToken) {
      // Redeem the pending invite now that the user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const userEmail = user.email?.toLowerCase().trim();
        const { data: tokenRow } = await supabase
          .from("invite_tokens")
          .select("id, team_member_id, expires_at, used_at")
          .eq("token", inviteToken)
          .single();

        if (tokenRow && !tokenRow.used_at && new Date(tokenRow.expires_at) >= new Date()) {
          const { data: member } = await supabase
            .from("team_members")
            .select("id, role, player_squad_id, owner_user_id, email")
            .eq("id", tokenRow.team_member_id)
            .single();

          if (member && userEmail && member.email.toLowerCase().trim() === userEmail) {
            const { error: acceptError } = await supabase.from("team_members").update({
              member_user_id: user.id,
              status: "accepted",
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", member.id);

            if (acceptError) {
              return NextResponse.redirect(`${origin}/invite/accept?token=${inviteToken}`);
            }

            await supabase.from("invite_tokens")
              .update({ used_at: new Date().toISOString() })
              .eq("id", tokenRow.id);

            if (member.role === "player" && member.player_squad_id) {
              await linkSquadPlayerToUser({
                ownerUserId: member.owner_user_id,
                playerSquadId: member.player_squad_id,
                memberUserId: user.id,
              });
              return NextResponse.redirect(`${origin}/player`);
            }
          }
        }
      }
      return NextResponse.redirect(`${origin}/coach`);
    }

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
