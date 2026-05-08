import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createR2PresignedUrl,
  getR2Config,
  getR2ObjectOwner,
  isValidR2ObjectKey,
} from "@/lib/r2";

export const runtime = "nodejs";

const DEFAULT_EXPIRY_SECONDS = 60 * 60;
const MAX_EXPIRY_SECONDS = 24 * 60 * 60;

export async function POST(req: Request) {
  const ctx = await getServerTeamContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { config, missing } = getR2Config();
  if (!config) {
    return NextResponse.json(
      { error: `Cloudflare R2 is not configured. Missing: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  let body: { storagePath?: string; expiresInSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const storagePath = body.storagePath ?? "";
  if (!isValidR2ObjectKey(storagePath)) {
    return NextResponse.json({ error: "Invalid video storage path" }, { status: 400 });
  }

  const videoOwner = getR2ObjectOwner(storagePath);
  // Allow if the requester uploaded the video directly.
  // Also allow any active member of a team that owns a match stored at this path,
  // so assistant coaches can watch videos uploaded by the head coach (and vice versa).
  if (videoOwner !== ctx.userId && videoOwner !== ctx.ownerUserId) {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const { data: match } = await admin
      .from("saved_matches")
      .select("team_id")
      .eq("video_storage_path", storagePath)
      .maybeSingle();
    if (!match) {
      return NextResponse.json({ error: "You do not have access to this match video" }, { status: 403 });
    }
    const { data: membership } = await admin
      .from("team_members")
      .select("id")
      .eq("team_id", match.team_id)
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "You do not have access to this match video" }, { status: 403 });
    }
  }

  const requestedExpiry = body.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;
  const expiresInSeconds = Math.max(1, Math.min(requestedExpiry, MAX_EXPIRY_SECONDS));
  const signedUrl = createR2PresignedUrl(config, "GET", storagePath, expiresInSeconds);

  return NextResponse.json({ signedUrl, expiresInSeconds });
}
