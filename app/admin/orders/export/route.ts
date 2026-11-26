import { desc, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { paymentLabel } from "@/lib/payments";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Quote a CSV cell; also neutralise leading =,+,-,@ so spreadsheets don't run it as a formula. */
function cell(value: string | number | null) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** All orders as a CSV download (admin only). Amounts are in naira. */
export async function GET() {
  if (!(await getAdminSession())) return new Response("Not found", { status: 404 });

  const rows = await db
    .select({
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      name: orders.shippingName,
      phone: orders.shippingPhone,
      city: orders.shippingCity,
      items: sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = ${orders}.id)`,
      subtotal: orders.subtotal,
      discount: orders.discount,
      shippingFee: orders.shippingFee,
      total: orders.total,
      couponCode: orders.couponCode,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));

  const naira = (kobo: number) => (kobo / 100).toFixed(2);
  const header = ["Order", "Date", "Status", "Payment", "Customer", "Phone", "City", "Items", "Subtotal", "Discount", "Delivery", "Total", "Coupon"];
  const lines = rows.map((r) =>
    [
      r.orderNumber,
      new Date(r.createdAt * 1000).toISOString().slice(0, 16).replace("T", " "),
      r.status,
      paymentLabel(r.paymentMethod),
      r.name,
      r.phone,
      r.city,
      r.items,
      naira(r.subtotal),
      naira(r.discount),
      naira(r.shippingFee),
      naira(r.total),
      r.couponCode,
    ]
      .map(cell)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
