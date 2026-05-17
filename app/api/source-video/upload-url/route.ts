import { NextResponse } from "next/server";
import { getServerTeamContext } from "@/lib/serverTeamContext";
import { createVideoSourceObjectKey, createR2PresignedUrl, getR2Config } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

const MAX_SOURCES_PER_TEAM = 20;
const MAX_SOURCE_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const UPLOAD_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

export async function POST(request: Request) {
  try {
    const ctx = await getServerTeamContext();
    if (!ctx) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!ctx.canManageTeam) {
      return NextResponse.json(
        { error: "Only head coaches can upload source videos" },
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

    let body: { filename?: string; fileSize?: number; contentType?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { filename, fileSize } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }
    if (typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "fileSize is required" }, { status: 400 });
    }
    if (fileSize > MAX_SOURCE_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(MAX_SOURCE_FILE_SIZE_BYTES / (1024 * 1024 * 1024))} GB.` },
        { status: 413 },
      );
    }

    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("video_sources")
      .select("id", { count: "exact", head: true })
      .eq("team_id", ctx.teamId);

    if (countError) {
      Sentry.captureException(countError, {
        tags: { route: "source-video/upload-url", phase: "count" },
      });
      return NextResponse.json(
        { error: "Could not check source limit. Please try again." },
        { status: 500 },
      );
    }
    if ((count ?? 0) >= MAX_SOURCES_PER_TEAM) {
      return NextResponse.json(
        { error: `You've reached the source video limit (${MAX_SOURCES_PER_TEAM}). Delete one to upload more.` },
        { status: 409 },
      );
    }

    const r2Path = createVideoSourceObjectKey(ctx.teamId, filename);
    const uploadUrl = createR2PresignedUrl(config, "PUT", r2Path, UPLOAD_URL_EXPIRY_SECONDS);

    return NextResponse.json({ uploadUrl, r2Path });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "source-video/upload-url" } });
    return NextResponse.json({ error: "Could not create upload URL" }, { status: 500 });
  }
}
