import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import {
  createMatchVideoObjectKey,
  createR2PresignedUrl,
  getR2Config,
} from "@/lib/r2";

export const runtime = "nodejs";

const UPLOAD_URL_EXPIRY_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const ctx = await getServerTeamContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.canManageTeam) {
    return NextResponse.json({ error: "Only head coaches can upload match videos" }, { status: 403 });
  }

  const { config, missing } = getR2Config();
  if (!config) {
    return NextResponse.json(
      { error: `Cloudflare R2 is not configured. Missing: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  let body: { matchId?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.matchId || !body.filename) {
    return NextResponse.json({ error: "matchId and filename are required" }, { status: 400 });
  }

  const storagePath = createMatchVideoObjectKey(ctx.ownerUserId, body.matchId, body.filename);
  const uploadUrl = createR2PresignedUrl(config, "PUT", storagePath, UPLOAD_URL_EXPIRY_SECONDS);

  return NextResponse.json({ storagePath, uploadUrl, expiresInSeconds: UPLOAD_URL_EXPIRY_SECONDS });
}
