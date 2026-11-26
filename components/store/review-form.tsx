"use client";

import { useActionState, useState } from "react";
import { submitReviewAction, type ReviewState } from "@/lib/actions/reviews";
import { cn } from "@/lib/format";

export function ReviewForm({ productId }: { productId: number }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReviewAction, {});
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const errs = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="rounded-[8px] bg-brand-light p-6 text-center">
        <p className="text-lg font-bold text-ink">Thank you for your review!</p>
        <p className="mt-1 text-sm text-muted">It&apos;s now live on this page.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-[8px] border border-line p-5 sm:p-6">
      <h3 className="text-xl font-bold leading-7 text-ink">Write a review</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-0.5"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path fill={(hover || rating) >= n ? "#FFC200" : "#E5E7EB"} d="M12 1.8l3.1 6.4 7 1-5.1 4.9 1.2 7L12 17.8 5.8 21.1l1.2-7L1.9 9.2l7-1z" />
              </svg>
            </button>
          ))}
        </div>
        {errs.rating && <p className="mt-1 text-xs font-semibold text-accent">{errs.rating}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" error={errs.name} autoComplete="name" />
        <Field label="Email (not shown)" name="email" type="email" error={errs.email} autoComplete="email" />
      </div>
      <Field label="Title (optional)" name="title" error={errs.title} />
      <div>
        <label className="label" htmlFor="review-body">Your review</label>
        <textarea id="review-body" name="body" rows={4} className={cn("input", errs.body && "border-accent")} placeholder="Fit, softness, how your little one liked it…" />
        {errs.body && <p className="mt-1 text-xs font-semibold text-accent">{errs.body}</p>}
      </div>
      {state.error && <p className="rounded-[6px] bg-accent/10 px-3 py-2 text-sm font-semibold text-accent" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? "Posting…" : "Post review"}
      </button>
      <p className="text-xs text-muted">Reviews from shoppers who ordered this item get a &ldquo;Verified buyer&rdquo; badge.</p>
    </form>
  );
}

function Field({ label, name, type = "text", error, autoComplete }: { label: string; name: string; type?: string; error?: string; autoComplete?: string }) {
  const id = `review-${name}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} className={cn("input", error && "border-accent")} />
      {error && <p className="mt-1 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}
