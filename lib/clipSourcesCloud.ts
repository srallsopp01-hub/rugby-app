import { createClient } from "@/lib/supabase/client";
import * as Sentry from "@sentry/nextjs";

export type VideoSource = {
  id: string;
  teamId: string;
  title: string;
  opponent: string | null;
  context: string | null;
  r2Path: string;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type DbVideoSourceRow = {
  id: string;
  team_id: string;
  title: string;
  opponent: string | null;
  context: string | null;
  r2_path: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  uploaded_by_user_id: string;
  created_at: string;
  updated_at: string;
};

function rowToVideoSource(row: DbVideoSourceRow): VideoSource {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    opponent: row.opponent,
    context: row.context,
    r2Path: row.r2_path,
    fileSizeBytes: row.file_size_bytes,
    durationSeconds: row.duration_seconds,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchVideoSources(
  teamId: string,
): Promise<{ sources: VideoSource[]; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("video_sources")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      Sentry.captureException(error, { tags: { helper: "fetchVideoSources" } });
      return { sources: [], error: error.message };
    }
    return {
      sources: ((data ?? []) as DbVideoSourceRow[]).map(rowToVideoSource),
    };
  } catch (err) {
    Sentry.captureException(err, { tags: { helper: "fetchVideoSources" } });
    return { sources: [], error: "Failed to load source videos" };
  }
}

export type UploadVideoSourceParams = {
  teamId: string;
  file: File;
  title: string;
  opponent?: string;
  context?: string;
  onProgress?: (pct: number) => void;
};

export type UploadVideoSourceResult =
  | { ok: true; source: VideoSource }
  | { ok: false; error: string };

export async function uploadVideoSource(
  params: UploadVideoSourceParams,
): Promise<UploadVideoSourceResult> {
  const { teamId, file, title, opponent, context, onProgress } = params;

  try {
    const presignRes = await fetch("/api/source-video/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        fileSize: file.size,
        contentType: file.type || "video/mp4",
      }),
    });

    if (!presignRes.ok) {
      const { error } = await presignRes.json().catch(() => ({ error: "Upload failed" }));
      return { ok: false, error: (error as string) ?? "Upload failed" };
    }
    const { uploadUrl, r2Path } = (await presignRes.json()) as {
      uploadUrl: string;
      r2Path: string;
    };

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.timeout = 0;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload was aborted"));
      xhr.send(file);
    });

    let durationSeconds: number | null = null;
    try {
      durationSeconds = await readVideoDurationFromFile(file);
    } catch {
      // Non-fatal — leave null
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("video_sources")
      .insert({
        team_id: teamId,
        title: title.trim(),
        opponent: opponent?.trim() || null,
        context: context?.trim() || null,
        r2_path: r2Path,
        file_size_bytes: file.size,
        duration_seconds: durationSeconds,
      })
      .select("*")
      .single();

    if (error || !data) {
      Sentry.captureException(error ?? new Error("Insert returned null"), {
        tags: { helper: "uploadVideoSource", phase: "insert" },
      });
      return { ok: false, error: error?.message ?? "Could not save source metadata" };
    }

    return { ok: true, source: rowToVideoSource(data as DbVideoSourceRow) };
  } catch (err) {
    Sentry.captureException(err, { tags: { helper: "uploadVideoSource" } });
    const message = err instanceof Error ? err.message : "Upload failed";
    return { ok: false, error: message };
  }
}

async function readVideoDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      const d = video.duration;
      URL.revokeObjectURL(url);
      if (Number.isFinite(d) && d > 0) resolve(Math.round(d));
      else reject(new Error("Could not read duration"));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video metadata load failed"));
    };
  });
}

export async function deleteVideoSource(
  source: VideoSource,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r2Res = await fetch("/api/source-video/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r2Path: source.r2Path }),
    });
    if (!r2Res.ok) {
      const { error } = await r2Res.json().catch(() => ({ error: "Delete failed" }));
      return { ok: false, error: (error as string) ?? "Delete failed" };
    }

    const supabase = createClient();
    const { error } = await supabase.from("video_sources").delete().eq("id", source.id);

    if (error) {
      Sentry.captureException(error, {
        tags: { helper: "deleteVideoSource", phase: "db" },
      });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { helper: "deleteVideoSource" } });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }
}

export async function getVideoSourceSignedUrl(
  r2Path: string,
): Promise<{ signedUrl: string | null; error?: string }> {
  try {
    const res = await fetch("/api/source-video/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r2Path }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to load video" }));
      return { signedUrl: null, error: (error as string) ?? "Failed to load video" };
    }
    const { signedUrl } = (await res.json()) as { signedUrl: string };
    return { signedUrl };
  } catch (err) {
    Sentry.captureException(err, { tags: { helper: "getVideoSourceSignedUrl" } });
    return {
      signedUrl: null,
      error: err instanceof Error ? err.message : "Failed to load video",
    };
  }
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
