"use client";

import Link from "next/link";
import { useActionState } from "react";
import { subscribeAction, type NewsletterState } from "@/lib/actions/newsletter";

/**
 * Dashed "Sign up and get … off your first purchase" banner from the 404 design.
 * The offer text comes from the admin's active WELCOME discount code; without one it's a plain newsletter sign-up.
 */
export function NewsletterBanner({ offerLabel, source }: { offerLabel: string | null; source: string }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeAction, {});

  return (
    <section aria-labelledby="newsletter-title" className="relative overflow-hidden rounded-[4px] border-2 border-dashed border-brand-2 bg-[#FFF6EA] px-6 py-8 sm:px-[46px] lg:py-[38px]">
      {/* Decorative shapes */}
      <svg className="pointer-events-none absolute -left-8 -top-10 h-40 w-40 text-brand/40" viewBox="0 0 100 100" aria-hidden="true">
        <path fill="currentColor" d="M0 0h70c-6 8-2 16-10 22s-18 0-24 8 2 18-6 24-20-2-30 6z" />
      </svg>
      <svg className="pointer-events-none absolute -bottom-16 -left-16 h-28 w-28 text-[#F4B6B8]" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" />
      </svg>
      <span className="pointer-events-none absolute -right-6 -top-16 h-32 w-40 rounded-full bg-[#BFDDDE]/70" aria-hidden="true" />

      <div className="relative grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-12">
        <div className="lg:pl-0">
          <h2 id="newsletter-title" className="max-w-[420px] font-script text-2xl font-bold leading-8 text-brand-2 sm:text-[28px] sm:leading-9">
            {offerLabel ? (
              <>
                Sign up and get <span className="text-accent">{offerLabel}</span> your first purchase
              </>
            ) : (
              <>Sign up for news, new arrivals and offers</>
            )}
          </h2>
          <p className="mt-4 max-w-[460px] text-sm leading-[21px] text-ink">
            Receive offers, product alerts, styling inspiration and more. By signing up, you agree to our{" "}
            <Link href="/support" className="underline hover:text-brand">Privacy Policy</Link>.
          </p>
        </div>

        {state.ok ? (
          <div className="rounded-[4px] bg-white px-4 py-3 text-sm text-ink shadow-sm" role="status">
            <p className="font-bold">{state.already ? "You're already on our list. Thank you!" : "You're subscribed. Thank you!"}</p>
            {state.code && (
              <p className="mt-1">
                Use code <b className="rounded bg-brand-light px-1.5 py-0.5 font-mono text-brand">{state.code}</b> at checkout for {state.label}.
              </p>
            )}
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-1">
            <input type="hidden" name="source" value={source} />
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <div className="flex h-10 overflow-hidden rounded-[4px] bg-white">
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="Enter your email" className="min-w-0 flex-1 bg-transparent px-3 text-xs text-ink outline-none placeholder:text-muted" />
              <button type="submit" disabled={pending} className="shrink-0 bg-brand px-6 text-xs font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
                {pending ? "…" : "Subscribe"}
              </button>
            </div>
            {state.error && <p className="text-xs font-semibold text-accent" role="alert">{state.error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
