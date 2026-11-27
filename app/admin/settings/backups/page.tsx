import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import { TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";
import { backupNowAction } from "@/lib/actions/backup";
import { BACKUP_LOCATION, listBackups } from "@/lib/backup";
import { cn, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Backups" };
export const dynamic = "force-dynamic";

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export default async function BackupsPage() {
  const files = await listBackups();
  return (
    <div className="grid gap-6">
      <PageHeader title="Backups" description="A full copy of the shop's data is made automatically once a day. The newest 30 are kept." />
      <section className="rounded-[8px] border border-line bg-card px-5 py-4 text-sm leading-6 text-[#525252]">
        <p>
          Each backup is a complete copy of the shop&apos;s data as a .sql file, saved in {BACKUP_LOCATION}. Download one now and then and keep it somewhere else
          (Google Drive, a USB stick). The database host, Turso, also keeps its own restore points.
        </p>
      </section>
      <TableCard
        title="Recent backups"
        count={files.length}
        actions={
          <form action={backupNowAction}>
            <button type="submit" className="flex h-9 items-center gap-2 rounded-[4px] bg-brand px-3 text-sm font-bold leading-5 text-white transition hover:bg-brand/90">
              Back up now
            </button>
          </form>
        }
      >
        {files.length === 0 ? (
          <TableEmpty title="No backups yet" text="The first one is made automatically today, or use Back up now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Made</th>
                  <th className={th}>File</th>
                  <th className={cn(th, "text-right")}>Size</th>
                  <th className={cn(th, "text-right")}>
                    <span className="sr-only">Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.name} className={trClass}>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(f.createdAt)}</td>
                    <td className={cn(td, "font-mono text-xs text-[#525252]")}>{f.name}</td>
                    <td className={cn(td, "text-right text-[#525252]")}>{size(f.size)}</td>
                    <td className={cn(td, "text-right")}>
                      <a href={`/admin/settings/backups/download?name=${encodeURIComponent(f.name)}`} download className="inline-flex h-8 items-center gap-1 rounded-[4px] bg-surface px-3 text-xs font-medium text-ink transition hover:bg-line hover:text-brand">
                        <ArrowDownTrayIcon className="h-4 w-4" /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
