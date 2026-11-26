"use client";

import { useActionState } from "react";
import { closeShiftAction, openShiftAction, type ShiftState } from "@/lib/actions/pos";
import { FieldHint, InputAffix } from "@/components/admin/field";
import { money } from "@/lib/format";

/** Start of the day: count the float in the drawer. */
export function OpenShiftForm() {
  const [state, run, pending] = useActionState<ShiftState, FormData>(openShiftAction, {});
  return (
    <form action={run} className="grid gap-4">
      <div>
        <label className="label" htmlFor="openingCash">
          Cash in the drawer now
        </label>
        <InputAffix prefix="₦">
          <input id="openingCash" name="openingCash" inputMode="decimal" className="input" placeholder="0" required autoFocus />
        </InputAffix>
        <FieldHint>Count the float before you start. Enter 0 if the drawer is empty.</FieldHint>
      </div>
      {state.error && <p className="field-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Opening…" : "Open shift"}
      </button>
    </form>
  );
}

/** End of the day: count cash, check transfers and card totals. The expected figures stay hidden until saved. */
export function CloseShiftForm() {
  const [state, run, pending] = useActionState<ShiftState, FormData>(closeShiftAction, {});
  return (
    <form action={run} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="countedCash">
            Cash in the drawer
          </label>
          <InputAffix prefix="₦">
            <input id="countedCash" name="countedCash" inputMode="decimal" className="input" required />
          </InputAffix>
          <FieldHint>Count every note, including the float.</FieldHint>
        </div>
        <div>
          <label className="label" htmlFor="countedTransfer">
            Transfers received
          </label>
          <InputAffix prefix="₦">
            <input id="countedTransfer" name="countedTransfer" inputMode="decimal" className="input" required />
          </InputAffix>
          <FieldHint>Total of today&apos;s bank alerts for this till.</FieldHint>
        </div>
        <div>
          <label className="label" htmlFor="countedCard">
            Card terminal total
          </label>
          <InputAffix prefix="₦">
            <input id="countedCard" name="countedCard" inputMode="decimal" className="input" required />
          </InputAffix>
          <FieldHint>From the terminal&apos;s end-of-day slip.</FieldHint>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Notes <span className="font-normal text-[#7C7C7C]">(optional)</span>
        </label>
        <textarea id="notes" name="notes" className="input min-h-[80px] resize-y leading-5" placeholder="Anything the owner should know" />
      </div>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Closing…" : "Close shift"}
        </button>
      </div>
    </form>
  );
}

export function Money({ value, signed = false }: { value: number; signed?: boolean }) {
  if (!signed) return <>{money(value)}</>;
  if (value === 0) return <span className="text-[#10A957]">Balanced</span>;
  return <span className={value < 0 ? "font-semibold text-accent" : "text-brand-2"}>{value < 0 ? `Short ${money(-value)}` : `Over ${money(value)}`}</span>;
}
