import { ExclamationCircleIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/format";

/**
 * Admin "Inputs" design pieces. The input itself keeps the `input` class (styled in globals.css);
 * these add the label, help text, error text and the bits inside the field:
 *   prefix text (₦) or a leading 20px icon on the left, and a 16px help "?" (or a red warning
 *   icon when the field has an error) on the right.
 */

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      <ExclamationCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function FieldHint({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="field-hint">
      {children}
    </p>
  );
}

/**
 * Wraps one input/textarea and draws the extras over it. The wrapped field gets extra left/right
 * padding automatically so text never runs under the icons.
 */
export function InputAffix({
  prefix,
  icon: Icon,
  help,
  invalid,
  multiline,
  children,
}: {
  /** Short text before the value, e.g. "₦" or "%". */
  prefix?: string;
  /** Leading 20px icon (use instead of `prefix`). */
  icon?: React.ComponentType<{ className?: string }>;
  /** Tooltip text for the "?" icon on the right. */
  help?: string;
  invalid?: boolean;
  /** True for textareas: icons sit at the top instead of centred. */
  multiline?: boolean;
  children: React.ReactNode;
}) {
  const hasLead = Boolean(prefix || Icon);
  const hasTrail = Boolean(invalid || help);
  const place = multiline ? "top-[11px]" : "top-1/2 -translate-y-1/2";
  return (
    <div className={cn("relative", hasLead && "[&>input]:pl-9 [&>textarea]:pl-9", hasTrail && "[&>input]:pr-9 [&>textarea]:pr-9")}>
      {children}
      {prefix && (
        <span className={cn("pointer-events-none absolute left-3 text-sm leading-5 text-[#292929]", place)} aria-hidden="true">
          {prefix}
        </span>
      )}
      {!prefix && Icon && (
        <span className={cn("pointer-events-none absolute left-3 text-[#525252]", place)} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      )}
      {invalid ? (
        <span className={cn("pointer-events-none absolute right-3 text-accent", place)} aria-hidden="true">
          <ExclamationCircleIcon className="h-4 w-4" />
        </span>
      ) : (
        help && (
          <span className={cn("group absolute right-3", place)}>
            <QuestionMarkCircleIcon className="h-4 w-4 cursor-help text-[#7C7C7C]" aria-label={help} role="img" tabIndex={0} />
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-56 rounded-[8px] bg-ink px-3 py-2 text-xs leading-[18px] text-white shadow-lg group-focus-within:block group-hover:block"
            >
              {help}
            </span>
          </span>
        )
      )}
    </div>
  );
}
