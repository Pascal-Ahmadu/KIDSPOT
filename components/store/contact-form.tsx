"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useActionState, useRef, useState } from "react";
import { sendContactMessageAction, type ContactState } from "@/lib/actions/contact";
import { CONTACT_SUBJECTS } from "@/lib/attributes";
import { cn } from "@/lib/format";

const box = "h-[51px] w-full rounded-[4px] border bg-white px-[18px] text-sm text-ink outline-none placeholder:text-muted focus:border-brand";

/** "Get in Touch" form from the Contact page design. */
export function ContactForm() {
  // Controlled fields: React clears uncontrolled ones after every submit, which would wipe a message on a validation error.
  const empty = { name: "", email: "", phone: "", subject: "", message: "" };
  const [v, setV] = useState(empty);
  const [state, action, pending] = useActionState<ContactState, FormData>(async (prev, fd) => {
    const res = await sendContactMessageAction(prev, fd);
    if (res.ok) setV(empty);
    return res;
  }, {});
  const form = useRef<HTMLFormElement>(null);
  const errs = state.fieldErrors ?? {};
  const bind = (k: keyof typeof empty) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((o) => ({ ...o, [k]: e.target.value })),
  });



  const err = (k: string) => errs[k] && <p className="mt-1 text-xs font-semibold text-accent">{errs[k]}</p>;
  const border = (k: string) => (errs[k] ? "border-accent" : "border-line");

  return (
    <form ref={form} action={action} className="flex flex-col gap-3" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="sr-only">Your name</label>
          <input id="c-name" {...bind("name")} name="name" required autoComplete="name" placeholder="Your name *" className={cn(box, border("name"))} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="c-email" className="sr-only">Your email</label>
          <input id="c-email" {...bind("email")} name="email" type="email" required autoComplete="email" placeholder="Your email *" className={cn(box, border("email"))} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="c-phone" className="sr-only">Your phone number</label>
          <input id="c-phone" {...bind("phone")} name="phone" type="tel" autoComplete="tel" placeholder="Your phone number" className={cn(box, border("phone"))} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="c-subject" className="sr-only">Subject</label>
          <div className="relative">
            <select id="c-subject" {...bind("subject")} name="subject" required className={cn(box, border("subject"), "appearance-none pr-10 invalid:text-muted")}>
              <option value="" disabled>Subject *</option>
              {CONTACT_SUBJECTS.map((s) => (
                <option key={s} value={s} className="text-ink">{s}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 stroke-2 text-ink" aria-hidden="true" />
          </div>
          {err("subject")}
        </div>
      </div>
      <div>
        <label htmlFor="c-message" className="sr-only">Your message</label>
        <textarea id="c-message" {...bind("message")} name="message" required rows={7} placeholder="Write a message *" className={cn("w-full rounded-[4px] border bg-white p-[18px] text-sm text-ink outline-none placeholder:text-muted focus:border-brand", border("message"))} />
        {err("message")}
      </div>
      {state.error && <p className="text-sm font-semibold text-accent" role="alert">{state.error}</p>}
      {state.ok && (
        <p className="rounded-[4px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          Thank you! Your message has been sent. We reply Monday to Friday, usually within one working day.
        </p>
      )}
      <button type="submit" disabled={pending} className="mt-3 inline-flex h-12 items-center justify-center self-start rounded-[4px] bg-brand px-[26px] text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
