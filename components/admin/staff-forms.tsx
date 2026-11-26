"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect } from "react";
import { saveControlsAction, saveStaffAction } from "@/lib/actions/staff";
import type { ActionState } from "@/lib/actions/products";
import { FieldError, FieldHint, InputAffix } from "@/components/admin/field";
import { Select } from "@/components/ui/select";
import { fromMinor } from "@/lib/format";
import type { Role } from "@/lib/staff";

type Action = (prev: ActionState, data: FormData) => Promise<ActionState>;

function useForm(action: Action) {
  const [state, run, pending] = useActionState<ActionState, FormData>(action, {});
  const errs = state.fieldErrors ?? {};
  return {
    state,
    run,
    pending,
    errs,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      startTransition(() => run(data));
    },
    bad: (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {}),
    err: (k: string) => <FieldError message={errs[k]} id={`${k}-error`} />,
  };
}

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including staff and settings.",
  manager: "Everything except staff and settings. Approves discounts, refunds and big expenses with their PIN.",
  cashier: "The till, their own shifts and expenses, and stock counts.",
};

export function StaffForm({
  member,
  isEnvOwner = false,
}: {
  member?: { id: number; name: string; email: string; role: Role; isActive: boolean; hasPin: boolean };
  isEnvOwner?: boolean;
}) {
  const f = useForm(saveStaffAction);
  const router = useRouter();
  useEffect(() => {
    if (f.state.success) router.replace("/admin/staff");
  }, [f.state, router]);

  return (
    <form action={f.run} onSubmit={f.onSubmit} className="grid gap-5">
      {member && <input type="hidden" name="id" value={member.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" className="input" defaultValue={member?.name} placeholder="Ada Obi" {...f.bad("name")} required />
          {f.err("name")}
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email (used to sign in)
          </label>
          <input id="email" name="email" type="email" className="input" defaultValue={member?.email} placeholder="ada@kidspot.ng" readOnly={isEnvOwner} {...f.bad("email")} required />
          {f.errs.email ? f.err("email") : isEnvOwner && <FieldHint>The owner email is set in the server settings (.env).</FieldHint>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="role">
          Role
        </label>
        {isEnvOwner ? (
          <>
            <input type="hidden" name="role" value="owner" />
            <div className="input bg-surface">Owner</div>
          </>
        ) : (
          <Select
            id="role"
            name="role"
            defaultValue={member?.role ?? "cashier"}
            options={[
              { value: "cashier", label: "Cashier" },
              { value: "manager", label: "Manager" },
              { value: "owner", label: "Owner" },
            ]}
          />
        )}
        <FieldHint>
          <b className="font-medium">Cashier:</b> {ROLE_HELP.cashier} <b className="font-medium">Manager:</b> {ROLE_HELP.manager}
        </FieldHint>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            {member ? "New password" : "Password"} {member && <span className="font-normal text-[#7C7C7C]">(optional)</span>}
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" className="input" {...f.bad("password")} required={!member} />
          {f.errs.password ? f.err("password") : <FieldHint>{member ? "Leave blank to keep the current password." : "At least 8 characters. They can use it to sign in straight away."}</FieldHint>}
        </div>
        <div>
          <label className="label" htmlFor="pin">
            {member?.hasPin ? "New PIN" : "Approval PIN"} <span className="font-normal text-[#7C7C7C]">{member?.hasPin ? "(optional)" : "(managers and owners)"}</span>
          </label>
          <InputAffix help="Typed on the till to approve discounts, refunds and big expenses. Keep it secret.">
            <input id="pin" name="pin" inputMode="numeric" pattern="\d{4,6}" maxLength={6} type="password" autoComplete="off" className="input" {...f.bad("pin")} />
          </InputAffix>
          {f.errs.pin ? f.err("pin") : <FieldHint>{member?.hasPin ? "PIN is set. Leave blank to keep it." : "4 to 6 digits."}</FieldHint>}
        </div>
      </div>

      {!isEnvOwner && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={member?.isActive ?? true} className="checkbox mt-0.5" />
          <span>
            <span className="block font-medium text-ink">Account switched on</span>
            <span className="block text-[#7C7C7C]">Untick when someone leaves. They can no longer sign in; their history stays.</span>
          </span>
        </label>
      )}
      {isEnvOwner && <input type="hidden" name="isActive" value="on" />}

      {f.state.error && (
        <p className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
          {f.state.error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Link href="/admin/staff" scroll={false} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" disabled={f.pending} className="btn btn-primary">
          {f.pending ? "Saving…" : member ? "Save changes" : "Add staff member"}
        </button>
      </div>
    </form>
  );
}

export function ControlsForm({ value }: { value: { expenseApprovalLimit: number; openHour: number; closeHour: number; loyaltyEnabled: boolean; loyaltyEvery: number; loyaltyReward: number } }) {
  const f = useForm(saveControlsAction);
  return (
    <form action={f.run} onSubmit={f.onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="expenseApprovalLimit">
            Expenses need approval above
          </label>
          <InputAffix prefix="₦" invalid={!!f.errs.expenseApprovalLimit}>
            <input id="expenseApprovalLimit" name="expenseApprovalLimit" inputMode="decimal" className="input" defaultValue={fromMinor(value.expenseApprovalLimit)} {...f.bad("expenseApprovalLimit")} />
          </InputAffix>
          {f.err("expenseApprovalLimit")}
        </div>
        <div>
          <label className="label" htmlFor="openHour">
            Shop opens (hour)
          </label>
          <input id="openHour" name="openHour" type="number" min={0} max={23} className="input" defaultValue={value.openHour} {...f.bad("openHour")} />
          {f.errs.openHour ? f.err("openHour") : <FieldHint>24-hour clock, e.g. 8</FieldHint>}
        </div>
        <div>
          <label className="label" htmlFor="closeHour">
            Shop closes (hour)
          </label>
          <input id="closeHour" name="closeHour" type="number" min={1} max={24} className="input" defaultValue={value.closeHour} {...f.bad("closeHour")} />
          {f.errs.closeHour ? f.err("closeHour") : <FieldHint>Sales outside these hours are flagged.</FieldHint>}
        </div>
      </div>
      <div className="grid gap-4 border-t border-line pt-5">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="loyaltyEnabled" defaultChecked={value.loyaltyEnabled} className="checkbox mt-0.5" />
          <span>
            <span className="block font-medium text-ink">Loyalty reward for returning customers</span>
            <span className="block text-[#7C7C7C]">Counted by phone number at the till and online. Refunded or cancelled orders don&apos;t count.</span>
          </span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="loyaltyEvery">
              Reward after every
            </label>
            <InputAffix help="Number of purchases. With 10, the 11th visit gets the reward.">
              <input id="loyaltyEvery" name="loyaltyEvery" type="number" min={2} max={100} className="input" defaultValue={value.loyaltyEvery} {...f.bad("loyaltyEvery")} />
            </InputAffix>
            {f.errs.loyaltyEvery ? f.err("loyaltyEvery") : <FieldHint>purchases</FieldHint>}
          </div>
          <div>
            <label className="label" htmlFor="loyaltyReward">
              Reward
            </label>
            <InputAffix prefix="₦" invalid={!!f.errs.loyaltyReward}>
              <input id="loyaltyReward" name="loyaltyReward" inputMode="decimal" className="input" defaultValue={fromMinor(value.loyaltyReward)} {...f.bad("loyaltyReward")} />
            </InputAffix>
            {f.errs.loyaltyReward ? f.err("loyaltyReward") : <FieldHint>off their next purchase</FieldHint>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {f.state.success && !f.pending && (
          <p className="mr-auto text-sm font-medium text-[#10A957]" role="status">
            {f.state.success}
          </p>
        )}
        <button type="submit" disabled={f.pending} className="btn btn-primary">
          {f.pending ? "Saving…" : "Save controls"}
        </button>
      </div>
    </form>
  );
}
