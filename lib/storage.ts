import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { del, get, list, put } from "@vercel/blob";

/**
 * File storage for uploads and backups. The server's disk isn't kept between requests, so live files go to:
 * - an S3 bucket on AWS (when S3_BUCKET is set), or
 * - the project's private Vercel Blob store (on Vercel).
 * Without either (local development) files go to data/files on disk.
 * Everything is private: images are served through /media/…, receipts and backups only to staff.
 */
// Same rule as the database: live storage in production (or with USE_LIVE_SERVICES=1), local files in development.
const live = (process.env.NODE_ENV === "production" || process.env.USE_LIVE_SERVICES === "1") && process.env.USE_LOCAL_DATA !== "1";
const bucket = process.env.S3_BUCKET;
export const usesS3 = live && !!bucket;
export const usesBlob = live && !usesS3 && !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
export const STORAGE_NAME = usesS3 ? "the store's private Amazon S3 bucket" : usesBlob ? "the store's private Vercel Blob storage" : "data/files on this computer";

// On AWS the function's own role grants access; locally the AWS profile or env keys are used.
// Local copy of S3 files on the server's disk (FILE_CACHE_DIR): uploads never change once written,
// so each photo is fetched from S3 once and then served from disk.
const cacheDir = process.env.FILE_CACHE_DIR;
const cachePath = (p: string) => (cacheDir ? path.join(cacheDir, p) : null);
async function cacheWrite(p: string, body: Buffer) {
  const file = cachePath(p);
  if (!file) return;
  await fs.mkdir(path.dirname(file), { recursive: true }).catch(() => {});
  await fs.writeFile(file, body).catch(() => {});
}

let s3Client: S3Client | undefined;
const s3 = () => (s3Client ??= new S3Client({ region: process.env.S3_REGION || process.env.AWS_REGION || "eu-west-1" }));
const isMissing = (e: unknown) => {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err?.name === "NoSuchKey" || err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404;
};

const LOCAL_ROOT = path.join(process.cwd(), "data", "files");

/** Only plain relative paths like "uploads/123-abc.jpg" are allowed. */
export function safePathname(pathname: string) {
  const clean = pathname.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.split("/").some((p) => !p || p === "." || p === ".." || !/^[\w.-]+$/.test(p))) return null;
  return clean;
}

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  sql: "application/sql",
};
export const contentTypeOf = (pathname: string) => CONTENT_TYPES[pathname.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

export async function putFile(pathname: string, body: Buffer | string, contentType = contentTypeOf(pathname)) {
  const p = safePathname(pathname);
  if (!p) throw new Error("Invalid file name");
  if (usesS3) {
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: p, Body: body, ContentType: contentType }));
    if (p.startsWith("uploads/")) await cacheWrite(p, Buffer.isBuffer(body) ? body : Buffer.from(body));
    return;
  }
  if (usesBlob) {
    await put(p, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  const file = path.join(LOCAL_ROOT, p);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}

/** The file as a stream, or null when it doesn't exist. */
export async function readFile(pathname: string): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string; size?: number } | null> {
  const p = safePathname(pathname);
  if (!p) return null;
  if (usesS3) {
    const cached = p.startsWith("uploads/") ? cachePath(p) : null;
    if (cached) {
      const body = await fs.readFile(cached).catch(() => null);
      if (body) return { body, contentType: contentTypeOf(p), size: body.length };
    }
    try {
      const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: p }));
      if (!res.Body) return null;
      if (cached) {
        const body = Buffer.from(await res.Body.transformToByteArray());
        await cacheWrite(p, body);
        return { body, contentType: res.ContentType || contentTypeOf(p), size: body.length };
      }
      return { body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>, contentType: res.ContentType || contentTypeOf(p), size: res.ContentLength };
    } catch (e) {
      if (isMissing(e)) return null;
      throw e;
    }
  }
  if (usesBlob) {
    const res = await get(p, { access: "private" }).catch(() => null);
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType || contentTypeOf(p), size: res.blob.size };
  }
  try {
    const body = await fs.readFile(path.join(LOCAL_ROOT, p));
    return { body, contentType: contentTypeOf(p), size: body.length };
  } catch {
    return null;
  }
}

export type StoredFile = { pathname: string; size: number; uploadedAt: number };

export async function listFiles(prefix: string): Promise<StoredFile[]> {
  if (usesS3) {
    const out: StoredFile[] = [];
    let token: string | undefined;
    do {
      const page = await s3().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
      for (const o of page.Contents ?? []) {
        if (o.Key) out.push({ pathname: o.Key, size: o.Size ?? 0, uploadedAt: Math.floor((o.LastModified?.getTime() ?? 0) / 1000) });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return out;
  }
  if (usesBlob) {
    const out: StoredFile[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const b of page.blobs) out.push({ pathname: b.pathname, size: b.size, uploadedAt: Math.floor(new Date(b.uploadedAt).getTime() / 1000) });
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  }
  const dir = path.join(LOCAL_ROOT, prefix);
  try {
    const names = await fs.readdir(dir);
    return Promise.all(
      names.map(async (name) => {
        const st = await fs.stat(path.join(dir, name));
        return { pathname: `${prefix.replace(/\/?$/, "/")}${name}`, size: st.size, uploadedAt: Math.floor(st.mtimeMs / 1000) };
      }),
    );
  } catch {
    return [];
  }
}

export async function deleteFile(pathname: string) {
  const p = safePathname(pathname);
  if (!p) return;
  if (usesS3) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: p }));
    const cached = cachePath(p);
    if (cached) await fs.rm(cached, { force: true });
  }
  else if (usesBlob) await del(p);
  else await fs.rm(path.join(LOCAL_ROOT, p), { force: true });
}
