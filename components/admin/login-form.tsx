"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

// Filled state (design): white field, grey border, dark 16px text. The autofill rules stop the
// browser tinting saved credentials blue/yellow.
const input =
  "h-11 w-full rounded-[8px] border border-line bg-white px-3.5 text-base leading-6 text-ink shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none placeholder:text-muted focus:border-brand autofill:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--ink)]";

/** Admin "Log in to your account" form (Login design): email, password, remember-for-30-days, forgot password, Sign in. */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  // Keep the email between attempts (React clears uncontrolled fields after a submit).
  const [email, setEmail] = useState("");
  const [forgot, setForgot] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium leading-5 text-ink">Email</label>
          <input id="email" name="email" type="email" required autoComplete="username" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium leading-5 text-ink">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={input} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium leading-5 text-ink">
          <input type="checkbox" name="remember" className="checkbox" />
          Remember for 30 days
        </label>
        <button type="button" onClick={() => setForgot((f) => !f)} aria-expanded={forgot} className="text-sm font-medium leading-5 text-brand hover:underline">
          Forgot password
        </button>
      </div>

      {forgot && (
        <p className="-mt-2 rounded-[8px] bg-brand-light px-3.5 py-2.5 text-sm leading-5 text-ink">
          The admin password is set on the server as <code className="rounded bg-white px-1">ADMIN_PASSWORD</code> in the environment settings. Change it there and restart the site.
        </p>
      )}

      {state.error && (
        <p className="-mt-2 rounded-[8px] bg-accent/10 px-3.5 py-2.5 text-sm font-medium text-accent" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-[8px] border border-brand bg-brand text-base font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
