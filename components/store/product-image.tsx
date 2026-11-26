import { PhotoIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/format";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** @deprecated No longer shown: products without a photo get a plain placeholder. */
  emoji?: string | null;
  /** @deprecated No longer shown. */
  color?: string | null;
  className?: string;
  /** @deprecated No longer used. */
  emojiClassName?: string;
};

/** Shows the product photo, or a plain grey placeholder with a photo icon when there is no photo yet. */
export function ProductImage({ src, alt, className }: Props) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn("h-full w-full", !/object-(contain|cover|fill|none|scale-down)/.test(className ?? "") && "object-cover", className)} loading="lazy" />;
  }
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-surface", className)} aria-label={alt} role="img">
      <PhotoIcon className="h-1/3 max-h-16 w-1/3 max-w-16 text-[#BDBDBD]" aria-hidden="true" />
    </div>
  );
}
