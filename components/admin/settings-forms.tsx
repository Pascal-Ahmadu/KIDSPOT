"use client";

import { AtSymbolIcon, ClockIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { startTransition, useActionState } from "react";
import { saveDeliveryAction, saveNewsletterAction, saveStoreDetailsAction } from "@/lib/actions/settings";
import type { ActionState } from "@/lib/actions/products";
import type { DeliverySettings, NewsletterSettings, StoreDetails } from "@/lib/settings";
import { FieldError, FieldHint, InputAffix } from "@/components/admin/field";

type Action = (prev: ActionState, data: FormData) => Promise<ActionState>;

/** useActionState + submit through a transition (so fields aren't cleared when the server returns an error). */
function useSettingsForm(action: Action) {
  const [state, run, pending] = useActionState<ActionState, FormData>(action, {});
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  };
  const errs = state.fieldErrors ?? {};
  const bad = (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});
  const err = (k: string) => <FieldError message={errs[k]} id={`${k}-error`} />;
  return { state, run, pending, onSubmit, errs, bad, err };
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[8px] border border-line bg-card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold leading-7 text-ink">{title}</h2>
        {description && <p className="text-sm leading-5 text-[#7C7C7C]">{description}</p>}
      </div>
      <div className="grid gap-5 px-5 py-5">{children}</div>
    </section>
  );
}

