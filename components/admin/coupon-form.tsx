"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { createCouponAction } from "@/lib/actions/coupons";
import type { ActionState } from "@/lib/actions/products";
import { FieldError, FieldHint, InputAffix } from "@/components/admin/field";
import { cn } from "@/lib/format";

/** "New discount code" form, shown in the Discount codes modal. Closes the modal (goes to `doneHref`) once the code is saved. */
export function CouponForm({ doneHref }: { doneHref: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCouponAction, {});
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const router = useRouter();
  const errs = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) router.replace(doneHref, { scroll: false });
  }, [state, router, doneHref]);

  // Submit in a transition so React 19 doesn't clear the fields when the server returns an error.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string, prefix?: string) => (
    <div>
      <label className="label" htmlFor={`coupon-${name}`}>
        {label}
      </label>
      <InputAffix prefix={prefix} invalid={!!errs[name]}>
        <input
          id={`coupon-${name}`}
          name={name}
          className="input"
          aria-invalid={errs[name] ? true : undefined}
          aria-describedby={errs[name] ? `coupon-${name}-error` : hint ? `coupon-${name}-hint` : undefined}
          {...props}
        />
      </InputAffix>
      {errs[name] ? <FieldError message={errs[name]} id={`coupon-${name}-error`} /> : <FieldHint id={`coupon-${name}-hint`}>{hint}</FieldHint>}
    </div>
  );

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-5">
      {field("code", "Code", { placeholder: "WELCOME10", required: true, className: "input uppercase", autoFocus: true }, "Shoppers type this in their cart.")}

      <fieldset>
        <legend className="label">Type</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "percent", l: "Percentage off" },
            { v: "fixed", l: "Fixed amount off" },
          ].map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border px-3 text-sm transition",
                type === o.v ? "border-brand bg-brand-light font-medium text-brand" : "border-[#BDBDBD] text-ink hover:border-brand",
              )}
            >
              <input type="radio" name="type" value={o.v} checked={type === o.v} onChange={() => setType(o.v as typeof type)} className="checkbox checkbox-round" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        {field(
          "value",
          type === "percent" ? "Percent off" : "Amount off",
          { type: "number", min: 1, max: type === "percent" ? 100 : undefined, step: type === "percent" ? 1 : "0.01", required: true, placeholder: type === "percent" ? "10" : "2,000" },
          undefined,
          type === "percent" ? "%" : "₦",
        )}
        {field("minSubtotal", "Minimum spend", { type: "number", min: 0, step: "0.01", placeholder: "Optional" }, "Blank means no minimum.", "₦")}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("maxUses", "Usage limit", { type: "number", min: 1, step: 1, placeholder: "Unlimited" }, "Total orders that can use it.")}
        {field("expiresAt", "Expires on", { type: "date" }, "Blank means it never expires.")}
      </div>

      {state.error && (
        <p className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Link href={doneHref} scroll={false} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Creating…" : "Create code"}
        </button>
      </div>
    </form>
  );
}
