import fs from "node:fs/promises";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";

/**
 * File storage for uploads and backups.
 * On Vercel it uses the project's private Vercel Blob store (the server's disk isn't kept between
 * requests). Without Blob credentials (local development) files go to data/files on disk.
 * Everything is private: images are served through /media/…, receipts and backups only to staff.
 */
// Same rule as the database: live storage in production (or with USE_LIVE_SERVICES=1), local files in development.
export const usesBlob =
  (process.env.NODE_ENV === "production" || process.env.USE_LIVE_SERVICES === "1") &&
  process.env.USE_LOCAL_DATA !== "1" &&
  !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

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
  if (usesBlob) await del(p);
  else await fs.rm(path.join(LOCAL_ROOT, p), { force: true });
}
