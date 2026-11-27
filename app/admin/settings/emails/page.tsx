import { desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { EmailSettingsForm, RunFollowUpsButton } from "@/components/admin/email-settings-form";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { getOwnerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, emailLog } from "@/lib/db/schema";
import { emailConnected, getEmailSettings } from "@/lib/email-config";
import { cn, formatDateTime } from "@/lib/format";
import { paginate } from "@/lib/paginate";

export const metadata: Metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { receipt: "Receipt", thank_you: "Thank you", come_back: "Come back", loyalty: "Loyalty", test: "Test" };

export default async function EmailSettingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const [value, me, log, counts] = await Promise.all([
    getEmailSettings(),
    getOwnerSession(),
    db
      .select({ e: emailLog, name: customers.name })
      .from(emailLog)
      .leftJoin(customers, eq(emailLog.customerId, customers.id))
      .orderBy(desc(emailLog.id))
      .limit(500)
      .all(),
    db
      .select({
        withEmail: sql<number>`count(*)`,
        agreed: sql<number>`sum(case when ${customers.emailOptIn} = 1 and ${customers.unsubscribedAt} is null then 1 else 0 end)`,
        unsubscribed: sql<number>`sum(case when ${customers.unsubscribedAt} is not null then 1 else 0 end)`,
      })
      .from(customers)
      .where(isNotNull(customers.email))
      .get(),
  ]);
  const connected = emailConnected();
  const paged = paginate(log, sp.page, 20);

  return (
    <div className="grid max-w-[880px] gap-6">
      <PageHeader title="Emails" description="Receipts and follow-up emails to customers, sent automatically through Resend." />

      <section className={cn("rounded-[8px] border px-5 py-4 text-sm", connected ? "border-[#10A957]/30 bg-[#EFFEF5]" : "border-line bg-card")}>
        {connected ? (
          <p className="font-medium text-[#10A957]">Resend is connected. Emails go out by themselves.</p>
        ) : (
          <>
            <p className="font-medium text-ink">Not connected yet: no emails are sent.</p>
            <p className="mt-1 text-[#525252]">
              In Vercel, open the kidspot project → Integrations → add <strong>Resend</strong>. Then verify kidspot.com.ng in Resend (it shows a few DNS records to add) and redeploy.
            </p>
          </>
        )}
        <p className="mt-2 text-[#525252]">
          {counts?.withEmail ?? 0} customer{counts?.withEmail === 1 ? "" : "s"} with an email · {counts?.agreed ?? 0} agreed to follow-ups · {counts?.unsubscribed ?? 0} unsubscribed.
          Follow-ups are checked every hour while the shop uses the admin.
        </p>
        {connected && (
          <div className="mt-3">
            <RunFollowUpsButton />
          </div>
        )}
      </section>

      <EmailSettingsForm value={value} connected={connected} testTo={me?.email ?? ""} />

      <TableCard title="Sent emails" count={log.length} footer={log.length > 0 ? <TableFooter {...paged} hrefFor={(p) => `/admin/settings/emails${p > 1 ? `?page=${p}` : ""}`} /> : null}>
        {log.length === 0 ? (
          <TableEmpty title="No emails yet" text="Every receipt and follow-up shows here once email is connected." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>To</th>
                  <th className={th}>Email</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map(({ e, name }) => (
                  <tr key={e.id} className={trClass}>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(e.createdAt)}</td>
                    <td className={cn(td, "text-[#525252]")}>
                      {name && name !== "Walk-in customer" ? name : e.to}
                      {name && name !== "Walk-in customer" && <span className="block text-xs text-[#BDBDBD]">{e.to}</span>}
                    </td>
                    <td className={cn(td, "text-[#525252]")}>
                      {KIND[e.kind] ?? e.kind}
                      <span className="block max-w-[320px] truncate text-xs text-[#BDBDBD]">{e.subject}</span>
                    </td>
                    <td className={td}>
                      {e.status === "sent" ? <Tag color={TAG.green}>Sent</Tag> : <Tag color={TAG.coral}>Failed</Tag>}
                      {e.error && <span className="mt-1 block max-w-[240px] text-xs text-accent">{e.error}</span>}
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
