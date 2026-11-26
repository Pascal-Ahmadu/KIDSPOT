import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { backupDatabaseTo, db } from "@/lib/db";
import { appMeta } from "@/lib/db/schema";

/**
 * Daily database backups. Files go to BACKUP_DIR (set it to a different disk or a synced folder,
 * e.g. Google Drive / Dropbox) or ./data/backups. The newest 30 are kept.
 */
export const BACKUP_DIR = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(process.cwd(), "data", "backups");
const KEEP = 30;
const DAY = 24 * 3600;

export type BackupFile = { name: string; size: number; createdAt: number };

export function listBackups(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^kidstore-[\d-]+\.db$/.test(f))
    .map((name) => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: st.size, createdAt: Math.floor(st.mtimeMs / 1000) };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function runBackup(): BackupFile {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const name = `kidstore-${stamp}.db`;
  const file = path.join(BACKUP_DIR, name);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  backupDatabaseTo(file);
  const now = Math.floor(Date.now() / 1000);
  const existing = db.select().from(appMeta).where(eq(appMeta.key, "last_backup")).get();
  if (existing) db.update(appMeta).set({ value: String(now) }).where(eq(appMeta.key, "last_backup")).run();
  else db.insert(appMeta).values({ key: "last_backup", value: String(now) }).run();
  for (const old of listBackups().slice(KEEP)) fs.unlinkSync(path.join(BACKUP_DIR, old.name));
  return { name, size: fs.statSync(file).size, createdAt: now };
}

/** Called on admin page loads: makes a backup if the last one is more than a day old. Never throws. */
export function runBackupIfDue() {
  try {
    const last = Number(db.select().from(appMeta).where(eq(appMeta.key, "last_backup")).get()?.value ?? 0);
    if (Math.floor(Date.now() / 1000) - last >= DAY) runBackup();
  } catch (e) {
    console.error("Automatic backup failed:", e);
  }
}

/** Safe path for a backup file name (no directory tricks). */
export function backupPath(name: string) {
  if (!/^kidstore-[\d-]+\.db$/.test(name)) return null;
  const file = path.join(BACKUP_DIR, name);
  return fs.existsSync(file) ? file : null;
}
