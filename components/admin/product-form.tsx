"use client";

import { CubeIcon, PhotoIcon, TagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { createProductAction, updateProductAction, type ActionState } from "@/lib/actions/products";
import type { Category, Product } from "@/lib/db/schema";
import { COLORS, SIZES, decodeList } from "@/lib/attributes";
import { fromMinor, slugify } from "@/lib/format";
import { CategoryPicker } from "@/components/admin/category-picker";
import { FieldError, FieldHint, InputAffix } from "@/components/admin/field";
import { ProductImage } from "@/components/store/product-image";
import { Select } from "@/components/ui/select";

type Props = { categories: Category[]; product?: Product };

/** Card in the dashboard style: 20px title + one-line description, divider, then the fields. */
function Card({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[8px] border border-line bg-card ${className ?? ""}`}>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold leading-7 text-ink">{title}</h2>
        {description && <p className="text-sm leading-5 text-[#7C7C7C]">{description}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function Optional() {
  return <span className="font-normal text-[#7C7C7C]">(optional)</span>;
}

export function ProductForm({ categories, product, suggestedSku }: Props & { suggestedSku?: string }) {
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [preview, setPreview] = useState<string | null>(product?.imageUrl ?? null);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const errs = state.fieldErrors ?? {};

  const err = (k: string) => <FieldError message={errs[k]} id={`${k}-error`} />;
  /** aria props that switch a field to the design's danger state when the server rejected it. */
  const bad = (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});

  /**
   * Submit through a transition instead of the native form action, so React 19 doesn't clear
   * every field when the server sends the form back with an error.
   */
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  const galleryText = (() => {
    try {
      return product?.gallery ? (JSON.parse(product.gallery) as string[]).join("\n") : "";
    } catch {
      return "";
    }
  })();

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* ---------------- Main column ---------------- */}
      <div className="min-w-0 space-y-6">
        <Card title="Product details" description="What shoppers see first on the product page.">
          <div className="grid gap-5">
            <div>
              <label className="label" htmlFor="name">
                Product name
              </label>
              <InputAffix help="Shown on the product page, in search and on the order slip." invalid={!!errs.name}>
                <input
                  id="name"
                  name="name"
                  className="input"
                  {...bad("name")}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Rainbow Stacking Rings"
                  required
                />
              </InputAffix>
              {err("name")}
            </div>
            <div>
              <label className="label" htmlFor="description">
                Description
              </label>
              <textarea id="description" name="description" className="input min-h-[120px] resize-y leading-5" defaultValue={product?.description ?? ""} placeholder="What makes this product great?" />
              <FieldHint>Shown in the Description tab on the product page.</FieldHint>
            </div>
            <div>
              <label className="label" htmlFor="details">
                Details &amp; care <Optional />
              </label>
              <textarea id="details" name="details" className="input min-h-[120px] resize-y leading-5" defaultValue={product?.details ?? ""} placeholder="100% cotton · Machine wash cold, inside out" />
              <FieldHint>Shown in the Details &amp; Care tab. One point per line.</FieldHint>
            </div>
          </div>
        </Card>

        <Card title="Photos" description="A square photo on a plain background looks best.">
          <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="aspect-square overflow-hidden rounded-[8px] border border-line bg-surface">
              <ProductImage sizes="320px" src={preview} alt="Main photo preview" />
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <span className="label">Main photo</span>
                <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#BDBDBD] text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-light hover:text-brand">
                  <PhotoIcon className="h-5 w-5" aria-hidden="true" /> Upload photo
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
              <div>
                <label className="label" htmlFor="imageUrl">
                  …or paste an image link
                </label>
                <input
                  id="imageUrl"
                  name="imageUrl"
                  className="input"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setPreview(e.target.value || null);
                  }}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <span className="label">
              Extra photos <Optional />
            </span>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <textarea id="gallery" name="gallery" aria-label="Extra photo links, one per line" className="input min-h-[96px] resize-y leading-5" defaultValue={galleryText} placeholder="One link per line, e.g. /uploads/back.jpg" />
              <label className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-[#BDBDBD] text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-light hover:text-brand">
                <PhotoIcon className="h-6 w-6" aria-hidden="true" />
                Upload extra photos
                <input type="file" name="galleryFiles" accept="image/*" multiple className="sr-only" />
              </label>
            </div>
            <FieldHint>Shown as thumbnails on the product page. Up to 12.</FieldHint>
          </div>
        </Card>

        <Card title="Pricing" description="Prices in naira. Cost price is never shown to shoppers.">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="price">
                Selling price
              </label>
              <InputAffix prefix="₦" invalid={!!errs.price}>
                <input id="price" name="price" className="input" {...bad("price")} inputMode="decimal" defaultValue={fromMinor(product?.price)} placeholder="6,500" required />
              </InputAffix>
              {err("price")}
            </div>
            <div>
              <label className="label" htmlFor="compareAtPrice">
                Compare-at price <Optional />
              </label>
              <InputAffix prefix="₦" help="The old price. Shown crossed out next to the selling price." invalid={!!errs.compareAtPrice}>
                <input id="compareAtPrice" name="compareAtPrice" className="input" {...bad("compareAtPrice")} inputMode="decimal" defaultValue={fromMinor(product?.compareAtPrice)} placeholder="8,000" />
              </InputAffix>
              {err("compareAtPrice")}
            </div>
            <div>
              <label className="label" htmlFor="costPrice">
                Cost price <Optional />
              </label>
              <InputAffix prefix="₦" help="What one item costs you. Used for profit and stock value." invalid={!!errs.costPrice}>
                <input id="costPrice" name="costPrice" className="input" {...bad("costPrice")} inputMode="decimal" defaultValue={fromMinor(product?.costPrice)} placeholder="4,000" />
              </InputAffix>
              {err("costPrice")}
            </div>
          </div>
        </Card>

        <Card title="Sizes & colours" description="Shoppers pick from these on the product page. Leave empty if they don't apply.">
          <fieldset>
            <legend className="label">Sizes</legend>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((sz) => (
                <label key={sz} className="cursor-pointer">
                  <input type="checkbox" name="sizes" value={sz} defaultChecked={decodeList(product?.sizes).includes(sz)} className="peer sr-only" />
                  <span className="grid h-10 min-w-12 place-items-center rounded-[8px] border border-[#BDBDBD] px-3 text-sm text-[#525252] transition hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">
                    {sz}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-5 border-t border-line pt-5">
            <legend className="label float-left mb-3 w-full">Colours</legend>
            <div className="clear-both grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {COLORS.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-[#525252]">
                  <input type="checkbox" name="colors" value={c.key} defaultChecked={decodeList(product?.colors).includes(c.key)} className="checkbox" />
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line" style={{ background: c.hex }} aria-hidden="true" />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card title="Inventory" description="Stock is tracked per product. Every change is logged in Inventory.">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="sku">
                SKU
              </label>
              <InputAffix icon={TagIcon} help="Your own stock code. Each product needs a different one." invalid={!!errs.sku}>
                <input id="sku" name="sku" className="input font-mono uppercase" {...bad("sku")} defaultValue={product?.sku ?? suggestedSku} placeholder="KS-0001" required />
              </InputAffix>
              {err("sku")}
            </div>
            <div>
              <label className="label" htmlFor="barcodes">
                Barcode on the packaging <span className="font-normal text-[#7C7C7C]">(optional)</span>
              </label>
              <input
                id="barcodes"
                name="barcodes"
                className="input font-mono"
                {...bad("barcodes")}
                defaultValue={decodeList(product?.barcodes).join(", ")}
                placeholder="Scan it here"
                autoComplete="off"
                onKeyDown={(e) => {
                  // A scanner presses Enter after the code: add a comma instead of submitting the form.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    if (el.value.trim() && !el.value.trim().endsWith(",")) el.value = `${el.value.trim()}, `;
                  }
                }}
              />
              {errs.barcodes ? err("barcodes") : <FieldHint>Click here and scan. Several? Scan each one.</FieldHint>}
            </div>
            {product ? (
              <div>
                <span className="label">Current stock</span>
                <div className="input flex items-center justify-between gap-2 bg-surface">
                  <span className="font-semibold text-ink">{product.stock} units</span>
                  <Link href={`/admin/inventory?product=${product.id}`} className="text-xs font-semibold text-brand hover:underline">
                    Adjust
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="stock">
                  Opening stock
                </label>
                <InputAffix icon={CubeIcon} help="How many you have now. Later changes go through Inventory so they're logged.">
                  <input id="stock" name="stock" type="number" min={0} className="input" defaultValue={0} />
                </InputAffix>
              </div>
            )}
            <div>
              <label className="label" htmlFor="lowStockThreshold">
                Low-stock alert at
              </label>
              <InputAffix help="When stock drops to this number the product is flagged as low stock.">
                <input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} className="input" defaultValue={product?.lowStockThreshold ?? 5} />
              </InputAffix>
            </div>
          </div>
        </Card>
      </div>

      {/* ---------------- Side column ---------------- */}
      <aside className="space-y-6 lg:sticky lg:top-[112px]">
        <Card title="Status">
          <div className="flex flex-col gap-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} className="checkbox mt-0.5" />
              <span>
                <span className="block font-medium text-ink">Active</span>
                <span className="block text-[#7C7C7C]">Shown in the online shop. The till sells every product that has a price.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} className="checkbox mt-0.5" />
              <span>
                <span className="block font-medium text-ink">Featured</span>
                <span className="block text-[#7C7C7C]">Shown in “Featured Products” on the home page</span>
              </span>
            </label>
          </div>

          {state.error && (
            <p className="mt-4 rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
              {state.error}
            </p>
          )}
          {Object.keys(errs).length > 0 && !state.error && (
            <p className="mt-4 rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
              Please fix the highlighted fields.
            </p>
          )}
          {state.success && (
            <p className="mt-4 rounded-[8px] border border-[#10A957]/30 bg-[#EFFEF5] px-3 py-2 text-sm font-medium text-[#10A957]" role="status">
              {state.success}
            </p>
          )}

          <div className="mt-5 flex gap-2 border-t border-line pt-5">
            <button type="submit" disabled={pending} className="btn btn-primary flex-1">
              {pending ? "Saving…" : product ? "Save changes" : "Create product"}
            </button>
            <Link href="/admin/products" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </Card>

        <Card title="Organise" description="Where the product shows up in the shop.">
          <div className="grid gap-5">
            <CategoryPicker categories={categories.map((c) => ({ id: c.id, name: c.name }))} defaultValue={String(product?.categoryId ?? "")} />
            <div>
              <label className="label" htmlFor="audience">
                Who is it for?
              </label>
              <Select
                id="audience"
                name="audience"
                defaultValue={product?.audience ?? "unisex"}
                options={[
                  { value: "unisex", label: "Everyone (Girls and Boys tabs)" },
                  { value: "girls", label: "Girls" },
                  { value: "boys", label: "Boys" },
                ]}
              />
            </div>
            <div>
              <label className="label" htmlFor="ageRange">
                Age range <Optional />
              </label>
              <InputAffix help="Shown under the product name, e.g. 0-6m, 2-4 yrs.">
                <input id="ageRange" name="ageRange" className="input" defaultValue={product?.ageRange ?? ""} placeholder="2-4 yrs" />
              </InputAffix>
            </div>
            <div>
              <label className="label" htmlFor="brand">
                Brand <Optional />
              </label>
              <input id="brand" name="brand" className="input" defaultValue={product?.brand ?? ""} placeholder="Kid's Spot" list="brand-suggestions" />
              <datalist id="brand-suggestions">
                <option value="Kid's Spot" />
                <option value="Kid's Spot Knits" />
              </datalist>
            </div>
          </div>
        </Card>

        <Card title="Web address">
          <label className="label" htmlFor="slug">
            URL slug
          </label>
          <InputAffix help="Filled in from the name. Change it only if you need a different link." invalid={!!errs.slug}>
            <input
              id="slug"
              name="slug"
              className="input font-mono text-xs"
              {...bad("slug")}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="rainbow-stacking-rings"
            />
          </InputAffix>
          {err("slug")}
          <FieldHint>
            <span className="break-all">/products/{slug || "…"}</span>
          </FieldHint>
        </Card>
      </aside>
    </form>
  );
}
