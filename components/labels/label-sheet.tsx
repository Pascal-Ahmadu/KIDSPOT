"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

type Label = { key: string; sku: string; name: string; brand: string | null; price: string | null };

/** The SKU as a Code 128 barcode (what the till's scanner reads), drawn as crisp SVG for the printer. */
function Barcode({ value, height }: { value: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const svg = ref.current;
    JsBarcode(svg, value, { format: "CODE128", height, width: 2, margin: 0, fontSize: 14, textMargin: 1, font: "monospace", displayValue: true });
    // Scale to the sticker: the CSS sets the size, the SVG stretches to fill it.
    const w = svg.getAttribute("width")?.replace("px", "");
    const h = svg.getAttribute("height")?.replace("px", "");
    if (w && h) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "none");
  }, [value, height]);
  return <svg ref={ref} className="label-code" aria-label={value} />;
}

export function PrintBar({ count, auto }: { count: number; auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(t);
  }, [auto]);
  return (
    <div className="mx-auto mb-4 flex max-w-[420px] items-center gap-3 print:hidden">
      <button type="button" onClick={() => window.print()} className="btn btn-primary flex-1">
        Print {count} sticker{count === 1 ? "" : "s"}
      </button>
      <button type="button" onClick={() => window.close()} className="btn btn-ghost">
        Close
      </button>
    </div>
  );
}

/** One sticker per entry; the page CSS (set by the print page) decides the size and layout. */
export function LabelSheet({ labels, barHeight }: { labels: Label[]; barHeight: number }) {
  return (
    <div className="labels">
      {labels.map((l) => (
        <div key={l.key} className="label">
          <div className="label-top">
            {l.brand && <div className="label-brand">{l.brand}</div>}
            <div className="label-name">{l.name}</div>
          </div>
          <Barcode value={l.sku} height={barHeight} />
          {l.price && <div className="label-price">{l.price}</div>}
        </div>
      ))}
    </div>
  );
}
