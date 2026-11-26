"use client";

import { PrinterIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

/** Opens the print window as soon as the receipt is shown (with ?print=1), plus a manual button. */
export function AutoPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, [auto]);
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[302px] gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn btn-primary flex-1 gap-2"
      >
        <PrinterIcon className="h-5 w-5" /> Print receipt
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="btn btn-ghost"
      >
        Close
      </button>
    </div>
  );
}
