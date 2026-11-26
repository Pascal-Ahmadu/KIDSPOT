"use client";

import { useTransition } from "react";
import { checkTransferAction } from "@/lib/actions/transfers";

export function TransferButtons({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const act = (received: boolean) =>
    start(async () => {
      if (!received && !confirm("Mark this transfer as NOT received? It will be flagged for the owner.")) return;
      const res = await checkTransferAction(id, received);
      if (res.error) alert(res.error);
    });
  return (
    <div className="flex justify-end gap-2">
      <button type="button" disabled={pending} onClick={() => act(true)} className="inline-flex h-8 items-center rounded-[4px] bg-[#EFFEF5] px-3 text-xs font-medium text-[#10A957] transition hover:bg-[#10A957]/15">
        Received
      </button>
      <button type="button" disabled={pending} onClick={() => act(false)} className="inline-flex h-8 items-center rounded-[4px] px-3 text-xs font-medium text-accent transition hover:bg-accent/10">
        Not received
      </button>
    </div>
  );
}
