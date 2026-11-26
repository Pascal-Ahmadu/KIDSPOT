"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, useTransition } from "react";
import { quickAddCategoryAction } from "@/lib/actions/categories";
import { FieldError } from "@/components/admin/field";
import { Select } from "@/components/ui/select";

/**
 * Category dropdown for the product form, with "+ Add category" underneath: type a name, press
 * Add (or Enter) and the new category is created and selected without leaving the form.
 */
export function CategoryPicker({ categories, defaultValue }: { categories: { id: number; name: string }[]; defaultValue: string }) {
  const [list, setList] = useState(categories);
  const [value, setValue] = useState(defaultValue);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const name = draft.trim();
    if (name.length < 2) {
      setError("Name is too short");
      return;
    }
    setError(null);
    start(async () => {
      const res = await quickAddCategoryAction(name);
      if (res.error || !res.category) {
        setError(res.error ?? "Couldn't add the category.");
        return;
      }
      const cat = res.category;
      setList((l) => (l.some((c) => c.id === cat.id) ? l : [...l, cat].sort((a, b) => a.name.localeCompare(b.name))));
      setValue(String(cat.id));
      setDraft("");
      setAdding(false);
    });
  }

  return (
    <div>
      <label className="label" htmlFor="categoryId">
        Category
      </label>
      <Select
        id="categoryId"
        name="categoryId"
        value={value}
        onChange={setValue}
        options={[{ value: "", label: "No category" }, ...list.map((c) => ({ value: String(c.id), label: c.name }))]}
      />

      {adding ? (
        <div className="mt-3 rounded-[8px] border border-line bg-surface/40 p-3">
          <label className="label" htmlFor="new-category">
            New category
          </label>
          <div className="flex gap-2">
            <input
              id="new-category"
              className="input"
              value={draft}
              autoFocus
              placeholder="e.g. Swimwear"
              aria-invalid={error ? true : undefined}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the category instead of submitting the whole product form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                } else if (e.key === "Escape") {
                  setAdding(false);
                }
              }}
            />
            <button type="button" onClick={add} disabled={pending} className="btn btn-primary shrink-0 px-4">
              {pending ? "Adding…" : "Add"}
            </button>
          </div>
          <FieldError message={error ?? undefined} />
          <button type="button" onClick={() => setAdding(false)} className="mt-2 text-xs font-medium text-[#7C7C7C] hover:text-ink">
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            <PlusIcon className="h-4 w-4 stroke-2" aria-hidden="true" /> Add category
          </button>
          <Link href="/admin/settings/categories" className="text-[#7C7C7C] hover:text-brand">
            Manage categories
          </Link>
        </div>
      )}
    </div>
  );
}
