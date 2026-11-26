import Image from "next/image";
import Link from "next/link";
import { STORE_NAME, cn } from "@/lib/format";

/**
 * Kid's Spot logo: the teddy-bear badge cropped from the brand artwork plus a
 * code-drawn wordmark in the logo's colours ("Kid's" blue, "Spot" pink, yellow star).
 *
 * The original artwork (public/brand/kids-spot-logo.png) sits on a black glow, so it
 * can't go on a white header as-is. When a transparent PNG/SVG of the full logo is
 * available, drop it in public/brand and render it here instead.
 */
export function Logo({ className, size = "md", href = "/" }: { className?: string; size?: "sm" | "md" | "lg"; href?: string | null }) {
  const s = { sm: { badge: 32, text: "text-[20px]" }, md: { badge: 44, text: "text-[26px]" }, lg: { badge: 64, text: "text-[38px]" } }[size];

  const content = (
    <>
      <Image src="/brand/bear-badge.png" alt="" width={s.badge} height={s.badge} priority className="shrink-0 rounded-full shadow-sm" />
      <Wordmark className={s.text} />
    </>
  );

  const classes = cn("inline-flex items-center gap-2", className);
  if (!href) return <span className={classes} aria-label={STORE_NAME}>{content}</span>;
  return (
    <Link href={href} className={classes} aria-label={`${STORE_NAME} home`}>
      {content}
    </Link>
  );
}

/** "Kid's Spot" lettering styled after the logo: chunky rounded type with a white outline. */
export function Wordmark({ className }: { className?: string }) {
  const outline = { WebkitTextStroke: "0.14em white", paintOrder: "stroke fill" } as React.CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={cn("relative whitespace-nowrap font-logo font-bold leading-none tracking-[-0.01em] [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.18))]", className)}
    >
      <span className="text-logo-blue" style={outline}>Kid&rsquo;s</span>{" "}
      <span className="relative text-logo-pink" style={outline}>
        Sp
        <span className="relative">
          o
          <svg viewBox="0 0 24 24" className="absolute left-1/2 top-[56%] h-[0.3em] w-[0.3em] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <path fill="white" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" />
          </svg>
        </span>
        t
      </span>
      <svg viewBox="0 0 24 24" className="absolute -left-[0.18em] -top-[0.3em] h-[0.42em] w-[0.42em]" aria-hidden="true">
        <path fill="var(--logo-star)" stroke="white" strokeWidth="2" strokeLinejoin="round" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" />
      </svg>
    </span>
  );
}
