import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { getStaffSession } from "@/lib/auth";
import { homeFor, isManager } from "@/lib/staff";

export const metadata: Metadata = { title: "Page not found" };

/** Dashboard 404: shown for unknown admin URLs and for records that no longer exist. */
export default async function AdminNotFound() {
  const me = await getStaffSession();
  const home = me ? homeFor(me.role) : "/admin/login";
  const homeLabel = !me ? "Sign in" : home === "/admin/pos" ? "Go to the till" : "Go to dashboard";

  return (
    <div className="grid min-h-[calc(100vh-200px)] place-items-center py-10">
      <div className="flex max-w-[440px] flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-light text-brand ring-8 ring-brand-light/50">
          <MagnifyingGlassIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold text-brand">404 error</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Page not found</h1>
        <p className="mt-3 text-base text-[#7C7C7C]">
          This page doesn&apos;t exist, or the item was deleted. Check the address, or use the menu to find what you need.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {me && isManager(me.role) && (
            <Link href="/admin/orders" className="btn btn-ghost">
              View orders
            </Link>
          )}
          <Link href={home} className="btn btn-primary">
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
