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

type UploadUrlResponse = {
  storagePath?: string;
  uploadUrl?: string;
  error?: string;
};

type SignedUrlResponse = {
  signedUrl?: string;
  error?: string;
};

function xhrUpload(
  url: string,
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
        error: xhr.responseText || `R2 upload failed with status ${xhr.status}`,
      });
    });
    xhr.addEventListener("error", () => finish({ ok: false, error: "Network error during video upload" }));
    xhr.addEventListener("timeout", () => finish({ ok: false, error: "Cloud upload timed out" }));

    xhr.open("PUT", url);
    xhr.timeout = 0;
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

async function readApiJson<T extends { error?: string }>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function uploadMatchVideoWithResult(
  matchId: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<VideoUploadResult> {
  try {
    const response = await fetch("/api/match-video/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });
    const data = await readApiJson<UploadUrlResponse>(response);

    if (!data.storagePath || !data.uploadUrl) {
      return { storagePath: null, error: "R2 upload URL response was incomplete" };
    }

    const upload = await xhrUpload(data.uploadUrl, file, onProgress);
    if (!upload.ok) {
      return { storagePath: null, error: upload.error || "Video upload failed" };
    }

    onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
    return { storagePath: data.storagePath };
  } catch (error) {
    return {
      storagePath: null,
      error: error instanceof Error ? error.message : "Video upload failed",
    };
  }
}

export async function uploadMatchVideo(
  matchId: string,
  file: File,
  onProgress?: (p: VideoUploadProgress) => void
): Promise<string | null> {
  const result = await uploadMatchVideoWithResult(matchId, file, onProgress);
  return result.storagePath;
}

export type VideoSignedUrlResult = { url: string | null; error?: string };

export async function getMatchVideoSignedUrlWithResult(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<VideoSignedUrlResult> {
  try {
    const response = await fetch("/api/match-video/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath, expiresInSeconds }),
    });
    const data = await readApiJson<SignedUrlResponse>(response);
    return { url: data.signedUrl ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load video";
    return { url: null, error: message };
  }
}

export async function getMatchVideoSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const result = await getMatchVideoSignedUrlWithResult(storagePath, expiresInSeconds);
  return result.url;
}

export async function refreshVideoSignedUrl(storagePath: string): Promise<string | null> {
  return getMatchVideoSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
}

export async function deleteMatchVideo(storagePath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/match-video/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath }),
    });
    const data = await readApiJson<{ success?: boolean; error?: string }>(response);
    return data.success ? { ok: true } : { ok: false, error: "Video delete failed" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Video delete failed",
    };
  }
}
