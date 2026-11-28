import { eq } from "drizzle-orm";
import { client, db } from "@/lib/db";
import { appMeta } from "@/lib/db/schema";
import { deleteFile, listFiles, putFile, readFile, STORAGE_NAME } from "@/lib/storage";

/**
 * Daily backups: a complete SQL copy of the database (tables + every row), saved to file storage
 * (Vercel Blob on Vercel, data/files/backups locally). The newest 30 are kept.
 * Restore by loading the .sql file into a new Turso database (`turso db shell <db> < backup.sql`)
 * or any SQLite tool. Turso also keeps its own restore points.
 */
const PREFIX = "backups/";
const KEEP = 30;
const DAY = 24 * 3600;

export type BackupFile = { name: string; size: number; createdAt: number };

export const BACKUP_LOCATION = STORAGE_NAME;

export async function listBackups(): Promise<BackupFile[]> {
  const files = await listFiles(PREFIX);
  return files
    .map((f) => ({ name: f.pathname.slice(PREFIX.length), size: f.size, createdAt: f.uploadedAt }))
    .filter((f) => /^kidstore-[\d-]+\.sql$/.test(f.name))
    .sort((a, b) => b.createdAt - a.createdAt);
}

const quote = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    const bytes = new Uint8Array(v instanceof ArrayBuffer ? v : v.buffer);
    return `X'${Buffer.from(bytes).toString("hex")}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
};

/** The whole database as SQL statements. */
export async function dumpDatabase(): Promise<string> {
  const out: string[] = [`-- Kid's Spot database backup, ${new Date().toISOString()}`, "PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];
  const tables = await client.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' AND name NOT LIKE 'libsql_%' ORDER BY name");
  for (const t of tables.rows) {
    const name = String(t.name);
    out.push(`${String(t.sql)};`);
    const rows = await client.execute(`SELECT * FROM "${name.replace(/"/g, '""')}"`);
    const cols = rows.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
    for (const r of rows.rows) {
      out.push(`INSERT INTO "${name}" (${cols}) VALUES (${rows.columns.map((_, i) => quote(r[i])).join(", ")});`);
    }
  }
  const indexes = await client.execute("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL");
  for (const i of indexes.rows) out.push(`${String(i.sql)};`);
  out.push("COMMIT;", "PRAGMA foreign_keys=ON;");
  return out.join("\n") + "\n";
}

export async function runBackup(): Promise<BackupFile> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const name = `kidstore-${stamp}.sql`;
  const sql = await dumpDatabase();
  await putFile(PREFIX + name, sql, "application/sql");
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.select().from(appMeta).where(eq(appMeta.key, "last_backup")).get();
  if (existing) await db.update(appMeta).set({ value: String(now) }).where(eq(appMeta.key, "last_backup")).run();
  else await db.insert(appMeta).values({ key: "last_backup", value: String(now) }).run();
  for (const old of (await listBackups()).slice(KEEP)) await deleteFile(PREFIX + old.name);
  return { name, size: Buffer.byteLength(sql), createdAt: now };
}

/** Called after admin page loads: makes a backup if the last one is more than a day old. Never throws. */
export async function runBackupIfDue() {
  try {
    const last = Number((await db.select().from(appMeta).where(eq(appMeta.key, "last_backup")).get())?.value ?? 0);
    if (Math.floor(Date.now() / 1000) - last >= DAY) await runBackup();
  } catch (e) {
    console.error("Automatic backup failed:", e);
  }
}

/** A backup file's contents, or null (no directory tricks). */
export async function readBackup(name: string) {
  if (!/^kidstore-[\d-]+\.sql$/.test(name)) return null;
  return readFile(PREFIX + name);
}
