"use client";

import { PhotoIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { saveBannerAction } from "@/lib/actions/banners";
import type { ActionState } from "@/lib/actions/products";
import type { Banner } from "@/lib/banners";
import { FieldError, FieldHint, InputAffix } from "@/components/admin/field";

/** Add / edit one home page banner. Shown in the Banners modal; closes (goes to `doneHref`) after saving. */
export function BannerForm({ banner, doneHref }: { banner?: Banner; doneHref: string }) {
  const [state, run, pending] = useActionState<ActionState, FormData>(saveBannerAction, {});
  const [preview, setPreview] = useState(banner?.image ?? "");
  const router = useRouter();
  const errs = state.fieldErrors ?? {};
  const bad = (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});
  const err = (k: string) => <FieldError message={errs[k]} id={`${k}-error`} />;

  useEffect(() => {
    if (state.success) router.replace(doneHref, { scroll: false });
  }, [state, router, doneHref]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  }

  return (
    <form action={run} onSubmit={onSubmit} className="grid gap-5">
      {banner && <input type="hidden" name="id" value={banner.id} />}

      {/* Picture */}
      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="aspect-[4/3] overflow-hidden rounded-[8px] border border-line bg-surface">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-[#BDBDBD]">
              <PhotoIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <span className="label">Picture</span>
            <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#BDBDBD] text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-light hover:text-brand">
              <PhotoIcon className="h-5 w-5" aria-hidden="true" /> Upload picture
              <input
                type="file"
                name="imageFile"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>
          <input type="hidden" name="imageUrl" value={banner?.image ?? ""} />
          {errs.imageUrl ? err("imageUrl") : <FieldHint>{banner ? "Upload a new picture to replace this one. " : ""}A wide photo works best (about 4:3), under 5MB.</FieldHint>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="imageAlt">
          Picture description
        </label>
        <input id="imageAlt" name="imageAlt" className="input" defaultValue={banner?.imageAlt} placeholder="Knit baby cardigans and hats in pink and green" {...bad("imageAlt")} required />
        {errs.imageAlt ? err("imageAlt") : <FieldHint>Read out by screen readers. Describe what is in the photo.</FieldHint>}
      </div>

      {/* Words */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="eyebrow">
            Small heading <span className="font-normal text-[#7C7C7C]">(optional)</span>
          </label>
          <input id="eyebrow" name="eyebrow" className="input" defaultValue={banner?.eyebrow} placeholder="New In" {...bad("eyebrow")} />
          {err("eyebrow")}
        </div>
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" className="input" defaultValue={banner?.title} placeholder="Knit Sets" {...bad("title")} required />
          {err("title")}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
        <div>
          <label className="label" htmlFor="subtitle">
            Text <span className="font-normal text-[#7C7C7C]">(optional)</span>
          </label>
          <input id="subtitle" name="subtitle" className="input" defaultValue={banner?.subtitle} placeholder="Cosy outfits, ready to gift" {...bad("subtitle")} />
          {err("subtitle")}
        </div>
        <div>
          <label className="label" htmlFor="dealPercent">
            Deal tag <span className="font-normal text-[#7C7C7C]">(optional)</span>
          </label>
          <InputAffix prefix="%" invalid={!!errs.dealPercent}>
            <input id="dealPercent" name="dealPercent" type="number" min={1} max={95} className="input" defaultValue={banner?.dealPercent ?? ""} placeholder="70" {...bad("dealPercent")} />
          </InputAffix>
          {errs.dealPercent ? err("dealPercent") : <FieldHint>“Up to n% off”</FieldHint>}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid gap-5 rounded-[8px] border border-line p-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="primaryLabel">
            Main button
          </label>
          <input id="primaryLabel" name="primaryLabel" className="input" defaultValue={banner?.primary.label} placeholder="Shop Clothing" {...bad("primaryLabel")} required />
          {err("primaryLabel")}
        </div>
        <div>
          <label className="label" htmlFor="primaryHref">
            Goes to
          </label>
          <input id="primaryHref" name="primaryHref" className="input" defaultValue={banner?.primary.href} placeholder="/products?category=clothing" {...bad("primaryHref")} required />
          {err("primaryHref")}
        </div>
        <div>
          <label className="label" htmlFor="secondaryLabel">
            Second button <span className="font-normal text-[#7C7C7C]">(optional)</span>
          </label>
          <input id="secondaryLabel" name="secondaryLabel" className="input" defaultValue={banner?.secondary.label} placeholder="New Arrivals" {...bad("secondaryLabel")} />
          {err("secondaryLabel")}
        </div>
        <div>
          <label className="label" htmlFor="secondaryHref">
            Goes to
          </label>
          <input id="secondaryHref" name="secondaryHref" className="input" defaultValue={banner?.secondary.href} placeholder="/products" {...bad("secondaryHref")} />
          {err("secondaryHref")}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={banner?.enabled ?? true} className="checkbox mt-0.5" />
        <span>
          <span className="block font-medium text-ink">Show on the home page</span>
          <span className="block text-[#7C7C7C]">Untick to keep it saved but hidden.</span>
        </span>
      </label>

      {state.error && (
        <p className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Link href={doneHref} scroll={false} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : banner ? "Save banner" : "Add banner"}
        </button>
      </div>
    </form>
  );
}
