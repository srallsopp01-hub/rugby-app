import { createClient } from "@/lib/supabase/server";
import { redeemInviteToken } from "@/lib/inviteServer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/coach";
  const inviteToken = searchParams.get("invite_token");
  const joinToken = searchParams.get("join_token");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && inviteToken) {
      // Redeem the pending invite now that the user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let memberEmail: string | null = null;
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
            .select("id, role, player_squad_id, email")
            .eq("id", tokenRow.team_member_id)
            .single();

          memberEmail = member?.email ?? null;

          if (member && userEmail && member.email.toLowerCase().trim() === userEmail) {
            if (member.role === "player") {
              return NextResponse.redirect(
                `${origin}/invite/accept?token=${inviteToken}&email=${encodeURIComponent(member.email)}`
              );
            }

            const result = await redeemInviteToken({
              supabase,
              token: inviteToken,
              user,
            });

            if (result.ok) return NextResponse.redirect(`${origin}/coach`);
          }
        }
      }
      return NextResponse.redirect(
        `${origin}/invite/accept?token=${inviteToken}${memberEmail ? `&email=${encodeURIComponent(memberEmail)}` : ""}`
      );
    }

    if (!error) {
      if (joinToken) {
        return NextResponse.redirect(`${origin}/invite/join?token=${joinToken}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