function SaveBar({ state, pending }: { state: ActionState; pending: boolean }) {
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {state.success && !pending && (
        <p className="mr-auto rounded-[8px] border border-[#10A957]/30 bg-[#EFFEF5] px-3 py-2 text-sm font-medium text-[#10A957]" role="status">
          {state.success}
        </p>
      )}
      {(state.error || hasFieldErrors) && !pending && (
        <p className="mr-auto rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
          {state.error ?? "Please fix the highlighted fields."}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

const Optional = () => <span className="font-normal text-[#7C7C7C]">(optional)</span>;

/* ------------------------------------------------------------------ */

export function StoreDetailsForm({ value }: { value: StoreDetails }) {
  const f = useSettingsForm(saveStoreDetailsAction);
  const socials = [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "twitter", label: "X (Twitter)" },
    { key: "youtube", label: "YouTube" },
    { key: "pinterest", label: "Pinterest" },
  ] as const;
  return (
    <form action={f.run} onSubmit={f.onSubmit} className="grid gap-6">
      <Section title="Contact" description="Shown in the footer, the mobile menu and on the Contact page.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <InputAffix icon={AtSymbolIcon} invalid={!!f.errs.email}>
              <input id="email" name="email" type="email" className="input" defaultValue={value.email} {...f.bad("email")} required />
            </InputAffix>
            {f.err("email")}
          </div>
          <div>
            <label className="label" htmlFor="hours">
              Opening hours
            </label>
            <InputAffix icon={ClockIcon} invalid={!!f.errs.hours}>
              <input id="hours" name="hours" className="input" defaultValue={value.hours} placeholder="Monday to Friday 8 a.m - 5 p.m" {...f.bad("hours")} required />
            </InputAffix>
            {f.err("hours")}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phones">
              Phone numbers
            </label>
            <textarea id="phones" name="phones" className="input min-h-[96px] resize-y leading-5" defaultValue={value.phones.join("\n")} placeholder={"0801 234 5678\n0901 234 5678"} {...f.bad("phones")} />
            {f.errs.phones ? f.err("phones") : <FieldHint>One per line, up to 4.</FieldHint>}
          </div>
          <div>
            <label className="label" htmlFor="address">
              Address <Optional />
            </label>
            <textarea id="address" name="address" className="input min-h-[96px] resize-y leading-5" defaultValue={value.addressLines.join("\n")} placeholder={"12 Example Street\nIkeja, Lagos"} {...f.bad("addressLines")} />
            {f.errs.addressLines ? f.err("addressLines") : <FieldHint>One line per row. Leave empty to hide the address and map.</FieldHint>}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-[#7C7C7C]">
          <PhoneIcon className="h-4 w-4" aria-hidden="true" /> Numbers become tap-to-call links on phones.
        </p>
      </Section>

      <Section title="Bank details" description="Printed on invoices so customers know where to pay. Leave empty to leave them off.">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="bankName">
              Bank
            </label>
            <input id="bankName" name="bankName" className="input" defaultValue={value.bank.bankName} placeholder="Moniepoint MFB" {...f.bad("bankName")} />
            {f.err("bankName")}
          </div>
          <div>
            <label className="label" htmlFor="accountName">
              Account name
            </label>
            <input id="accountName" name="accountName" className="input" defaultValue={value.bank.accountName} placeholder="Kid's Spot Ltd" {...f.bad("accountName")} />
            {f.err("accountName")}
          </div>
          <div>
            <label className="label" htmlFor="accountNumber">
              Account number
            </label>
            <input id="accountNumber" name="accountNumber" inputMode="numeric" maxLength={10} className="input font-mono" defaultValue={value.bank.accountNumber} placeholder="0123456789" {...f.bad("accountNumber")} />
            {f.err("accountNumber")}
          </div>
        </div>
      </Section>

      <Section title="Social media" description="Leave a link empty to hide that icon.">
        <div className="grid gap-5 sm:grid-cols-2">
          {socials.map((s) => (
            <div key={s.key}>
              <label className="label" htmlFor={s.key}>
                {s.label}
              </label>
              <input id={s.key} name={s.key} type="url" className="input" defaultValue={value.socials[s.key]} placeholder="https://…" {...f.bad(s.key)} />
              {f.err(s.key)}
            </div>
          ))}
        </div>
      </Section>

      <SaveBar state={f.state} pending={f.pending} />
    </form>
  );
}

/* ------------------------------------------------------------------ */

export function DeliveryForm({ value }: { value: DeliverySettings }) {
  const f = useSettingsForm(saveDeliveryAction);
  return (
    <form action={f.run} onSubmit={f.onSubmit} className="grid gap-6">
      <Section title="Delivery note" description="The store doesn't charge for delivery. Orders go out with Bolt, inDrive or GIGM and the customer pays the rider or park directly.">
        <div>
          <label className="label" htmlFor="note">
            What shoppers see
          </label>
          <textarea id="note" name="note" className="input min-h-[120px] resize-y leading-5" defaultValue={value.note} {...f.bad("note")} required />
          {f.errs.note ? f.err("note") : <FieldHint>Shown in the cart, at checkout and on the Support page. Only promise what you can keep.</FieldHint>}
        </div>
      </Section>

      <SaveBar state={f.state} pending={f.pending} />
    </form>
  );
}

/* ------------------------------------------------------------------ */

export function NewsletterForm({ value, codeStatus }: { value: NewsletterSettings; codeStatus: string }) {
  const f = useSettingsForm(saveNewsletterAction);
  return (
    <form action={f.run} onSubmit={f.onSubmit} className="grid gap-6">
      <Section title="Sign-up popup" description="The “Sign up for emails” box shoppers see on their first visit.">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="popupEnabled" defaultChecked={value.popupEnabled} className="checkbox mt-0.5" />
          <span>
            <span className="block font-medium text-ink">Show the popup</span>
            <span className="block text-[#7C7C7C]">Never shown on checkout or order pages, or to people who already signed up.</span>
          </span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="delaySeconds">
              Show after (seconds)
            </label>
            <input id="delaySeconds" name="delaySeconds" type="number" min={0} max={120} className="input" defaultValue={value.delaySeconds} {...f.bad("delaySeconds")} />
            {f.errs.delaySeconds ? f.err("delaySeconds") : <FieldHint>How long after arriving before it appears.</FieldHint>}
          </div>
          <div>
            <label className="label" htmlFor="snoozeDays">
              Hide after closing (days)
            </label>
            <input id="snoozeDays" name="snoozeDays" type="number" min={1} max={365} className="input" defaultValue={value.snoozeDays} {...f.bad("snoozeDays")} />
            {f.errs.snoozeDays ? f.err("snoozeDays") : <FieldHint>When someone closes it, wait this long before showing it again.</FieldHint>}
          </div>
        </div>
      </Section>

      <Section title="Welcome offer" description="A discount code given to new subscribers right after they sign up.">
        <div>
          <label className="label" htmlFor="welcomeCode">
            Welcome code <Optional />
          </label>
          <input id="welcomeCode" name="welcomeCode" className="input font-mono uppercase" defaultValue={value.welcomeCode} placeholder="WELCOME" {...f.bad("welcomeCode")} />
          {f.errs.welcomeCode ? f.err("welcomeCode") : <FieldHint>{codeStatus}</FieldHint>}
        </div>
      </Section>

      <SaveBar state={f.state} pending={f.pending} />
    </form>
  );
}
