"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PER_PAGE_OPTIONS } from "@/lib/attributes";
import { cn } from "@/lib/format";
import { Select } from "@/components/ui/select";

const SORTS = [
  { value: "", label: "Latest products" },
  { value: "popular", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];

/** "Fillter bar" right side from the Figma: sort, items per page, grid/list toggle. */
export function ListingToolbar({ perPage, view }: { perPage: number; view: "grid" | "list" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const current = params.get("sort") === "newest" ? "" : (params.get("sort") ?? "");

  return (
    <div className="flex flex-wrap items-center gap-x-[31px] gap-y-3">
      <TextSelect label="Sort products" value={current} onChange={(v) => set("sort", v || null)} options={SORTS} />
      <TextSelect
        label="Items per page"
        value={String(perPage)}
        onChange={(v) => set("per", v === "12" ? null : v)}
        options={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: `${n} items` }))}
      />
      <div className="flex items-center gap-2" role="group" aria-label="View">
        <ViewButton active={view === "grid"} label="Grid view" onClick={() => set("view", null)}>
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path fill="currentColor" d="M0 0h5v5H0zM7 0h5v5H7zM0 7h5v5H0zM7 7h5v5H7z" />
          </svg>
        </ViewButton>
        <ViewButton active={view === "list"} label="List view" onClick={() => set("view", "list")}>
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="1.33" d="M1 1.5h10M1 6h10M1 10.5h10" />
          </svg>
        </ViewButton>
      </div>
    </div>
  );
}

/** The shop's dropdown shown as plain text + chevron. */
function TextSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Select variant="text" aria-label={label} value={value} onChange={onChange} options={options} className="gap-[5px]" />
  );
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-[4px] border-[0.67px] transition",
        active ? "border-ink text-ink" : "border-[#BEC0C1] text-[#BEC0C1] hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
