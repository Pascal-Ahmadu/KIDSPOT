import { getStaffSession } from "@/lib/auth";
import { readFile } from "@/lib/storage";
import { privateFilePath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Private receipt / invoice photos: signed-in staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getStaffSession())) return new Response("Not found", { status: 404 });
  const { name } = await params;
  const pathname = privateFilePath(name);
  const file = pathname ? await readFile(pathname) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body as BodyInit, { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600" } });
}
