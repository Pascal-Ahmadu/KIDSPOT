"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { getOwnerSession } from "@/lib/auth";
import { runBackup } from "@/lib/backup";

export async function backupNowAction() {
  const me = await getOwnerSession();
  if (!me) throw new Error("Only the owner can make backups.");
  const b = runBackup();
  logActivity(me, "backup", `${me.name} made a backup (${b.name})`, { entity: "backup" });
  revalidatePath("/admin/settings/backups");
}
