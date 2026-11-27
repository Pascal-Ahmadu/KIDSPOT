"use client";

import { useState, useTransition } from "react";
import { FieldHint } from "@/components/admin/field";
import { Optional, SaveBar, Section, useSettingsForm } from "@/components/admin/settings-forms";
import { runFollowUpsNowAction, saveEmailSettingsAction, sendTestEmailAction } from "@/lib/actions/emails";
import type { ActionState } from "@/lib/actions/products";
import type { EmailKind, EmailSettings, EmailTemplate } from "@/lib/email-config";

const MESSAGES: { kind: EmailKind; title: string; description: string; days?: { label: string; hint: string; min: number; max: number } }[] = [
  {
    kind: "receipt",
    title: "Receipt",
    description: "Sent straight after a till sale or online order to anyone who gives an email. No permission needed.",
  },
  {
    kind: "thankYou",
    title: "Thank you",
    description: "A short thank-you a few days after they buy. Only to customers who agreed to emails.",
    days: { label: "Days after buying", hint: "At most one thank-you a week per customer.", min: 1, max: 60 },
  },
  {
    kind: "comeBack",
    title: "Come back",
    description: "When a customer hasn't bought anything for a while. Only to customers who agreed to emails; once per absence.",
    days: { label: "Days without buying", hint: "Sent once; it resets when they buy again.", min: 7, max: 365 },
  },
  {
    kind: "loyalty",
    title: "Loyalty reminder",
    description: "When a customer is one purchase away from their loyalty reward (Settings → Shop controls). Only to customers who agreed to emails.",
  },
];

/** Settings → Emails: sender, the four automatic messages, test sends. */
export function EmailSettingsForm({ value, connected, testTo }: { value: EmailSettings; connected: boolean; testTo: string }) {
  const f = useSettingsForm(saveEmailSettingsAction);
  const [to, setTo] = useState(testTo);
  const [testing, startTest] = useTransition();
  const [result, setResult] = useState<ActionState & { kind?: string }>({});

  const test = (kind: EmailKind) =>
    startTest(async () => {
      setResult({ kind });
      setResult({ kind, ...(await sendTestEmailAction(kind, to)) });
    });

  return (
    <form onSubmit={f.onSubmit} className="grid gap-6">
      <Section title="Sender" description="Who the emails come from. The address must be on a domain verified in Resend (kidspot.com.ng).">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fromName">
              Sender name
            </label>
            <input id="fromName" name="fromName" className="input" defaultValue={value.fromName} {...f.bad("fromName")} />
            {f.err("fromName")}
          </div>
          <div>
            <label className="label" htmlFor="fromAddress">
              Sender address
            </label>
            <input id="fromAddress" name="fromAddress" type="email" className="input" defaultValue={value.fromAddress} {...f.bad("fromAddress")} />
            {f.err("fromAddress")}
          </div>
          <div>
            <label className="label" htmlFor="replyTo">
              Replies go to <Optional />
            </label>
            <input id="replyTo" name="replyTo" type="email" className="input" defaultValue={value.replyTo} placeholder="The store email" {...f.bad("replyTo")} />
            {f.errs.replyTo ? f.err("replyTo") : <FieldHint>Empty means the email in Store details.</FieldHint>}
          </div>
          <div>
            <label className="label" htmlFor="dailyLimit">
              Daily limit
            </label>
            <input id="dailyLimit" name="dailyLimit" type="number" min={1} className="input" defaultValue={value.dailyLimit} {...f.bad("dailyLimit")} />
            {f.errs.dailyLimit ? f.err("dailyLimit") : <FieldHint>Resend&apos;s free plan allows 100 a day. Anything left over goes the next day.</FieldHint>}
          </div>
        </div>
      </Section>

      <section className="rounded-[8px] border border-line bg-card px-5 py-4">
        <label className="label" htmlFor="testTo">
          Send test emails to
        </label>
        <div className="flex flex-wrap gap-3">
          <input id="testTo" type="email" value={to} onChange={(e) => setTo(e.target.value)} className="input min-w-0 flex-1" placeholder="you@example.com" />
        </div>
        <FieldHint>
          {connected
            ? "Each message below has a “Send test” button. Tests use sample details (customer Ada, order KS-TEST-0001). Save first to test your changes."
            : "Tests work once Resend is connected."}
        </FieldHint>
      </section>

      {MESSAGES.map((m) => {
        const tpl = value[m.kind] as EmailTemplate & { days?: number };
        return (
          <Section key={m.kind} title={m.title} description={m.description}>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" name={`${m.kind}Enabled`} defaultChecked={tpl.enabled} className="checkbox" />
              Send this email
            </label>
            {m.days && (
              <div className="max-w-[220px]">
                <label className="label" htmlFor={`${m.kind}Days`}>
                  {m.days.label}
                </label>
                <input id={`${m.kind}Days`} name={`${m.kind}Days`} type="number" min={m.days.min} max={m.days.max} className="input" defaultValue={tpl.days} {...f.bad(`${m.kind}Days`)} />
                {f.errs[`${m.kind}Days`] ? f.err(`${m.kind}Days`) : <FieldHint>{m.days.hint}</FieldHint>}
              </div>
            )}
            <div>
              <label className="label" htmlFor={`${m.kind}Subject`}>
                Subject
              </label>
              <input id={`${m.kind}Subject`} name={`${m.kind}Subject`} className="input" defaultValue={tpl.subject} {...f.bad(`${m.kind}Subject`)} />
              {f.err(`${m.kind}Subject`)}
            </div>
            <div>
              <label className="label" htmlFor={`${m.kind}Body`}>
                Message
              </label>
              <textarea id={`${m.kind}Body`} name={`${m.kind}Body`} rows={7} className="input h-auto py-3 leading-6" defaultValue={tpl.body} {...f.bad(`${m.kind}Body`)} />
              {f.errs[`${m.kind}Body`] ? (
                f.err(`${m.kind}Body`)
              ) : (
                <FieldHint>
                  {"{name}"} first name · {m.kind === "receipt" ? "{order} order number · {total} amount · {link} receipt link" : m.kind === "loyalty" ? "{reward} reward amount · {link} shop link" : "{link} shop link"}. A line with only {"{link}"} becomes a button.
                  {m.kind !== "receipt" && " An unsubscribe link is added at the bottom."}
                </FieldHint>
              )}
            </div>
            {connected && (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={testing} onClick={() => test(m.kind)} className="btn btn-ghost">
                  {testing && result.kind === m.kind ? "Sending…" : "Send test"}
                </button>
                {result.kind === m.kind && !testing && (result.success || result.error) && (
                  <p className={result.error ? "text-sm font-medium text-accent" : "text-sm font-medium text-[#10A957]"} role="status">
                    {result.error ?? result.success}
                  </p>
                )}
              </div>
            )}
          </Section>
        );
      })}

      <SaveBar state={f.state} pending={f.pending} />
    </form>
  );
}

/** Sends due follow-ups now (they also go out by themselves, checked hourly). */
export function RunFollowUpsButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending} onClick={() => start(async () => setState(await runFollowUpsNowAction()))} className="btn btn-ghost">
        {pending ? "Checking…" : "Send due follow-ups now"}
      </button>
      {!pending && (state.success || state.error) && (
        <p className={state.error ? "text-sm font-medium text-accent" : "text-sm font-medium text-[#10A957]"} role="status">
          {state.error ?? state.success}
        </p>
      )}
    </div>
  );
}
