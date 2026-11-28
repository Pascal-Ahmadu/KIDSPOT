"use server";

import { refreshShop } from "@/lib/shop-cache";
import { logActivity } from "@/lib/audit";
import { getAdminSession } from "@/lib/auth";
import { applyImport, checkImport, type ImportRow } from "@/lib/product-import";
import { userMessage } from "@/lib/errors";

export type ImportPreview = {
  ok: boolean;
  error?: string;
  fileErrors: string[];
  newCategories: string[];
  counts: { create: number; update: number; error: number; hiddenNoPrice: number };
  rows: Pick<ImportRow, "line" | "sku" | "name" | "category" | "price" | "stock" | "isActive" | "action" | "errors" | "notes">[];
};

export type ImportResult = { ok: true; created: number; updated: number; hidden: number; skipped: number; units: number } | { ok: false; error: string };

const MAX_BYTES = 2 * 1024 * 1024;

async function readFile(fd: FormData): Promise<{ error: string } | { text: string; name: string }> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file first." };
  if (file.size > MAX_BYTES) return { error: "That file is over 2 MB. Split it into smaller files." };
  if (!/\.csv$/i.test(file.name) && !/csv|text\/plain|excel/.test(file.type)) return { error: "Save the spreadsheet as CSV first (in Excel: File → Save As → CSV UTF-8)." };
  return { text: await file.text(), name: file.name };
}

/** Check the file and show what would happen. Nothing is saved. */
export async function previewImportAction(fd: FormData): Promise<ImportPreview> {
  const empty = { ok: false, fileErrors: [], newCategories: [], counts: { create: 0, update: 0, error: 0, hiddenNoPrice: 0 }, rows: [] };
  if (!(await getAdminSession())) return { ...empty, error: "Only a manager or the owner can import products." };
  const file = await readFile(fd);
  if ("error" in file) return { ...empty, error: file.error };
  const check = await checkImport(file.text);
  return {
    ok: check.fileErrors.length === 0,
    fileErrors: check.fileErrors,
    newCategories: check.newCategories,
    counts: check.counts,
    rows: check.rows.map(({ line, sku, name, category, price, stock, isActive, action, errors, notes }) => ({ line, sku, name, category, price, stock, isActive, action, errors, notes })),
  };
}

/** Import the file: the same checks run again on the server before anything is written. */
export async function importProductsAction(fd: FormData): Promise<ImportResult> {
  const me = await getAdminSession();
  if (!me) return { ok: false, error: "Only a manager or the owner can import products." };
  const file = await readFile(fd);
  if ("error" in file) return { ok: false, error: file.error };
  const check = await checkImport(file.text);
  if (check.fileErrors.length) return { ok: false, error: check.fileErrors[0] };
  if (check.counts.create + check.counts.update === 0) return { ok: false, error: "No rows can be imported. Fix the errors shown and try again." };
  try {
    const res = await applyImport(check, { hideMissing: fd.get("hideMissing") === "on" });
    await logActivity(
            me,
            "products_import",
            `${me.name} imported ${file.name}: ${res.created} new, ${res.updated} updated${res.hidden ? `, ${res.hidden} hidden` : ""}${res.skipped ? `, ${res.skipped} skipped` : ""}; ${res.units} items of opening stock`,
            { entity: "product", details: res },
          );
    refreshShop();
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: userMessage(e, "The import failed. Nothing was saved.") };
  }
}
