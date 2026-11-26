"use client";

import { ArrowTopRightOnSquareIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useTransition } from "react";
import { deleteProductAction, toggleProductActiveAction } from "@/lib/actions/products";

export function ProductRowActions({ id, isActive, slug }: { id: number; isActive: boolean; slug: string }) {
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex items-center gap-1 ${pending ? "opacity-50" : ""}`}>
      <Link href={`/products/${slug}`} target="_blank" className="grid h-8 w-8 place-items-center rounded-[6px] text-muted hover:bg-surface hover:text-brand" title="View in store">
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </Link>
      <button
        onClick={() => start(() => toggleProductActiveAction(id, !isActive))}
        className="grid h-8 w-8 place-items-center rounded-[6px] text-muted hover:bg-surface hover:text-brand"
        title={isActive ? "Hide from store" : "Show in store"}
      >
        {isActive ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
      <Link href={`/admin/products/${id}`} className="grid h-8 w-8 place-items-center rounded-[6px] text-muted hover:bg-surface hover:text-brand" title="Edit">
        <PencilSquareIcon className="h-4 w-4" />
      </Link>
      <button
        onClick={() => {
          if (confirm("Delete this product? Its order history is kept, but the product and its stock log are removed.")) start(() => deleteProductAction(id));
        }}
        className="grid h-8 w-8 place-items-center rounded-[6px] text-muted hover:bg-accent/10 hover:text-accent"
        title="Delete"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DeleteProductButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this product? This cannot be undone.")) start(() => deleteProductAction(id));
      }}
      className="btn btn-ghost btn-sm text-accent hover:border-accent/40"
    >
      <TrashIcon className="h-4 w-4" /> Delete
    </button>
  );
}
