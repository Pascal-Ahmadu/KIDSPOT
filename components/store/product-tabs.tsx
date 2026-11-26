"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/format";

/** "Description / Details & Care / Reviews" tabs with the full-width rule and purple underline from the Figma. */
export function ProductTabs({ tabs }: { tabs: { key: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  return (
    <div>
      <div role="tablist" aria-label="Product information" className="flex gap-8 overflow-x-auto overflow-y-hidden shadow-[inset_0_-2px_0_var(--n200)] [scrollbar-width:none] sm:gap-[50px] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            id={`${id}-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${id}-panel-${t.key}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!dir) return;
              const next = (active + dir + tabs.length) % tabs.length;
              setActive(next);
              document.getElementById(`${id}-tab-${tabs[next].key}`)?.focus();
            }}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 pb-3 text-lg leading-8 transition sm:text-xl",
              i === active ? "border-brand text-brand" : "border-transparent text-ink hover:text-brand",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.key} id={`${id}-panel-${t.key}`} role="tabpanel" aria-labelledby={`${id}-tab-${t.key}`} hidden={i !== active} className="pt-8 lg:pt-11">
          {t.content}
        </div>
      ))}
    </div>
  );
}
