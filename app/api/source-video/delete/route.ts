import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import { isValidR2SourceVideoKey, deleteR2Object, getR2Config } from "@/lib/r2";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await getServerTeamContext();
    if (!ctx) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!ctx.canManageTeam) {
      return NextResponse.json(
        { error: "Only head coaches can delete source videos" },
        { status: 403 },
      );
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

    const pathTeamId = r2Path.split("/")[0];
    if (pathTeamId !== ctx.teamId) {
      return NextResponse.json({ error: "You do not own this source video" }, { status: 403 });
    }

    const { ok, error } = await deleteR2Object(config, r2Path);
    if (!ok) {
      Sentry.captureException(new Error(error ?? "R2 delete failed"), {
        tags: { route: "source-video/delete" },
      });
      return NextResponse.json({ error: error ?? "Could not delete source video" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "source-video/delete" } });
    return NextResponse.json({ error: "Could not delete source video" }, { status: 500 });
  }
}
