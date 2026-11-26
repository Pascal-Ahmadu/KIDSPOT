import { readFile, safePathname } from "@/lib/storage";

/** Public uploaded images (products, banners), served from storage with long browser/CDN caching. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = safePathname(path.join("/"));
  // Only the public uploads folder is reachable here; receipts and backups are not.
  if (!pathname || !pathname.startsWith("uploads/")) return new Response("Not found", { status: 404 });
  const file = await readFile(pathname);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body as BodyInit, {
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
