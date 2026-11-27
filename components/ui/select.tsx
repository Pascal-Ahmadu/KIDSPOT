"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/format";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  options: readonly SelectOption[];
  /** Controlled value. Leave out (and use `defaultValue`) inside a plain form. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Shown when the value matches no option. */
  placeholder?: string;
  /** Submits the value with the surrounding form. */
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  /** "field": a bordered box like the inputs. "text": plain text with a chevron. */
  variant?: "field" | "text";
  /** Classes for the button that opens the list. */
  className?: string;
  /** Classes for the wrapper (width, margins). */
  wrapperClassName?: string;
  /** Which edge of the button the list lines up with. */
  align?: "left" | "right";
};

/**
 * The shop's dropdown, used everywhere in place of the browser's own <select> so the list
 * looks the same on every device. Keyboard: arrows, Home/End, Enter/Space, Escape, and typing
 * the first letters of an option. Inside a form it submits under `name` and honours `required`.
 */
export function Select({
  options,
  value: controlled,
  defaultValue = "",
  onChange,
  placeholder = "Select…",
  name,
  id,
  required,
  disabled,
  "aria-label": ariaLabel,
  variant = "field",
  className,
  wrapperClassName,
  align = "left",
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const autoId = useId();
  const buttonId = id ?? `${autoId}-button`;
  const listId = `${autoId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Close on a click or focus that lands outside.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("focusin", away);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      document.removeEventListener("focusin", away);
    };
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // form.reset() puts an uncontrolled select back to its starting value.
  useEffect(() => {
    const form = formInputRef.current?.form;
    if (!form || controlled !== undefined) return;
    const reset = () => setInner(defaultValue);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, defaultValue]);

  const enabled = (i: number) =>
    i >= 0 && i < options.length && !options[i].disabled;

  /** The next enabled option from `from`, moving by `step`; stays put at either end. */
  function move(from: number, step: 1 | -1) {
    for (let i = from + step; i >= 0 && i < options.length; i += step)
      if (enabled(i)) return i;
    return enabled(from) ? from : -1;
  }
  const first = () => move(-1, 1);
  const last = () => move(options.length, -1);

  function show() {
    if (disabled) return;
    setActive(enabled(selectedIndex) ? selectedIndex : first());
    setOpen(true);
  }

  function choose(i: number) {
    if (!enabled(i)) return;
    const next = options[i].value;
    if (controlled === undefined) setInner(next);
    if (next !== value) onChange?.(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function typeAhead(char: string) {
    const now = Date.now();
    const text =
      (now - typed.current.at > 700 ? "" : typed.current.text) +
      char.toLowerCase();
    typed.current = { text, at: now };
    const start = open ? active : selectedIndex;
    // A repeated single letter steps through the options that start with it.
    const from = text.length === 1 ? start + 1 : Math.max(start, 0);
    for (let n = 0; n < options.length; n++) {
      const i = (from + n) % options.length;
      if (enabled(i) && options[i].label.toLowerCase().startsWith(text)) {
        if (open) setActive(i);
        else choose(i);
        return;
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    const key = e.key;
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      if (!open) show();
      else setActive((a) => move(a, key === "ArrowDown" ? 1 : -1));
    } else if (key === "Home" || key === "End") {
      if (!open) return;
      e.preventDefault();
      setActive(key === "Home" ? first() : last());
    } else if (key === "Enter" || key === " ") {
      // Space while typing a name is part of the name, not a choice.
      if (
        key === " " &&
        typed.current.text &&
        Date.now() - typed.current.at < 700
      ) {
        e.preventDefault();
        typeAhead(" ");
        return;
      }
      e.preventDefault();
      if (open) choose(active);
      else show();
    } else if (key === "Escape") {
      if (!open) return;
      e.preventDefault();
      setOpen(false);
    } else if (key === "Tab") {
      setOpen(false);
    } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeAhead(key);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        variant === "text" ? "inline-block" : "w-full min-w-0",
        wrapperClassName,
      )}
    >
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-label={ariaLabel}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
          // A long option label is cut short ("…") instead of stretching the field and its form.
          variant === "field"
            ? "input w-full min-w-0"
            : "bg-transparent text-sm leading-[21px] text-ink outline-none focus-visible:underline",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            !selected && variant === "field" && "text-muted",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 stroke-2 transition-transform",
            variant === "text" ? "text-muted" : "text-ink",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {name !== undefined && (
        // Carries the value in the form. Being a real (invisible) input, the browser's own
        // "please fill in this field" message still appears under the dropdown when required.
        <input
          ref={formInputRef}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          onFocus={() => buttonRef.current?.focus()}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full opacity-0"
        />
      )}

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={ariaLabel ? undefined : buttonId}
          aria-label={ariaLabel}
          className={cn(
            "absolute top-full z-50 mt-1 max-h-[280px] min-w-full origin-top animate-pop-in overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[6px] border border-line bg-white py-1 shadow-soft",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((o, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => enabled(i) && setActive(i)}
                // Keep focus on the button so the list doesn't close before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap px-4 py-2 text-sm leading-[21px] text-ink",
                  i === active && "bg-brand-light",
                  isSelected && "font-bold text-brand",
                  o.disabled && "cursor-default text-muted opacity-60",
                )}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {isSelected && (
                  <CheckIcon
                    className="h-4 w-4 shrink-0 stroke-2"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
