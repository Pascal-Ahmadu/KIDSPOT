import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type Who = { id: number | null; name: string } | null;

/**
 * Adds a line to the activity log. Append-only: there is no update or delete for this table
 * anywhere in the app, so the history can't be quietly rewritten.
 */
export function logActivity(who: Who, action: string, summary: string, extra: { entity?: string; entityId?: string | number; details?: unknown } = {}) {
  db.insert(auditLog)
    .values({
      staffId: who?.id ?? null,
      staffName: who?.name ?? "Unknown",
      action,
      summary,
      entity: extra.entity ?? null,
      entityId: extra.entityId != null ? String(extra.entityId) : null,
      details: extra.details !== undefined ? JSON.stringify(extra.details) : null,
    })
    .run();
}
