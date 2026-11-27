import type { Metadata } from "next";
import Link from "next/link";
import { RowButton, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/ui";
import { deleteSubscriberAction } from "@/lib/actions/newsletter";
import { cn, formatDate } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getSubscribers, getWelcomeOffer } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Subscribers" };

const PAGE_SIZE = 10;

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const [items, offer, { newsletter }] = await Promise.all([getSubscribers(), getWelcomeOffer(), getSettings()]);
  const term = sp.q?.trim().toLowerCase();
  const matches = term ? items.filter((s) => s.email.toLowerCase().includes(term)) : items;
  const paged = paginate(matches, sp.page, PAGE_SIZE);
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/subscribers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Subscribers" description={`${items.length} newsletter sign-up${items.length === 1 ? "" : "s"}`} />
      <div className="mb-5 rounded-[8px] border border-line bg-card p-4 text-sm">
        {offer ? (
          <p>
            New subscribers are shown the code <b className="font-mono">{offer.code}</b> ({offer.label}).
          </p>
        ) : (
          <p>
            Want to reward sign-ups? Create an active discount code named <b className="font-mono">{newsletter.welcomeCode || "WELCOME"}</b> in{" "}
            <Link href="/admin/coupons" className="font-semibold text-brand hover:underline">
              Discount codes
            </Link>
            . The sign-up banner will then advertise it and show it to new subscribers.
          </p>
        )}
      </div>

      <TableCard
        title={term ? "Search results" : "All subscribers"}
        count={matches.length}
        search={{ action: "/admin/subscribers", defaultValue: sp.q, placeholder: "Search email" }}
        footer={<TableFooter {...paged} hrefFor={href} />}
      >
        {matches.length === 0 ? (
          <TableEmpty title={term ? "No subscribers found" : "No subscribers yet"} text={term ? `Nothing matches “${sp.q}”.` : "Sign-ups from the newsletter banner will appear here."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Email</th>
                  <th className={th}>Signed up from</th>
                  <th className={th}>Date</th>
                  <th className={cn(th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((s) => (
                  <tr key={s.id} className={trClass}>
                    <td className={td}>
                      <a href={`mailto:${s.email}`} className="text-[#525252] hover:text-brand">
                        {s.email}
                      </a>
                    </td>
                    <td className={cn(td, "capitalize text-[#525252]")}>{s.source ?? "—"}</td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDate(s.createdAt)}</td>
                    <td className={cn(td, "text-right")}>
                      <form action={deleteSubscriberAction.bind(null, s.id)}>
                        <RowButton type="submit" tone="danger">
                          Remove
                        </RowButton>
                      </form>
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
