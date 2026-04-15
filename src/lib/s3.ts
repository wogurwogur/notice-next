import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;
const AWS_ENDPOINT = process.env.AWS_S3_ENDPOINT;
const AWS_PUBLIC_BASE_URL = process.env.AWS_S3_PUBLIC_BASE_URL;
const AWS_S3_PREFIX = (process.env.AWS_S3_PREFIX ?? "notices").replace(
  /^\/+|\/+$/g,
  ""
);
const AWS_FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

function assertS3Config() {
  if (!AWS_REGION) {
    throw new Error("AWS_REGION is not set");
  }
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(AWS_REGION)) {
    throw new Error("AWS_REGION format is invalid (example: ap-northeast-2)");
  }
  if (!AWS_BUCKET) {
    throw new Error("AWS_S3_BUCKET is not set");
  }
}

function normalizeObjectKey(key: string) {
  return key.replace(/^\/+/, "");
}

function getBucketHostCandidates() {
  if (!AWS_BUCKET) return [];
  const candidates = [
    `${AWS_BUCKET}.s3.amazonaws.com`,
    AWS_REGION ? `${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com` : "",
    AWS_REGION ? `${AWS_BUCKET}.s3-${AWS_REGION}.amazonaws.com` : "",
  ];
  return candidates.filter(Boolean);
}

export function resolveS3ObjectKeyFromSrc(src: string | null | undefined) {
  if (!src) return null;

  if (src.startsWith("/api/notice/image?src=")) {
    const encoded = src.split("src=")[1] ?? "";
    try {
      const decoded = decodeURIComponent(encoded);
      return resolveS3ObjectKeyFromSrc(decoded);
    } catch {
      return null;
    }
  }

  if (!src.includes("://")) {
    return normalizeObjectKey(src);
  }

  try {
    const url = new URL(src);
    const pathKey = normalizeObjectKey(url.pathname);

    if (AWS_PUBLIC_BASE_URL) {
      const base = new URL(AWS_PUBLIC_BASE_URL);
      if (url.origin === base.origin) {
        const basePath = base.pathname.replace(/^\/+|\/+$/g, "");
        if (!basePath) return pathKey;
        if (pathKey === basePath) return "";
        if (pathKey.startsWith(`${basePath}/`)) {
          return pathKey.slice(basePath.length + 1);
        }
      }
    }

    if (getBucketHostCandidates().includes(url.host)) {
      return pathKey;
    }
  } catch {
    return null;
  }

  return null;
}

export function toNoticeImageProxyUrl(src: string | null) {
  if (!src) return null;
  if (src.startsWith("/api/notice/image?src=")) return src;
  return `/api/notice/image?src=${encodeURIComponent(src)}`;
}

function buildS3Url(key: string) {
  if (AWS_PUBLIC_BASE_URL) {
    return `${AWS_PUBLIC_BASE_URL.replace(/\/+$/g, "")}/${key}`;
  }
  return `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

function getObjectKey(file: File) {
  const extByName = path.extname(file.name ?? "").toLowerCase();
  const ext =
    extByName && extByName.length <= 10
      ? extByName
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/gif"
          ? ".gif"
          : ".jpg";
  return `${AWS_S3_PREFIX}/${Date.now()}-${randomUUID()}${ext}`;
}

function getS3Client() {
  assertS3Config();

  const credentials =
    AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
          sessionToken: AWS_SESSION_TOKEN || undefined,
        }
      : undefined;

  return new S3Client({
    region: AWS_REGION,
    endpoint: AWS_ENDPOINT || undefined,
    forcePathStyle: AWS_FORCE_PATH_STYLE,
    credentials,
  });
}

export async function uploadNoticeImageToS3(file: File) {
  assertS3Config();
  const client = getS3Client();
  const key = getObjectKey(file);
  const body = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return {
    key,
    url: buildS3Url(key),
    originalName: file.name ?? null,
  };
}

export async function readNoticeImageFromS3(src: string) {
  assertS3Config();
  const key = resolveS3ObjectKeyFromSrc(src);
  if (!key) {
    throw new Error("Invalid S3 image source");
  }

  const client = getS3Client();
  const object = await client.send(
    new GetObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
    })
  );

  const bytes = object.Body
    ? await object.Body.transformToByteArray()
    : new Uint8Array();

  return {
    key,
    bytes,
    contentType: object.ContentType || "application/octet-stream",
    cacheControl: object.CacheControl || "public, max-age=300",
  };
}

export async function deleteNoticeImagesFromS3(keys: string[]) {
  if (keys.length === 0) return;

  assertS3Config();
  const client = getS3Client();
  const uniqueKeys = Array.from(new Set(keys)).filter(Boolean);
  if (uniqueKeys.length === 0) return;

  await client.send(
    new DeleteObjectsCommand({
      Bucket: AWS_BUCKET,
      Delete: {
        Objects: uniqueKeys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    })
  );
}
