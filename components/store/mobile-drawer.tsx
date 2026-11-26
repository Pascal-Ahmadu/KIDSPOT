"use client";

import { ChevronRightIcon, EnvelopeIcon, PhoneIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useStoreSettings } from "@/components/store/store-settings";
import { telHref } from "@/lib/store-info";
import { Logo } from "./logo";

export type DrawerLink = { label: string; href?: string; onClick?: () => void; badge?: string };

/**
 * Mobile-Menu from the Figma: dimmed page, 380px white panel from the left with the logo and a close
 * button, menu rows with right chevrons, a divider, then the Contact block.
 */
export function MobileDrawer({ open, onClose, links }: { open: boolean; onClose: () => void; links: DrawerLink[] }) {
  const { contact } = useStoreSettings();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("a, button");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-[70] lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        className={`absolute inset-y-0 left-0 flex w-[min(380px,88vw)] flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[77px] shrink-0 items-center justify-between border-b border-line px-[43px] max-sm:px-6">
          {/* Logo is already a link home; close the drawer when it's tapped. */}
          <div onClick={onClose}>
            <Logo />
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-surface">
            <XMarkIcon className="h-5 w-5 stroke-2" />
          </button>
        </div>

        <nav aria-label="Mobile" className="px-[43px] py-[22px] max-sm:px-6">
          <ul className="flex flex-col">
            {links.map((l) => {
              const inner = (
                <>
                  <span>
                    {l.label}
                    {l.badge && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">{l.badge}</span>}
                  </span>
                  <ChevronRightIcon className="h-5 w-5 stroke-2 text-ink" aria-hidden="true" />
                </>
              );
              const cls = "flex w-full items-center justify-between py-3 text-left text-base leading-6 text-ink transition hover:text-brand";
              return (
                <li key={l.label}>
                  {l.href ? (
                    <Link href={l.href} onClick={onClose} className={cls}>{inner}</Link>
                  ) : (
                    <button type="button" onClick={() => { onClose(); l.onClick?.(); }} className={cls}>{inner}</button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mx-px border-t border-line" />

        <section aria-labelledby="drawer-contact" className="flex flex-col gap-8 px-[43px] pb-10 pt-[54px] max-sm:px-6">
          <h2 id="drawer-contact" className="footer-heading">Contact</h2>
          <div className="flex flex-col gap-[7px] text-lg leading-[30px] text-ink">
            <p>{contact.hours}</p>
            {contact.phones.map((p) => (
              <a key={p} href={telHref(p)} className="inline-flex items-center gap-1 hover:text-brand">
                <PhoneIcon className="h-6 w-6 text-muted" aria-hidden="true" /> {p}
              </a>
            ))}
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-brand">
              <EnvelopeIcon className="h-6 w-6 text-muted" aria-hidden="true" /> {contact.email}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
