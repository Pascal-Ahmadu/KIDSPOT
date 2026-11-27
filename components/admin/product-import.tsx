"use client";

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  TableHeaderLink,
  tdClass as td,
  thClass as th,
  trClass,
} from "@/components/admin/data-table";
import { TAG, Tag } from "@/components/admin/ui";
import {
  importProductsAction,
  previewImportAction,
  type ImportPreview,
  type ImportResult,
} from "@/lib/actions/product-import";
import { cn, money } from "@/lib/format";

const ROWS_SHOWN = 200;

/** Upload a CSV, see every row checked, then import. */
export function ProductImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [hideMissing, setHideMissing] = useState(false);
  const [view, setView] = useState<"all" | "error">("all");
  const [checking, startCheck] = useTransition();
  const [importing, startImport] = useTransition();

  function choose(f: File | null | undefined) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(null);
    const fd = new FormData();
    fd.set("file", f);
    startCheck(async () => setPreview(await previewImportAction(fd)));
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function runImport() {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    if (hideMissing) fd.set("hideMissing", "on");
    startImport(async () => setResult(await importProductsAction(fd)));
  }

  const rows = (preview?.rows ?? []).filter(
    (r) => view === "all" || r.action === "error",
  );
  const ready = preview ? preview.counts.create + preview.counts.update : 0;

  if (result?.ok) {
    return (
      <section className="rounded-[8px] border border-line bg-card px-6 py-10 text-center">
        <CheckCircleIcon
          className="mx-auto h-12 w-12 text-[#10A957]"
          aria-hidden="true"
        />
        <h2 className="mt-3 text-xl font-semibold text-ink">Import finished</h2>
        <p className="mt-2 text-sm text-[#525252]">
          {result.created} new product{result.created === 1 ? "" : "s"} ·{" "}
          {result.updated} updated
          {result.hidden ? ` · ${result.hidden} hidden` : ""}
          {result.skipped ? ` · ${result.skipped} skipped with errors` : ""}
        </p>
        {result.units > 0 && (
          <p className="mt-1 text-sm text-[#7C7C7C]">
            {result.units} items added as opening stock.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-ghost">
            Import another file
          </button>
          <Link href="/admin/products" className="btn btn-primary">
            View products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      {/* How it works */}
      <section className="rounded-[8px] border border-line bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[640px] text-sm leading-6 text-[#525252]">
            <p>
              One row per product. Columns:{" "}
              <b className="font-semibold text-ink">
                sku, name, brand, category, price, stock, colors, sizes,
                audience, description, active
              </b>
              . Only <b className="font-semibold text-ink">name</b> and{" "}
              <b className="font-semibold text-ink">price</b> are required.
              Prices are in naira. Separate several colours or sizes with |.
            </p>
            <p className="mt-2">
              Rows are matched by SKU: a new SKU adds a product with its opening
              stock; an existing SKU updates the details. Stock of existing
              products isn&apos;t changed here; use Deliveries or a Stock count.
              Rows without a price are imported hidden from the shop.
            </p>
            <p className="mt-2">
              In Excel or Google Sheets: File → Save As / Download → CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TableHeaderLink href="/admin/products/import/template" download className="h-11 px-4">
              <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />{" "}
              Template
            </TableHeaderLink>
            <TableHeaderLink href="/admin/products/export" download className="h-11 px-4">
              <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />{" "}
              Export products
            </TableHeaderLink>
          </div>
        </div>
      </section>

      {/* File */}
      {!file ? (
        <label
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            choose(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed px-6 py-14 text-center transition",
            drag
              ? "border-brand bg-brand-light"
              : "border-[#BDBDBD] bg-card hover:border-brand",
          )}
        >
          <ArrowUpTrayIcon className="h-8 w-8 text-brand" aria-hidden="true" />
          <span className="text-base font-medium text-ink">
            Drop your CSV file here, or click to choose
          </span>
          <span className="text-sm text-[#7C7C7C]">.csv, up to 2 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-card px-5 py-4">
          <span className="flex min-w-0 items-center gap-3">
            <DocumentTextIcon
              className="h-6 w-6 shrink-0 text-brand"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">
                {file.name}
              </span>
              <span className="block text-xs text-[#7C7C7C]">
                {checking ? "Checking…" : `${(file.size / 1024).toFixed(0)} KB`}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={reset}
            aria-label="Remove file"
            className="grid h-8 w-8 place-items-center rounded-[6px] text-[#7C7C7C] hover:bg-surface hover:text-ink"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {preview?.error && (
        <p className="field-error" role="alert">
          {preview.error}
        </p>
      )}
      {preview?.fileErrors.map((e) => (
        <p key={e} className="field-error" role="alert">
          {e}
        </p>
      ))}

      {/* Preview */}
      {preview && preview.rows.length > 0 && (
        <section className="rounded-[16px] border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Tag color={TAG.green}>{preview.counts.create} new</Tag>
              <Tag color={TAG.orange}>{preview.counts.update} update</Tag>
              {preview.counts.error > 0 && (
                <Tag color={TAG.coral}>{preview.counts.error} with errors</Tag>
              )}
              {preview.counts.hiddenNoPrice > 0 && (
                <Tag color={TAG.gold}>
                  {preview.counts.hiddenNoPrice} hidden, no price
                </Tag>
              )}
            </div>
            {preview.counts.error > 0 && (
              <div className="flex gap-1 text-sm">
                {(["all", "error"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-[6px] px-3 py-1.5",
                      view === v
                        ? "bg-brand-light font-medium text-brand"
                        : "text-[#525252] hover:bg-surface",
                    )}
                  >
                    {v === "all" ? "All rows" : "Errors only"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {preview.newCategories.length > 0 && (
            <p className="border-b border-line px-6 py-3 text-sm text-[#525252]">
              New categories will be added:{" "}
              <b className="font-semibold text-ink">
                {preview.newCategories.join(", ")}
              </b>
            </p>
          )}
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th className={th}>Row</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Name</th>
                  <th className={th}>Category</th>
                  <th className={cn(th, "text-right")}>Price</th>
                  <th className={cn(th, "text-right")}>Stock</th>
                  <th className={th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, ROWS_SHOWN).map((r) => (
                  <tr key={r.line} className={trClass}>
                    <td className={cn(td, "text-[#7C7C7C]")}>{r.line}</td>
                    <td className={cn(td, "font-mono text-xs text-[#525252]")}>
                      {r.sku}
                    </td>
                    <td className={cn(td, "max-w-[320px] text-[#525252]")}>
                      {r.name || "—"}
                    </td>
                    <td className={cn(td, "text-[#525252]")}>
                      {r.category ?? "—"}
                    </td>
                    <td
                      className={cn(
                        td,
                        "whitespace-nowrap text-right text-ink",
                      )}
                    >
                      {r.price ? money(r.price) : "—"}
                    </td>
                    <td className={cn(td, "text-right text-ink")}>{r.stock}</td>
                    <td className={td}>
                      {r.action === "error" ? (
                        <Tag color={TAG.coral}>Error</Tag>
                      ) : r.action === "create" ? (
                        <Tag color={TAG.green}>New</Tag>
                      ) : (
                        <Tag color={TAG.orange}>Update</Tag>
                      )}
                      {!r.isActive && r.action !== "error" && (
                        <span className="ml-1">
                          <Tag color={TAG.grey}>Hidden</Tag>
                        </span>
                      )}
                      {[...r.errors, ...r.notes].map((m) => (
                        <span
                          key={m}
                          className={cn(
                            "mt-1 block max-w-[320px] text-xs",
                            r.errors.includes(m)
                              ? "text-accent"
                              : "text-[#7C7C7C]",
                          )}
                        >
                          {m}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > ROWS_SHOWN && (
              <p className="px-6 py-3 text-sm text-[#7C7C7C]">
                Showing the first {ROWS_SHOWN} of {rows.length} rows.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={hideMissing}
                onChange={(e) => setHideMissing(e.target.checked)}
                className="checkbox mt-0.5"
              />
              <span>
                <span className="block font-medium text-ink">
                  Hide products that aren&apos;t in this file
                </span>
                <span className="block text-[#7C7C7C]">
                  They stay in the system with their history, just not in the
                  shop or the till.
                </span>
              </span>
            </label>
            <div className="flex items-center gap-3">
              {result && !result.ok && (
                <p className="field-error" role="alert">
                  {result.error}
                </p>
              )}
              <button
                type="button"
                onClick={runImport}
                disabled={importing || ready === 0}
                className="btn btn-primary"
              >
                {importing
                  ? "Importing…"
                  : `Import ${ready} product${ready === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
