import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

/**
 * Admin dialog opened by a URL param (e.g. ?new=1) so it works without client state:
 * dimmed backdrop and an X that both link back to `closeHref`; 16px-radius card in the table style.
 */
export function Modal({ title, description, closeHref, children, width = 480 }: { title: string; description?: string; closeHref: string; children: React.ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <Link href={closeHref} scroll={false} className="fixed inset-0 animate-backdrop-in bg-ink/40" aria-label="Close" />
      <div
        className="relative my-auto w-full animate-scale-in rounded-[16px] border border-line bg-card shadow-[0_12px_16px_-4px_rgba(36,36,36,0.08),0_4px_6px_-2px_rgba(36,36,36,0.03)]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-xl font-medium leading-[30px] text-ink">
              {title}
            </h2>
            {description && <p className="text-sm text-[#7C7C7C]">{description}</p>}
          </div>
          <Link href={closeHref} scroll={false} className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-[#7C7C7C] transition hover:bg-surface hover:text-ink" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </Link>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Primary header button in the table design (brand fill, 36px). Renders a link so it can open a URL-driven modal. */
export function HeaderButton({ href, icon: Icon, children }: { href: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} className="flex h-9 items-center gap-2 rounded-[4px] bg-brand px-3 text-sm font-bold leading-5 text-white transition hover:bg-brand/90">
      {Icon && <Icon className="h-4 w-4 stroke-2" aria-hidden="true" />}
      {children}
    </Link>
  );
}
