"use client";

import { ArrowPathIcon, CameraIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { shrink } from "@/components/admin/photo-upload";
import { ProductImage } from "@/components/store/product-image";
import { removeColorPhotoAction, setColorPhotoAction } from "@/lib/actions/products";
import { cn } from "@/lib/format";

type Colour = { key: string; label: string; hex: string };

/** Products → edit: one real photo per colour. In the shop, choosing the colour shows its photo. */
export function ColorPhotos({ productId, colors, images }: { productId: number; colors: Colour[]; images: Record<string, string> }) {
  return (
    <section className="mt-8 rounded-[8px] border border-line bg-card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold leading-7 text-ink">Photos by colour</h2>
        <p className="text-sm leading-5 text-[#7C7C7C]">
          {colors.length
            ? "Add a photo of each colour. In the shop, picking a colour shows its photo; a colour without one shows the main photo with a note."
            : "Tick the colours this product comes in (Sizes & colours, above) and save. Then add a photo for each colour here."}
        </p>
      </div>
      {colors.length > 0 && (
        <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4 lg:grid-cols-6">
          {colors.map((c) => (
            <ColourSlot key={c.key} productId={productId} colour={c} url={images[c.key] ?? null} />
          ))}
        </div>
      )}
    </section>
  );
}

function ColourSlot({ productId, colour, url }: { productId: number; colour: Colour; url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("photo", await shrink(file));
      const res = await setColorPhotoAction(productId, colour.key, fd);
      if (res.error) setError(res.error);
      else router.refresh();
      if (input.current) input.current.value = "";
    });
  };
  const remove = () =>
    start(async () => {
      const res = await removeColorPhotoAction(productId, colour.key);
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={url ? `Change the ${colour.label.toLowerCase()} photo` : `Add a ${colour.label.toLowerCase()} photo`}
        className={cn(
          "group relative aspect-[4/5] overflow-hidden rounded-[8px] border bg-surface",
          url ? "border-line" : "border-dashed border-[#BDBDBD] hover:border-brand",
        )}
      >
        {url ? (
          <ProductImage sizes="200px" src={url} alt={`${colour.label} photo`} />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-center text-xs font-medium text-[#7C7C7C] group-hover:text-brand">
            <span className="grid justify-items-center gap-1">
              <CameraIcon className="h-6 w-6" aria-hidden="true" />
              Add photo
            </span>
          </span>
        )}
        {(pending || url) && (
          <span className={cn("absolute inset-0 grid place-items-center bg-ink/45 text-white transition", pending ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            {pending ? <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" /> : <CameraIcon className="h-5 w-5" aria-hidden="true" />}
          </span>
        )}
      </button>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
          <span className="h-4 w-4 shrink-0 rounded-full border border-line" style={{ background: colour.hex }} aria-hidden="true" />
          <span className="truncate">{colour.label}</span>
        </span>
        {url && !pending && (
          <button type="button" onClick={remove} className="text-[#7C7C7C] hover:text-accent" aria-label={`Remove the ${colour.label.toLowerCase()} photo`}>
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}
