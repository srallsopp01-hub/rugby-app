import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import { isValidR2SourceVideoKey, createR2PresignedUrl, getR2Config } from "@/lib/r2";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

const SIGNED_URL_EXPIRY_SECONDS = 86400; // 24 hours, matches match-video pattern

export async function POST(request: Request) {
  try {
    const ctx = await getServerTeamContext();
    if (!ctx) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { config, missing } = getR2Config();
    if (!config) {
      return NextResponse.json(
        { error: `Cloudflare R2 is not configured. Missing: ${missing.join(", ")}` },
        { status: 500 },
      );
    }

    let body: { r2Path?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { r2Path } = body;

    if (!r2Path || typeof r2Path !== "string") {
      return NextResponse.json({ error: "r2Path is required" }, { status: 400 });
    }
    if (!isValidR2SourceVideoKey(r2Path)) {
      return NextResponse.json({ error: "Invalid source video path" }, { status: 400 });
    }

    // Ownership check: r2Path is {teamId}/sources/... so first segment is teamId
    const pathTeamId = r2Path.split("/")[0];
    if (pathTeamId !== ctx.teamId) {
      return NextResponse.json(
        { error: "You do not have access to this source video" },
        { status: 403 },
      );
    }

    const signedUrl = createR2PresignedUrl(config, "GET", r2Path, SIGNED_URL_EXPIRY_SECONDS);
    return NextResponse.json({ signedUrl, expiresIn: SIGNED_URL_EXPIRY_SECONDS });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "source-video/signed-url" } });
    return NextResponse.json({ error: "Could not create signed URL" }, { status: 500 });
  }
}
