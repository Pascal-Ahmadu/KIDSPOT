import fs from "node:fs";
import { logActivity } from "@/lib/audit";
import { getOwnerSession } from "@/lib/auth";
import { backupPath } from "@/lib/backup";

export const dynamic = "force-dynamic";

/** Owner-only download of one backup file. */
export async function GET(request: Request) {
  const me = await getOwnerSession();
  if (!me) return new Response("Not found", { status: 404 });
  const name = new URL(request.url).searchParams.get("name") ?? "";
  const file = backupPath(name);
  if (!file) return new Response("Not found", { status: 404 });
  logActivity(me, "backup_download", `${me.name} downloaded backup ${name}`, { entity: "backup" });
  return new Response(fs.readFileSync(file), {
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
