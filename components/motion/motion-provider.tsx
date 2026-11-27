"use client";

import { useLayoutEffect } from "react";

/**
 * Drives [data-reveal] (and shop section headings): each element fades up the first time it scrolls into view.
 * What's already on screen when the page loads is shown at once (no flash); content added later
 * (navigation, "load more") animates as it appears. Mounted once in the root layout.
 */
export function MotionProvider() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const reveal = (el: Element, animate: boolean) => {
      el.classList.add("is-in");
      if (!animate) el.classList.add("no-anim");
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          reveal(e.target, true);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    const track = (el: HTMLElement, firstPaint: boolean) => {
      if (el.dataset.revealTracked) return;
      el.dataset.revealTracked = "1";
      const delay = Number(el.dataset.revealDelay ?? 0);
      if (delay) el.style.setProperty("--reveal-i", String(Math.min(delay, 8)));
      const r = el.getBoundingClientRect();
      const onScreen = r.top < window.innerHeight && r.bottom > 0;
      if (firstPaint && onScreen) reveal(el, false);
      else io.observe(el);
    };
    // Shop section headings reveal without needing the attribute on every page.
    const SELECTOR = "[data-reveal], .section-title, .section-sub";
    const scan = (node: ParentNode, firstPaint: boolean) => {
      if (node instanceof HTMLElement && node.matches(SELECTOR)) track(node, firstPaint);
      node.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => track(el, firstPaint));
    };

    scan(document, true);
    root.classList.add("motion-ready");

    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof HTMLElement && scan(n, false));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
