import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { RowButton, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { HeaderButton } from "@/components/admin/modal";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { deleteBannerAction, moveBannerAction, toggleBannerAction } from "@/lib/actions/banners";
import { cn } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Banners" };

const BASE = "/admin/settings/banners";

export default async function BannersPage() {
  const { banners } = await getSettings();
  const live = banners.filter((b) => b.enabled).length;

  return (
    <div>
      <PageHeader title="Banners" description="The big slides at the top of the home page. They play in this order." />

      <TableCard
        title="Home page banners"
        count={banners.length}
        actions={
          <HeaderButton href={`${BASE}/new`} icon={PlusIcon}>
            New banner
          </HeaderButton>
        }
        footer={
          banners.length > 0 ? (
            <p className="border-t border-line px-6 py-4 text-xs text-[#7C7C7C]">
              {live} of {banners.length} showing on the home page.{live === 0 && " The slider is hidden until at least one banner is switched on."}
            </p>
          ) : null
        }
      >
        {banners.length === 0 ? (
          <TableEmpty title="No banners yet" text="Use “New banner” to add the first slide." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, "w-[72px] text-center")}>Order</th>
                  <th className={th}>Banner</th>
                  <th className={th}>Buttons</th>
                  <th className={th}>Status</th>
                  <th className={cn(th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b, i) => (
                  <tr key={b.id} className={trClass}>
                    <td className={cn(td, "text-center")}>
                      <div className="flex flex-col items-center gap-1 py-1">
                        <form action={moveBannerAction.bind(null, b.id, "up")}>
                          <button type="submit" disabled={i === 0} aria-label="Move up" className="grid h-6 w-6 place-items-center rounded-[4px] text-[#7C7C7C] transition hover:bg-surface hover:text-brand disabled:opacity-30">
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                        </form>
                        <span className="text-xs text-[#525252]">{i + 1}</span>
                        <form action={moveBannerAction.bind(null, b.id, "down")}>
                          <button type="submit" disabled={i === banners.length - 1} aria-label="Move down" className="grid h-6 w-6 place-items-center rounded-[4px] text-[#7C7C7C] transition hover:bg-surface hover:text-brand disabled:opacity-30">
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className={cn(td, "py-3")}>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.image} alt="" className="h-[68px] w-[96px] shrink-0 rounded-[6px] border border-line object-cover" />
                        <span className="min-w-0">
                          {b.eyebrow && <span className="block text-xs text-[#7C7C7C]">{b.eyebrow}</span>}
                          <span className="block font-medium text-ink">{b.title}</span>
                          {b.subtitle && <span className="block truncate text-xs text-[#7C7C7C]">{b.subtitle}</span>}
                          {b.dealPercent ? <span className="mt-1 block text-xs text-brand">Deal tag: up to {b.dealPercent}% off</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className={cn(td, "text-xs text-[#525252]")}>
                      <span className="block">
                        {b.primary.label} → <span className="font-mono text-[#7C7C7C]">{b.primary.href}</span>
                      </span>
                      {b.secondary.label && (
                        <span className="mt-1 block">
                          {b.secondary.label} → <span className="font-mono text-[#7C7C7C]">{b.secondary.href}</span>
                        </span>
                      )}
                    </td>
                    <td className={td}>{b.enabled ? <Tag color={TAG.green}>Showing</Tag> : <Tag color={TAG.grey}>Hidden</Tag>}</td>
                    <td className={cn(td, "text-right")}>
                      <div className="flex justify-end gap-2">
                        <Link href={`${BASE}/${b.id}`} className="inline-flex h-8 items-center rounded-[4px] bg-surface px-3 text-xs font-medium text-ink transition hover:bg-line hover:text-brand">
                          Edit
                        </Link>
                        <form action={toggleBannerAction.bind(null, b.id)}>
                          <RowButton type="submit">{b.enabled ? "Hide" : "Show"}</RowButton>
                        </form>
                        <form action={deleteBannerAction.bind(null, b.id)}>
                          <RowButton type="submit" tone="danger">
                            Delete
                          </RowButton>
                        </form>
                      </div>
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
