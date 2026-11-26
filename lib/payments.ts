/** Payment method labels for online orders and till sales. */
export const PAYMENT_LABELS: Record<string, string> = {
  cash_on_delivery: "Pay on delivery",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  transfer: "Transfer",
  card: "Card",
};

export const paymentLabel = (method: string) => PAYMENT_LABELS[method] ?? method;
