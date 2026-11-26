import type { Metadata } from "next";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { PageHeader } from "@/components/admin/ui";
import { absolute } from "@/lib/invoice-link";
import { getPaymentSettings } from "@/lib/payments-config";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

/** Last 4 characters only: the secrets themselves never leave the server. */
const hint = (secret: string) => (secret ? `ends in ${secret.slice(-4)}` : "");

export default async function PaymentSettingsPage() {
  const s = await getPaymentSettings();
  return (
    <div className="max-w-[880px]">
      <PageHeader title="Payments" description="Connect the Moniepoint terminal and Monnify, so card and transfer payments are confirmed by the provider, not by eye." />
      <PaymentSettingsForm
        value={{
          moniepoint: {
            enabled: s.moniepoint.enabled,
            clientId: s.moniepoint.clientId,
            secretHint: hint(s.moniepoint.clientSecret),
            amountUnit: s.moniepoint.amountUnit,
            baseUrl: s.moniepoint.baseUrl,
            terminals: s.moniepoint.terminals,
          },
          monnify: { enabled: s.monnify.enabled, mode: s.monnify.mode, apiKey: s.monnify.apiKey, secretHint: hint(s.monnify.secretKey), contractCode: s.monnify.contractCode },
          allowManual: s.allowManual,
          webhookUrl: absolute("/api/monnify/webhook"),
        }}
      />
    </div>
  );
}
