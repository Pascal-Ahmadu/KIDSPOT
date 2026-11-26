import { logActivity } from "@/lib/audit";
import { getOwnerSession } from "@/lib/auth";
import { readBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

/** Owner-only download of one backup file. */
export async function GET(request: Request) {
  const me = await getOwnerSession();
  if (!me) return new Response("Not found", { status: 404 });
  const name = new URL(request.url).searchParams.get("name") ?? "";
  const file = await readBackup(name);
  if (!file) return new Response("Not found", { status: 404 });
  await logActivity(me, "backup_download", `${me.name} downloaded backup ${name}`, { entity: "backup" });
  return new Response(file.body as BodyInit, {
    headers: { "Content-Type": "application/sql", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
