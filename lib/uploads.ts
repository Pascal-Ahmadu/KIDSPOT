import fs from "node:fs/promises";
import path from "node:path";

const PRIVATE_DIR = path.join(process.cwd(), "data", "private-uploads");

/**
 * Saves an uploaded image and returns the path to show it. Images only, 5MB max.
 * Public images (products, banners) go to public/uploads. Private ones (expense receipts, supplier
 * invoices) go to data/private-uploads and are only served to signed-in staff via /admin/files/….
 */
export async function saveImageFile(file: File, opts: { private?: boolean } = {}): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5MB");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const dir = opts.private ? PRIVATE_DIR : path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return opts.private ? `/admin/files/${filename}` : `/uploads/${filename}`;
}

/** Resolves a private file name to its path, refusing anything that isn't a plain generated name. */
export function privateFilePath(name: string) {
  if (!/^\d+-[a-z0-9]+\.[a-z0-9]+$/.test(name)) return null;
  return path.join(PRIVATE_DIR, name);
}
