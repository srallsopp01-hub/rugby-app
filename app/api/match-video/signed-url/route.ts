import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
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

  if (getR2ObjectOwner(storagePath) !== ctx.ownerUserId) {
    return NextResponse.json({ error: "You do not have access to this match video" }, { status: 403 });
  }

  const requestedExpiry = body.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;
  const expiresInSeconds = Math.max(1, Math.min(requestedExpiry, MAX_EXPIRY_SECONDS));
  const signedUrl = createR2PresignedUrl(config, "GET", storagePath, expiresInSeconds);

  return NextResponse.json({ signedUrl, expiresInSeconds });
}
