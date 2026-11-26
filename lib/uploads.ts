import { putFile, safePathname } from "@/lib/storage";

/**
 * Saves an uploaded image and returns the path to show it. Images only, 5MB max.
 * Public images (products, banners) are served to everyone through /media/uploads/…
 * Private ones (expense receipts, supplier invoices) are only served to signed-in staff via /admin/files/….
 */
export async function saveImageFile(file: File, opts: { private?: boolean } = {}): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5MB");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const folder = opts.private ? "private" : "uploads";
  await putFile(`${folder}/${filename}`, Buffer.from(await file.arrayBuffer()), file.type);
  return opts.private ? `/admin/files/${filename}` : `/media/uploads/${filename}`;
}

/** Storage path of a private file name, refusing anything that isn't a plain generated name. */
export function privateFilePath(name: string) {
  if (!/^\d+-[a-z0-9]+\.[a-z0-9]+$/.test(name)) return null;
  return safePathname(`private/${name}`);
}
