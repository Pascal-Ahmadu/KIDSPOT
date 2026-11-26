"use client";

import { PrinterIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

const PX_TO_MM = 25.4 / 96;

/**
 * Sizes the printed page to the receipt: 80mm wide (the roll) and exactly as long as the receipt,
 * so a thermal printer feeds and cuts right after the last line instead of after a blank A4 page.
 * Browsers ignore `size: 80mm auto`, so the length is measured and set just before printing.
 */
function fitPageToReceipt() {
  const el = document.getElementById("receipt");
  if (!el) return;
  const heightMm = Math.ceil(el.getBoundingClientRect().height * PX_TO_MM) + 8; // a little paper after the last line
  let style = document.getElementById(
    "receipt-page-size",
  ) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "receipt-page-size";
    document.head.appendChild(style);
  }
  style.textContent = `@media print { @page { size: 80mm ${heightMm}mm; margin: 0; } html, body { background: #fff !important; margin: 0 !important; min-height: 0 !important; } }`;
}

/** Opens the print window as soon as the receipt is shown (with ?print=1), plus a manual button. */
export function AutoPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    fitPageToReceipt();
    // Ctrl+P (or the browser menu) also gets the right size.
    window.addEventListener("beforeprint", fitPageToReceipt);
    const t = auto ? window.setTimeout(() => window.print(), 300) : undefined;
    return () => {
      window.removeEventListener("beforeprint", fitPageToReceipt);
      window.clearTimeout(t);
    };
  }, [auto]);
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[302px] gap-2 print:hidden">
      <button
        type="button"
        onClick={() => (fitPageToReceipt(), window.print())}
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
