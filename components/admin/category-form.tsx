"use client";

import { PencilSquareIcon, TagIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useActionState, useRef, useState, useTransition } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/categories";
import type { ActionState } from "@/lib/actions/products";
import type { Category } from "@/lib/db/schema";

type Row = Category & { productCount: number };

export function CategoryManager({ categories }: { categories: Row[] }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await saveCategoryAction(prev, formData);
    if (result.success) {
      formRef.current?.reset();
      setEditing(null);
    }
    return result;
  }, {});
  const [deleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <li key={c.id} className="card flex items-center gap-4 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-light text-brand" aria-hidden="true"><TagIcon className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{c.name}</div>
              <div className="truncate text-xs text-muted">{c.productCount} product{c.productCount === 1 ? "" : "s"} · /{c.slug}</div>
            </div>
            <button onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded-[6px] text-muted hover:bg-surface hover:text-brand" title="Edit"><PencilSquareIcon className="h-4 w-4" /></button>
            <button
              disabled={deleting}
              onClick={() => confirm(`Delete “${c.name}”? Products in it will become uncategorised.`) && startDelete(() => deleteCategoryAction(c.id))}
              className="grid h-8 w-8 place-items-center rounded-[6px] text-muted hover:bg-accent/10 hover:text-accent"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="card p-8 text-center text-sm text-muted sm:col-span-2">No categories yet. Add one on the right.</li>}
      </ul>

      <form ref={formRef} key={editing?.id ?? "new"} action={action} className="card h-fit p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{editing ? "Edit category" : "New category"}</h2>
          {editing && <button type="button" onClick={() => setEditing(null)} className="text-muted hover:text-ink" aria-label="Cancel edit"><XMarkIcon className="h-4 w-4" /></button>}
        </div>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="mt-4 grid gap-3">
          <div>
            <label className="label" htmlFor="cat-name">Name</label>
            <input id="cat-name" name="name" className="input" defaultValue={editing?.name ?? ""} placeholder="Toys & Games" required />
          </div>
          <div>
            <label className="label" htmlFor="cat-desc">Description</label>
            <input id="cat-desc" name="description" className="input" defaultValue={editing?.description ?? ""} placeholder="Short line shown on the category page" />
          </div>
          {state.error && <p className="rounded-[6px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{state.error}</p>}
          {state.success && <p className="rounded-[6px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{state.success}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving…" : editing ? "Save changes" : "Add category"}</button>
        </div>
      </form>
    </div>
  );
}
