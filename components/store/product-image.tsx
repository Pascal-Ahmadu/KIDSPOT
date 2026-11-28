import { PhotoIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/format";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** How wide the photo shows, for the browser to pick a size (e.g. "96px", "(max-width: 640px) 50vw, 25vw"). */
  sizes?: string;
  /** Load at once instead of when scrolled near (for the main photo at the top of a page). */
  priority?: boolean;
  /** @deprecated No longer shown: products without a photo get a plain placeholder. */
  emoji?: string | null;
  /** @deprecated No longer shown. */
  color?: string | null;
  className?: string;
  /** @deprecated No longer used. */
  emojiClassName?: string;
};

// Widths the image optimiser may produce (all in Next's default device/image sizes).
const WIDTHS = [64, 128, 256, 384, 640, 828, 1080, 1200];

/** The photo resized by Next's image optimiser (WebP, cached), instead of the full-size upload. */
const optimised = (src: string, width: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;

/** Shows the product photo, or a plain grey placeholder with a photo icon when there is no photo yet. */
export function ProductImage({ src, alt, className, sizes = "(max-width: 640px) 50vw, 25vw", priority = false }: Props) {
  if (src) {
    // Photos being picked for upload (blob:/data:) are shown as they are.
    const local = src.startsWith("blob:") || src.startsWith("data:");
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={local ? src : optimised(src, 640)}
        srcSet={local ? undefined : WIDTHS.map((w) => `${optimised(src, w)} ${w}w`).join(", ")}
        sizes={local ? undefined : sizes}
        alt={alt}
        className={cn("h-full w-full", !/object-(contain|cover|fill|none|scale-down)/.test(className ?? "") && "object-cover", className)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-surface", className)} aria-label={alt} role="img">
      <PhotoIcon className="h-1/3 max-h-16 w-1/3 max-w-16 text-[#BDBDBD]" aria-hidden="true" />
    </div>
  );
}
