import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    token?: string;
    join_token?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password, name, token, join_token: joinToken } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  if (!token && !joinToken) {
    return NextResponse.json({ error: "token or join_token is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const normalizedEmail = email.toLowerCase().trim();
  let userRole: "player" | "coach" = "player";

  if (token) {
    // Email invite path: validate against invite_tokens table
    const { data: tokenRow } = await supabase
      .from("invite_tokens")
      .select("id, expires_at, used_at, team_member_id")
      .eq("token", token)
      .single();

    if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 400 });
    }

    const { data: memberRow } = await admin
      .from("team_members")
      .select("email, role")
      .eq("id", tokenRow.team_member_id)
      .single();

    if (!memberRow) {
      return NextResponse.json({ error: "Invite not found" }, { status: 400 });
    }

    if (memberRow.email.toLowerCase().trim() !== normalizedEmail) {
      return NextResponse.json({ error: "Email does not match invite" }, { status: 400 });
    }

    userRole = memberRow.role === "player" ? "player" : "coach";
  } else if (joinToken) {
    // Link invite path: validate against team_invite_links table
    const { data: linkRow } = await supabase
      .from("team_invite_links")
      .select("id, is_active, expires_at, consumed_at, pre_filled_email, role")
      .eq("token", joinToken)
      .single();

    if (!linkRow || !linkRow.is_active) {
      return NextResponse.json({ error: "Invalid or inactive invite link" }, { status: 400 });
    }

    if (linkRow.expires_at && new Date(linkRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite link has expired" }, { status: 400 });
    }

    if (linkRow.consumed_at) {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    }

    // Pre-filled links: enforce email match
    if (linkRow.pre_filled_email) {
      if (linkRow.pre_filled_email.toLowerCase().trim() !== normalizedEmail) {
        return NextResponse.json({ error: "Email does not match invite" }, { status: 400 });
      }
    }

    userRole = linkRow.role === "assistant_coach" ? "coach" : "player";
  }

  // Create pre-confirmed user — skips Supabase's verification email entirely
  const userMeta =
    userRole === "player"
      ? { account_role: "player" }
      : { coach_name: name ?? "" };

  // Check for an existing (including soft-deleted) user before attempting creation.
  // Soft-deleted users in Supabase cause createUser to fail with a transport-level error
  // rather than a clean JSON error, which would surface as "Load failed" in the UI.
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = listData?.users?.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );
  if (existingUser) {
    return NextResponse.json({ ok: true, userExists: true });
  }

  let createError: Error | null = null;
  try {
    const { error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: userMeta,
    });
    createError = error ?? null;
  } catch (err) {
    createError = err instanceof Error ? err : new Error(String(err));
  }

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? "";
    const alreadyExists =
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already exists") ||
      (createError as { code?: string }).code === "email_exists";
    if (alreadyExists) {
      return NextResponse.json({ ok: true, userExists: true });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
