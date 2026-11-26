"use client";

import { useState, useTransition } from "react";
import { deleteOrderAction, updateOrderStatusAction } from "@/lib/actions/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/db/schema";
import { Select } from "@/components/ui/select";

const NEXT: Partial<Record<OrderStatus, { label: string; to: OrderStatus }>> = {
  pending: { label: "Mark as paid", to: "paid" },
  paid: { label: "Start processing", to: "processing" },
  processing: { label: "Mark as shipped", to: "shipped" },
  shipped: { label: "Mark as delivered", to: "delivered" },
};

export function OrderStatusControls({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function set(to: OrderStatus) {
    setMsg(null);
    start(async () => {
      const res = await updateOrderStatusAction(orderId, to);
      if (res.error) setMsg({ text: res.error, ok: false });
      else if (res.success) setMsg({ text: res.success, ok: true });
    });
  }

  const next = NEXT[status];

  return (
    <div className="card p-5">
      <h2 className="font-bold">Update status</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <button disabled={pending} onClick={() => set(next.to)} className="btn btn-primary btn-sm">{next.label}</button>
        )}
        <Select
          wrapperClassName="w-auto"
          className="w-auto min-w-[150px] py-2 text-sm"
          value={status}
          disabled={pending}
          onChange={(v) => set(v as OrderStatus)}
          aria-label="Set status"
          options={ORDER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        {status !== "cancelled" && (
          <button
            disabled={pending}
            onClick={() => confirm("Cancel this order? Stock will be returned to inventory.") && set("cancelled")}
            className="btn btn-ghost btn-sm text-rose-600 hover:border-rose-300"
          >
            Cancel order
          </button>
        )}
      </div>
      {msg && <p className={`mt-3 rounded-[6px] px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs text-muted">Cancelling returns the items to stock. Re-opening a cancelled order deducts them again.</p>
      <button
        disabled={pending}
        onClick={() => confirm("Permanently delete this order? Stock will NOT be changed.") && start(() => deleteOrderAction(orderId))}
        className="mt-4 text-xs font-semibold text-muted hover:text-rose-600"
      >
        Delete order permanently
      </button>
    </div>
  );
}
