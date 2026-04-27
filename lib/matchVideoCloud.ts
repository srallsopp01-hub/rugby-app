import { createClient } from "@/lib/supabase/client";

const BUCKET = "match-videos";

export type VideoUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

function xhrUpload(
  url: string,
  token: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
    xhr.addEventListener("error", () => resolve(false));

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}

export async function uploadMatchVideo(
  matchId: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<string | null> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const filename = sanitizeFilename(file.name);
  const storagePath = `${user.id}/${matchId}/${filename}`;
  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`;

  const ok = await xhrUpload(url, token, file, onProgress);
  return ok ? storagePath : null;
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

export async function deleteMatchVideo(storagePath: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([storagePath]);
  } catch {
    return;
  }
}
