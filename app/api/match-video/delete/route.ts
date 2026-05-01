import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import {
  deleteR2Object,
  getR2Config,
  getR2ObjectOwner,
  isValidR2ObjectKey,
} from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await getServerTeamContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.canManageTeam) {
    return NextResponse.json({ error: "Only head coaches can delete match videos" }, { status: 403 });
  }

  const { config, missing } = getR2Config();
  if (!config) {
    return NextResponse.json(
      { error: `Cloudflare R2 is not configured. Missing: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  let body: { storagePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const storagePath = body.storagePath ?? "";
  if (!isValidR2ObjectKey(storagePath)) {
    return NextResponse.json({ error: "Invalid video storage path" }, { status: 400 });
  }

  if (getR2ObjectOwner(storagePath) !== ctx.userId) {
    return NextResponse.json({ error: "You do not have access to this match video" }, { status: 403 });
  }

  const result = await deleteR2Object(config, storagePath);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Video delete failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
