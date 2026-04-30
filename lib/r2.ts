import { createHmac, createHash, randomUUID } from "crypto";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

const R2_REGION = "auto";
const R2_SERVICE = "s3";
const MAX_SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export function getR2Config(): { config: R2Config | null; missing: string[] } {
  const env = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  };

  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) return { config: null, missing };

  return {
    config: {
      accountId: env.R2_ACCOUNT_ID!,
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      bucketName: env.R2_BUCKET_NAME!,
    },
    missing: [],
  };
}

export function sanitizeR2Filename(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  return sanitized || "match-video";
}

export function isValidR2ObjectKey(key: string): boolean {
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("..")) return false;
  const segments = key.split("/");
  return segments.length >= 3 && segments.every(Boolean);
}

export function getR2ObjectOwner(key: string): string | null {
  if (!isValidR2ObjectKey(key)) return null;
  return key.split("/")[0] || null;
}

export function createMatchVideoObjectKey(ownerUserId: string, matchId: string, filename: string) {
  const safeMatchId = matchId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeFilename = sanitizeR2Filename(filename);
  const uniquePrefix = `${Date.now()}-${randomUUID()}`;
  return `${ownerUserId}/${safeMatchId}/${uniquePrefix}-${safeFilename}`;
}

export function createR2PresignedUrl(
  config: R2Config,
  method: "GET" | "PUT" | "DELETE",
  key: string,
  expiresInSeconds: number
): string {
  const expires = Math.max(1, Math.min(expiresInSeconds, MAX_SIGNED_URL_EXPIRY_SECONDS));
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodePathSegment(config.bucketName)}/${key
    .split("/")
    .map(encodePathSegment)
    .join("/")}`;

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };

  const canonicalQueryString = canonicalQuery(queryParams);
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmacHex(getSigningKey(config.secretAccessKey, dateStamp), stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function deleteR2Object(config: R2Config, key: string): Promise<{ ok: boolean; error?: string }> {
  const url = createR2PresignedUrl(config, "DELETE", key, 60);
  const response = await fetch(url, { method: "DELETE" });
  if (response.ok || response.status === 404) return { ok: true };

  const details = await response.text().catch(() => "");
  return {
    ok: false,
    error: details || `R2 delete failed with status ${response.status}`,
  };
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function canonicalQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodePathSegment(key)}=${encodePathSegment(params[key])}`)
    .join("&");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSigningKey(secretAccessKey: string, dateStamp: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, R2_REGION);
  const serviceKey = hmac(regionKey, R2_SERVICE);
  return hmac(serviceKey, "aws4_request");
}
