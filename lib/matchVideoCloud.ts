import { createClient } from "@/lib/supabase/client";
import { getMyTeamContext } from "@/lib/teamContext";

const BUCKET = "match-videos";
const DIRECT_UPLOAD_TIMEOUT_MS = 0;

export const SIGNED_URL_EXPIRY_SECONDS = 86400;

export type VideoUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type VideoUploadResult = {
  storagePath: string | null;
  error?: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

function xhrUpload(
  url: string,
  token: string,
  anonKey: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const finish = (result: { ok: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish({ ok: true });
        return;
      }
      finish({
        ok: false,
        error: xhr.responseText || `Storage upload failed with status ${xhr.status}`,
      });
    });
    xhr.addEventListener("error", () => finish({ ok: false, error: "Network error during video upload" }));
    xhr.addEventListener("timeout", () =>
      finish({
        ok: false,
        error: "Cloud upload timed out while finalising; retrying with fallback upload",
      })
    );

    xhr.open("POST", url);
    xhr.timeout = DIRECT_UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anonKey);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}

export async function uploadMatchVideoWithResult(
  matchId: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<VideoUploadResult> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { storagePath: null, error: "Sign in before uploading match video" };

  const ctx = await getMyTeamContext();
  if (!ctx?.canManageTeam) {
    return { storagePath: null, error: "This account does not have head coach upload permissions" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { storagePath: null, error: "Supabase environment is not configured" };
  }

  const filename = sanitizeFilename(file.name);
  const storagePath = `${ctx.ownerUserId}/${matchId}/${filename}`;
  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`;

  const upload = await xhrUpload(url, token, anonKey, file, onProgress);
  if (upload.ok) return { storagePath };

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (!error) {
    onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
    return { storagePath };
  }

  return {
    storagePath: null,
    error: error.message || upload.error || "Video upload failed",
  };
}

export async function uploadMatchVideo(
  matchId: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<string | null> {
  const result = await uploadMatchVideoWithResult(matchId, file, onProgress);
  return result.storagePath;
}

export async function getMatchVideoSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function refreshVideoSignedUrl(storagePath: string): Promise<string | null> {
  return getMatchVideoSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
}

export async function deleteMatchVideo(storagePath: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([storagePath]);
  } catch {
    return;
  }
}
