import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeAction } from "@/lib/actions/unsubscribe";
import { verifyUnsubscribeToken } from "@/lib/email";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

type SP = Promise<{ c?: string; t?: string; done?: string }>;

/** Linked from every offer email. Unsubscribing needs a button press, so mail scanners can't do it by opening the link. */
export default async function UnsubscribePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const c = Number(sp.c);
  const valid = Number.isInteger(c) && verifyUnsubscribeToken(c, sp.t);
  return (
    <div className="container-x max-w-xl py-16 text-center">
      <h1 className="section-title">Email preferences</h1>
      {!valid || sp.done === "0" ? (
        <p className="section-sub mt-4">This link doesn&apos;t work. Please use the unsubscribe link from your latest email, or contact us.</p>
      ) : sp.done === "1" ? (
        <>
          <p className="section-sub mt-4">You&apos;re unsubscribed. We won&apos;t send you offers or follow-up emails again.</p>
          <p className="mt-2 text-sm text-muted">You&apos;ll still get a receipt by email when you shop with us and give your email.</p>
        </>
      ) : (
        <form action={unsubscribeAction} className="mt-6 grid justify-items-center gap-4">
          <p className="section-sub">Stop emails about new stock and offers from Kidspot?</p>
          <input type="hidden" name="c" value={c} />
          <input type="hidden" name="t" value={sp.t} />
          <button type="submit" className="btn btn-primary">
            Unsubscribe
          </button>
        </form>
      )}
      <Link href="/" className="mt-8 inline-block text-sm font-semibold text-brand hover:underline">
        Back to the shop
      </Link>
    </div>
  );
}
