import fs from "node:fs";
import { getStaffSession } from "@/lib/auth";
import { privateFilePath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic" };

/** Private receipt / invoice photos: signed-in staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getStaffSession())) return new Response("Not found", { status: 404 });
  const { name } = await params;
  const file = privateFilePath(name);
  if (!file || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop() ?? "";
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
}
