"use client";

import { useTransition } from "react";
import { deleteStaffAction } from "@/lib/actions/staff";

/** Delete with a confirm step; explains when the person has history and can only be switched off. */
export function DeleteStaffButton({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete ${name}? This can't be undone.`)) return;
        start(async () => {
          const res = await deleteStaffAction(id);
          if (res.error) alert(res.error);
        });
      }}
      className="inline-flex h-8 items-center rounded-[4px] px-3 text-xs font-medium text-accent transition hover:bg-accent/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
