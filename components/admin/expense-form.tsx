"use client";

import { CameraIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { createExpenseAction, reviewExpenseAction } from "@/lib/actions/expenses";
import type { ActionState } from "@/lib/actions/products";
import { FieldError, FieldHint, InputAffix } from "@/components/admin/field";
import { Select } from "@/components/ui/select";

export function ExpenseForm({ categories, today, limitLabel, hasShift }: { categories: readonly string[]; today: string; limitLabel: string; hasShift: boolean }) {
  const [state, run, pending] = useActionState<ActionState, FormData>(createExpenseAction, {});
  const [file, setFile] = useState<string | null>(null);
  const router = useRouter();
  const errs = state.fieldErrors ?? {};
  const bad = (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});

  useEffect(() => {
    if (state.success) router.replace(`/admin/expenses?saved=${encodeURIComponent(state.success)}`, { scroll: false });
  }, [state, router]);

  return (
    <form
      action={run}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
      className="grid gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Amount
          </label>
          <InputAffix prefix="₦" invalid={!!errs.amount}>
            <input id="amount" name="amount" inputMode="decimal" className="input" placeholder="3,500" autoFocus {...bad("amount")} required />
          </InputAffix>
          {errs.amount ? <FieldError message={errs.amount} id="amount-error" /> : <FieldHint>Over {limitLabel} needs a manager to approve.</FieldHint>}
        </div>
        <div>
          <label className="label" htmlFor="spentOn">
            Date
          </label>
          <input id="spentOn" name="spentOn" type="date" className="input" defaultValue={today} max={today} {...bad("spentOn")} required />
          <FieldError message={errs.spentOn} id="spentOn-error" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <Select id="category" name="category" defaultValue="" placeholder="Pick a category" required options={categories.map((c) => ({ value: c, label: c }))} />
          <FieldError message={errs.category} id="category-error" />
        </div>
        <div>
          <label className="label" htmlFor="method">
            Paid with
          </label>
          <Select
            id="method"
            name="method"
            defaultValue={hasShift ? "till" : "transfer"}
            options={[
              { value: "till", label: "Cash from the till", disabled: !hasShift },
              { value: "transfer", label: "Bank transfer" },
              { value: "card", label: "Card" },
              { value: "personal", label: "My own money (pay me back)" },
            ]}
          />
          {errs.method ? <FieldError message={errs.method} id="method-error" /> : !hasShift && <FieldHint>Open a till shift to take cash from the till.</FieldHint>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">
          What was it for?
        </label>
        <input id="description" name="description" className="input" placeholder="Bolt to Lekki for order KS-261125-AB12" {...bad("description")} required />
        <FieldError message={errs.description} id="description-error" />
      </div>
      <div>
        <span className="label">Receipt photo</span>
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#BDBDBD] text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-light hover:text-brand">
          <CameraIcon className="h-5 w-5" aria-hidden="true" /> {file ? `Photo added: ${file}` : "Take or upload a photo"}
          <input type="file" name="receipt" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
        </label>
        {errs.receipt ? <FieldError message={errs.receipt} id="receipt-error" /> : <FieldHint>Expenses without a receipt are flagged for the owner.</FieldHint>}
      </div>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Link href="/admin/expenses" scroll={false} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save expense"}
        </button>
      </div>
    </form>
  );
}

export function ReviewButtons({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const act = (approve: boolean) =>
    start(async () => {
      const res = await reviewExpenseAction(id, approve);
      if (res.error) alert(res.error);
    });
  return (
    <div className="flex justify-end gap-2">
      <button type="button" disabled={pending} onClick={() => act(true)} className="inline-flex h-8 items-center rounded-[4px] bg-[#EFFEF5] px-3 text-xs font-medium text-[#10A957] transition hover:bg-[#10A957]/15">
        Approve
      </button>
      <button type="button" disabled={pending} onClick={() => act(false)} className="inline-flex h-8 items-center rounded-[4px] px-3 text-xs font-medium text-accent transition hover:bg-accent/10">
        Reject
      </button>
    </div>
  );
}
