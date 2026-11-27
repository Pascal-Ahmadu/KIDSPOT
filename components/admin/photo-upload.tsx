"use client";

import { ArrowPathIcon, CameraIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ProductImage } from "@/components/store/product-image";
import { setProductPhotoAction } from "@/lib/actions/products";
import { cn } from "@/lib/format";

/** Shrinks a photo in the browser (max 1600px, JPEG) so phone pictures upload fast and under the size limit. */
export async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

/** Product thumbnail you can click to add or replace the main photo (Inventory and Products lists). */
export function PhotoUpload({ productId, imageUrl, name, className }: { productId: number; imageUrl: string | null; name: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("photo", await shrink(file));
      const res = await setProductPhotoAction(productId, fd);
      if (res.error) setError(res.error);
      else router.refresh();
      if (input.current) input.current.value = "";
    });
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        title={imageUrl ? `Change photo of ${name}` : `Add a photo of ${name}`}
        aria-label={imageUrl ? `Change photo of ${name}` : `Add a photo of ${name}`}
        className={cn("group relative block h-9 w-9 shrink-0 overflow-hidden rounded-[6px] bg-surface", className)}
      >
        <ProductImage src={imageUrl} alt={name} />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center bg-ink/45 text-white transition",
            pending ? "opacity-100" : imageUrl ? "opacity-0 group-hover:opacity-100" : "bg-ink/25 opacity-100 group-hover:bg-ink/45",
          )}
        >
          {pending ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CameraIcon className="h-4 w-4" aria-hidden="true" />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {error && (
        <span role="alert" className="absolute left-0 top-full z-10 mt-1 w-48 rounded-[6px] bg-accent px-2 py-1 text-xs text-white">
          {error}
        </span>
      )}
    </span>
  );
}
