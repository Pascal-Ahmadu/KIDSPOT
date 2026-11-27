"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/account";
import { cn } from "@/lib/format";
import { useAccount, type AuthTab } from "@/lib/store/account";

const input = "h-[51px] w-full rounded-[4px] border bg-card px-[18px] text-sm text-ink outline-none placeholder:text-muted focus:border-brand";

/** Phone-with-password illustration for the peach header band. */
function LoginArt() {
  return (
    <svg viewBox="0 0 284 220" className="h-full w-auto" aria-hidden="true">
      <circle cx="40" cy="160" r="18" fill="#0ACF83" opacity=".85" />
      <path d="M22 196h40v14H22z" fill="#EEECF0" />
      <circle cx="235" cy="70" r="28" fill="#FFD857" />
      <path d="M235 52v22l12 8" stroke="#2F304C" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="68" y="12" width="122" height="206" rx="16" fill="#2F304C" />
      <rect x="76" y="22" width="106" height="186" rx="10" fill="#fff" />
      <rect x="120" y="16" width="20" height="4" rx="2" fill="#797885" />
      <circle cx="129" cy="64" r="18" fill="#748CE6" />
      <circle cx="129" cy="58" r="6" fill="#fff" />
      <path d="M118 74c3-7 19-7 22 0" fill="#fff" />
      <rect x="90" y="110" width="78" height="16" rx="8" fill="#F992C7" />
      <rect x="90" y="136" width="78" height="16" rx="8" fill="#F992C7" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <circle cx={100 + i * 12} cy="118" r="3" fill="#fff" />
          <circle cx={100 + i * 12} cy="144" r="3" fill="#fff" />
        </g>
      ))}
      <rect x="96" y="172" width="66" height="18" rx="9" fill="#2F304C" />
      <rect x="204" y="128" width="60" height="64" rx="8" fill="#FFD857" />
      <path d="M218 128v-12a16 16 0 0 1 32 0v12" stroke="#2F304C" strokeWidth="6" fill="none" />
      <circle cx="234" cy="156" r="7" fill="#2F304C" />
      <rect x="232" y="158" width="4" height="14" rx="2" fill="#2F304C" />
    </svg>
  );
}

function Field({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={props.id} className="sr-only">{label}</label>
      <input {...props} placeholder={label} className={cn(input, error ? "border-accent" : "border-line")} aria-invalid={!!error} />
      {error && <p className="mt-1 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});
  const [forgot, setForgot] = useState(false);
  // React clears uncontrolled fields after each submit; keep the email so a retry only needs the password.
  const [email, setEmail] = useState("");
  const errs = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-3">
        <Field id="login-email" name="email" type="email" label="Email address" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={errs.email} />
        <Field id="login-password" name="password" type="password" label="Password" autoComplete="current-password" error={errs.password} />
        <button type="button" onClick={() => setForgot((f) => !f)} className="self-start text-sm leading-[21px] text-brand hover:underline">
          Forgot your password?
        </button>
        {forgot && (
          <p className="rounded-[4px] bg-brand-light px-3 py-2 text-sm text-ink">
            We can reset it for you. <Link href="/contact" className="font-semibold text-brand underline">Send us a message</Link> from the email on your account.
          </p>
        )}
      </div>
      {state.error && <p className="-mt-3 text-sm font-semibold text-accent" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="h-[51px] w-full rounded-[4px] bg-brand text-base font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Logging in…" : "Login"}
      </button>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});
  const [v, setV] = useState({ firstName: "", lastName: "", email: "" });
  const bind = (k: keyof typeof v) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV((o) => ({ ...o, [k]: e.target.value })) });
  const errs = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-3">
        <Field id="reg-first" name="firstName" label="First Name" autoComplete="given-name" autoFocus {...bind("firstName")} error={errs.firstName} />
        <Field id="reg-last" name="lastName" label="Last Name" autoComplete="family-name" {...bind("lastName")} error={errs.lastName} />
        <Field id="reg-email" name="email" type="email" label="Email" autoComplete="email" {...bind("email")} error={errs.email} />
        <Field id="reg-password" name="password" type="password" label="Password (at least 8 characters)" autoComplete="new-password" minLength={8} error={errs.password} />
        <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm leading-[21px] text-ink">
          <input type="checkbox" name="newsletter" className="mt-0.5 h-5 w-5 shrink-0 rounded-[3px] border border-muted accent-brand" />
          <span>Email me new arrivals, restocks and member offers. You can unsubscribe at any time.</span>
        </label>
      </div>
      {state.error && <p className="-mt-3 text-sm font-semibold text-accent" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="h-[51px] w-full rounded-[4px] bg-brand text-base font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Creating account…" : "Register"}
      </button>
    </form>
  );
}

function TabButton({ id, label, active, onSelect }: { id: AuthTab; label: string; active: AuthTab; onSelect: (t: AuthTab) => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === id}
      onClick={() => onSelect(id)}
      className={cn("text-2xl font-bold leading-8 transition", active === id ? "text-ink" : "text-[#BEC0C1] hover:text-muted")}
    >
      {label}
    </button>
  );
}

/** Login / Register popup from the design (peach illustration band, tab titles, 51px fields). */
export function AuthModal() {
  const router = useRouter();
  const tab = useAccount((s) => s.modal);
  const openAuth = useAccount((s) => s.openAuth);
  const closeAuth = useAccount((s) => s.closeAuth);
  const refresh = useAccount((s) => s.refresh);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tab) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAuth();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [tab, closeAuth]);

  const onDone = useCallback(() => {
    closeAuth();
    void refresh();
    router.refresh();
  }, [closeAuth, refresh, router]);

  if (!tab) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-ink/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={tab === "login" ? "Login" : "Register"} className="relative my-auto w-full max-w-[482px] overflow-hidden rounded-[4px] bg-card shadow-2xl">
        <div className="flex h-[180px] items-end justify-start bg-[#FFF5F2] pl-3 pt-6 sm:h-[253px] sm:pl-[11px] sm:pt-[33px]">
          <LoginArt />
        </div>
        <button type="button" onClick={closeAuth} aria-label="Close" className="absolute right-[25px] top-[24px] grid h-[31px] w-[31px] place-items-center rounded-full border border-ink bg-card text-ink transition hover:bg-ink hover:text-white">
          <XMarkIcon className="h-4 w-4 stroke-2" />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-[33px] sm:pt-[48px]">
          <div role="tablist" aria-label="Account" className="mb-[25px] flex gap-[29px]">
            <TabButton id="login" label="Login" active={tab} onSelect={openAuth} />
            <TabButton id="register" label="Register" active={tab} onSelect={openAuth} />
          </div>
          {tab === "login" ? <LoginForm key="login" onDone={onDone} /> : <RegisterForm key="register" onDone={onDone} />}
          <p className="mt-10 text-center text-sm leading-[21px] text-ink/80">
            <Link href="/support" onClick={closeAuth} className="hover:text-brand hover:underline">Privacy &amp; Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
