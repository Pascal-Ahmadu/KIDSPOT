import Image from "next/image";
import Link from "next/link";
import { STORE_NAME, cn } from "@/lib/format";

/** The glossy KIDSPOT logo (public/brand/kidspot-logo.png, transparent, 680 x 240). */
export const LOGO = { src: "/brand/kidspot-logo.png", width: 680, height: 240 } as const;
/** Square star mark cut from the logo, for tight spots (collapsed sidebar, browser tab). */
export const LOGO_MARK = "/brand/kidspot-mark.png";

const HEIGHTS = { sm: 36, md: 56, lg: 72 } as const;

export function Logo({ className, size = "md", href = "/" }: { className?: string; size?: "sm" | "md" | "lg"; href?: string | null }) {
  const h = HEIGHTS[size];
  const img = (
    <Image
      src={LOGO.src}
      alt={STORE_NAME}
      width={Math.round((h * LOGO.width) / LOGO.height)}
      height={h}
      priority
      className="h-auto w-auto shrink-0"
      style={{ height: h, width: "auto" }}
    />
  );
  const classes = cn("inline-flex items-center", className);
  if (!href) return <span className={classes}>{img}</span>;
  return (
    <Link href={href} className={classes} aria-label={`${STORE_NAME} home`}>
      {img}
    </Link>
  );
}
