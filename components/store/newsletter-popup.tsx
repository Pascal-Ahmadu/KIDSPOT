"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { subscribeAction, type NewsletterState } from "@/lib/actions/newsletter";

const KEY = "kidstore-newsletter";
const HIDDEN_ON = ["/checkout", "/orders"];

function readState(): { subscribed?: boolean; dismissedAt?: number } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeState(v: { subscribed?: boolean; dismissedAt?: number }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage blocked: the popup just shows again next visit */
  }
}

/**
 * "Sign up for emails" popup from the design. Shows once, a few seconds after arrival; closing it
 * snoozes it for two weeks and subscribing hides it for good. The offer text follows the admin's WELCOME code.
 */
export function NewsletterPopup({ offerLabel, delayMs = 6000, snoozeDays = 14 }: { offerLabel: string | null; delayMs?: number; snoozeDays?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeAction, {});
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const hiddenHere = HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hiddenHere) return;
    const s = readState();
    if (s.subscribed) return;
    if (s.dismissedAt && Date.now() - s.dismissedAt < snoozeDays * 864e5) return;
    const t = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(t);
  }, [hiddenHere, delayMs, snoozeDays]);

  useEffect(() => {
    if (state.ok) writeState({ subscribed: true });
  }, [state.ok]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // Keep Tab inside the dialog.
      if (e.key === "Tab" && dialog.current) {
        const f = dialog.current.querySelectorAll<HTMLElement>("a, button, input");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  function close() {
    if (!readState().subscribed) writeState({ dismissedAt: Date.now() });
    setOpen(false);
  }

  if (!open || hiddenHere) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="nl-popup-title" className="relative w-full max-w-[946px] rounded-[4px] bg-white p-3 shadow-2xl sm:p-[21px]">
        <div className="relative overflow-hidden border-2 border-dashed border-accent px-5 pb-10 pt-12 text-center sm:px-10 sm:pb-[64px] sm:pt-[40px]">
          <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-[31px] w-[31px] place-items-center rounded-full border border-ink bg-white text-ink transition hover:bg-ink hover:text-white sm:right-[17px] sm:top-[14px]">
            <XMarkIcon className="h-4 w-4 stroke-2" />
          </button>

          {/* Decorations: star top-left, leafy blob bottom-left, sprig bottom-right */}
          <svg className="pointer-events-none absolute left-6 top-6 hidden h-[75px] w-[73px] text-[#B19690] sm:block" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 1.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.7l7.1-.6z" />
          </svg>
          <svg className="pointer-events-none absolute -bottom-8 -left-8 hidden h-[166px] w-[208px] text-[#D6AD9C]/40 sm:block" viewBox="0 0 200 160" aria-hidden="true">
            <path fill="currentColor" d="M20 150C10 100 40 40 100 30c40-6 80 20 90 60-30-10-60 0-80 20s-30 40-90 40z" />
          </svg>
          <svg className="pointer-events-none absolute bottom-6 right-6 hidden h-[98px] w-[101px] text-[#B19690]/70 sm:block" viewBox="0 0 100 100" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M50 95V30M50 60c-12-4-20-14-22-26M50 48c12-4 20-14 22-26M50 78c-14-3-24-12-28-24M50 70c14-3 24-12 28-24" />
          </svg>

          <div className="relative mx-auto flex max-w-[641px] flex-col items-center">
            <p className="text-lg font-bold leading-7 text-brand sm:text-xl">SIGN UP FOR EMAILS</p>
            <svg className="mt-1 h-1.5 w-[72px] text-accent" viewBox="0 0 72 6" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M0 3c6-4 12 4 18 0s12 4 18 0 12 4 18 0 12 4 18 0" />
            </svg>
            <h2 id="nl-popup-title" className="mt-6 text-3xl font-bold leading-tight text-ink sm:mt-9 sm:text-[48px] sm:leading-[56px]">
              {offerLabel ? `Get ${offerLabel} your first order, straight to your inbox` : "New arrivals and offers, straight to your inbox"}
            </h2>
            <p className="mt-4 max-w-[520px] text-base leading-6 text-ink sm:mt-7">
              {offerLabel
                ? `Subscribe to our newsletter and we'll give you a ${offerLabel} code right away.`
                : "Subscribe to our newsletter for new arrivals, restocks and member-only offers."}
            </p>

            {state.ok ? (
              <div className="mt-6 w-full max-w-[566px] rounded-[4px] bg-brand-light px-4 py-4 text-ink" role="status">
                <p className="font-bold">{state.already ? "You're already subscribed. Thank you!" : "You're subscribed. Thank you!"}</p>
                {state.code && (
                  <p className="mt-1 text-sm">
                    Use code <b className="rounded bg-white px-1.5 py-0.5 font-mono text-brand">{state.code}</b> at checkout for {state.label}.
                  </p>
                )}
                <button type="button" onClick={close} className="mt-3 text-sm font-semibold text-brand underline">Continue shopping</button>
              </div>
            ) : (
              <form action={action} className="mt-6 w-full max-w-[566px]">
                <input type="hidden" name="source" value="popup" />
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
                </div>
                <div className="flex h-12 overflow-hidden rounded-[4px] border border-line focus-within:border-brand">
                  <label htmlFor="nl-popup-email" className="sr-only">Your email address</label>
                  <input ref={input} id="nl-popup-email" name="email" type="email" required autoComplete="email" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-[19px] text-base text-ink outline-none placeholder:text-muted" />
                  <button type="submit" disabled={pending} className="w-[110px] shrink-0 bg-brand text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60 sm:w-[142px]">
                    {pending ? "…" : "SUBSCRIBE"}
                  </button>
                </div>
                {state.error && <p className="mt-2 text-sm font-semibold text-accent" role="alert">{state.error}</p>}
              </form>
            )}

            <Link href="/about" onClick={close} className="mt-7 text-sm leading-[21px] text-ink underline hover:text-brand">Learn more</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
