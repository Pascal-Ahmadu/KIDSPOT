"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { adjustStockAction, type ActionState } from "@/lib/actions/products";
import { FieldHint } from "@/components/admin/field";
import { Select } from "@/components/ui/select";

type Option = { id: number; name: string; sku: string; stock: number };

/** Record a delivery, a return or a count correction. Rendered inside the Inventory "Adjust stock" dialog. */
export function StockAdjustForm({
  products,
  selectedId,
}: {
  products: Option[];
  selectedId?: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await adjustStockAction(prev, formData);
      if (result.success) formRef.current?.reset();
      return result;
    },
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid min-w-0 gap-5 [&>*]:min-w-0"
    >
      <div>
        <label className="label" htmlFor="productId">
          Product
        </label>
        <Select
          id="productId"
          name="productId"
          defaultValue={String(selectedId ?? "")}
          required
          placeholder="Select a product…"
          options={products.map((p) => ({
            value: String(p.id),
            label: `${p.name} (${p.sku}) · ${p.stock} in stock`,
          }))}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 [&>*]:min-w-0">
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <Select
            id="type"
            name="type"
            defaultValue="return"
            options={[
              { value: "return", label: "Customer return (add)" },
              { value: "adjustment", label: "Correction (+/−)" },
            ]}
          />
        </div>
        <div>
          <label className="label" htmlFor="quantity">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            className="input"
            placeholder="e.g. 20 or -3"
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="note">
          Note <span className="font-normal text-[#7C7C7C]">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          className="input"
          placeholder="Why? e.g. found 2 more in the store room"
        />
        <FieldHint>
          Every change is logged. New stock from a supplier goes through{" "}
          <Link
            href="/admin/deliveries/new"
            className="font-medium text-brand hover:underline"
          >
            Receive a delivery
          </Link>
          .
        </FieldHint>
      </div>
      {state.error && (
        <p
          className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
          role="alert"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          className="rounded-[8px] border border-[#10A957]/30 bg-[#EFFEF5] px-3 py-2 text-sm font-medium text-[#10A957]"
          role="status"
        >
          {state.success}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Apply adjustment"}
      </button>
    </form>
  );
}
