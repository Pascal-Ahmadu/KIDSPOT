import { BanknotesIcon, BuildingLibraryIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import { paymentLabel } from "@/lib/payments";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bank_transfer: BuildingLibraryIcon,
  transfer: BuildingLibraryIcon,
  cash_on_delivery: BanknotesIcon,
  cash: BanknotesIcon,
  card: CreditCardIcon,
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** 32px round avatar with the customer's initials (no photos are stored, so no fake ones). */
export function CustomerAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold leading-[18px] text-white" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Payment method with its icon (the store takes pay-on-delivery and bank transfer only). */
export function PaymentMethod({ method }: { method: string }) {
  const pay = { label: paymentLabel(method) };
  const Icon = ICONS[method] ?? BanknotesIcon;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-ink">
      <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      {pay.label}
    </span>
  );
}
