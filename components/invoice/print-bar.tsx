"use client";

import { ArrowDownTrayIcon, PrinterIcon } from "@heroicons/react/24/outline";

/** Print / save-as-PDF buttons above an invoice (hidden when printing). */
export function PrintBar({ shareText, shareUrl }: { shareText?: string; shareUrl?: string }) {
  return (
    <div className="no-print mx-auto mb-4 flex w-full max-w-[800px] flex-wrap justify-end gap-2 px-4 print:hidden sm:px-0">
      {shareUrl && (
        <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText ?? ""} ${shareUrl}`.trim())}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
          Share on WhatsApp
        </a>
      )}
      <button type="button" onClick={() => window.print()} className="btn btn-ghost gap-2">
        <ArrowDownTrayIcon className="h-5 w-5" /> Save as PDF
      </button>
      <button type="button" onClick={() => window.print()} className="btn btn-primary gap-2">
        <PrinterIcon className="h-5 w-5" /> Print
      </button>
    </div>
  );
}
