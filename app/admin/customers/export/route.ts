import { getAdminSession } from "@/lib/auth";
import { getCustomers } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Quote a CSV cell; also neutralise leading =,+,-,@ so spreadsheets don't run it as a formula. */
function cell(value: string | number | null) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** All customers as a CSV download (admin only). Amounts are in naira. */
export async function GET() {
  if (!(await getAdminSession())) return new Response("Not found", { status: 404 });

  const rows = await getCustomers();
  const day = (sec: number | null) => (sec ? new Date(sec * 1000).toISOString().slice(0, 10) : "");
  const header = ["Name", "Email", "Phone", "Shops", "Orders", "Total spent", "Last order", "Joined"];
  const shops = (c: (typeof rows)[number]) => [c.storeOrders > 0 || c.source === "store" ? "In store" : "", c.email ? "Online" : ""].filter(Boolean).join(" + ");
  const lines = rows.map((c) => [c.name, c.email, c.phone, shops(c), c.orderCount, (c.totalSpent / 100).toFixed(2), day(c.lastOrderAt), day(c.createdAt)].map(cell).join(","));
  const csv = [header.join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
