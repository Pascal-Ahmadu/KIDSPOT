"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState, useTransition } from "react";
import { FieldHint } from "@/components/admin/field";
import { savePaymentSettingsAction, testMonnifyAction, testTerminalAction, type PaymentSettingsState } from "@/lib/actions/payments";

export type PaymentFormValue = {
  moniepoint: { enabled: boolean; clientId: string; secretHint: string; amountUnit: "kobo" | "naira"; baseUrl: string; terminals: { serial: string; label: string }[] };
  monnify: { enabled: boolean; mode: "sandbox" | "live"; apiKey: string; secretHint: string; contractCode: string };
  allowManual: boolean;
  webhookUrl: string;
};

function Note({ state }: { state: PaymentSettingsState | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="field-error" role="alert">
        {state.error}
      </p>
    );
  return (
    <p className="text-sm font-medium text-[#10A957]" role="status">
      {state.message}
    </p>
  );
}

/** Settings → Payments: Moniepoint terminal, Monnify transfers, manual entry. Secrets are write-only. */
export function PaymentSettingsForm({ value }: { value: PaymentFormValue }) {
  const [terminals, setTerminals] = useState(value.moniepoint.terminals.length ? value.moniepoint.terminals : [{ serial: "", label: "" }]);
  const [state, setState] = useState<PaymentSettingsState | null>(null);
  const [test, setTest] = useState<{ key: string; state: PaymentSettingsState } | null>(null);
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();
  const saved = new Set(value.moniepoint.terminals.map((t) => t.serial));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setState(await savePaymentSettingsAction({}, fd)));
  }

  const runTest = (key: string, fn: () => Promise<PaymentSettingsState>) =>
    startTest(async () => {
      setTest({ key, state: { message: "Testing…" } });
      setTest({ key, state: await fn() });
    });

  return (
    <form onSubmit={submit} className="grid gap-6">
      {/* Moniepoint terminal */}
      <section className="rounded-[8px] border border-line bg-card px-5 py-5 sm:px-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="moniepointEnabled" defaultChecked={value.moniepoint.enabled} className="checkbox mt-0.5" />
          <span>
            <span className="block text-base font-semibold text-ink">Moniepoint POS terminal</span>
            <span className="block text-[#7C7C7C]">
              &quot;Card&quot; at the till sends the amount to the terminal. The customer pays on it, and the sale is saved only when Moniepoint confirms.
            </span>
          </span>
        </label>
        <p className="mt-4 rounded-[8px] bg-surface px-4 py-3 text-sm leading-6 text-[#525252]">
          In the Moniepoint Business app or website: Settings → POS Terminal Configuration → turn on <strong>ERP Integration</strong> → POS app developer → create a client.
          Copy the client secret straight away; Moniepoint only shows it once. The serial number is on the back of each terminal and in its settings.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="moniepointClientId">
              Client ID
            </label>
            <input id="moniepointClientId" name="moniepointClientId" className="input" defaultValue={value.moniepoint.clientId} autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="moniepointClientSecret">
              Client secret
            </label>
            <input
              id="moniepointClientSecret"
              name="moniepointClientSecret"
              type="password"
              className="input"
              autoComplete="new-password"
              placeholder={value.moniepoint.secretHint ? `Saved (${value.moniepoint.secretHint})` : ""}
            />
            <FieldHint>{value.moniepoint.secretHint ? "Leave empty to keep the saved secret." : "Stored on the server, never shown again."}</FieldHint>
          </div>
        </div>

        <div className="mt-5">
          <span className="label">Terminals</span>
          <div className="grid gap-2">
            {terminals.map((t, i) => (
              <div key={i} className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    name="terminalLabel"
                    value={t.label}
                    onChange={(e) => setTerminals((ts) => ts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="Name, e.g. Front counter"
                    aria-label="Terminal name"
                    className="input min-w-0 flex-1"
                  />
                  <input
                    name="terminalSerial"
                    value={t.serial}
                    onChange={(e) => setTerminals((ts) => ts.map((x, j) => (j === i ? { ...x, serial: e.target.value } : x)))}
                    placeholder="Serial number"
                    aria-label="Terminal serial number"
                    className="input min-w-0 flex-1 font-mono"
                  />
                  {saved.has(t.serial) && (
                    <button type="button" disabled={testing} onClick={() => runTest(`t${i}`, () => testTerminalAction(t.serial))} className="btn btn-ghost shrink-0">
                      Send ₦100 test
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove terminal"
                    onClick={() => setTerminals((ts) => (ts.length === 1 ? [{ serial: "", label: "" }] : ts.filter((_, j) => j !== i)))}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-[#7C7C7C] hover:bg-surface hover:text-accent"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                {test?.key === `t${i}` && <Note state={test.state} />}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTerminals((ts) => [...ts, { serial: "", label: "" }])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            <PlusIcon className="h-4 w-4" /> Add terminal
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="moniepointAmountUnit">
              Amount sent as
            </label>
            <select id="moniepointAmountUnit" name="moniepointAmountUnit" defaultValue={value.moniepoint.amountUnit} className="input">
              <option value="kobo">Kobo (₦100 = 10000)</option>
              <option value="naira">Naira (₦100 = 100)</option>
            </select>
            <FieldHint>Moniepoint&apos;s guide doesn&apos;t say which. Use &quot;Send ₦100 test&quot; and check the terminal shows ₦100.</FieldHint>
          </div>
          <div>
            <label className="label" htmlFor="moniepointBaseUrl">
              API address
            </label>
            <input id="moniepointBaseUrl" name="moniepointBaseUrl" className="input" defaultValue={value.moniepoint.baseUrl} />
            <FieldHint>Only change this if Moniepoint gives you a different one.</FieldHint>
          </div>
        </div>
      </section>

      {/* Monnify */}
      <section className="rounded-[8px] border border-line bg-card px-5 py-5 sm:px-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="monnifyEnabled" defaultChecked={value.monnify.enabled} className="checkbox mt-0.5" />
          <span>
            <span className="block text-base font-semibold text-ink">Transfers confirmed by Monnify</span>
            <span className="block text-[#7C7C7C]">
              Each sale or online order gets its own account number for the exact amount. When the money lands, the sale or order is marked paid by itself: no more checking bank alerts.
            </span>
          </span>
        </label>
        <p className="mt-4 rounded-[8px] bg-surface px-4 py-3 text-sm leading-6 text-[#525252]">
          Monnify is Moniepoint&apos;s payment service. Sign up at monnify.com, finish the business checks, then copy the API key, secret key and contract code from Developer → API keys.
          Start with <strong>Test (sandbox)</strong> keys; switch to Live when the test works.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="monnifyMode">
              Mode
            </label>
            <select id="monnifyMode" name="monnifyMode" defaultValue={value.monnify.mode} className="input">
              <option value="sandbox">Test (sandbox): no real money</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="monnifyContractCode">
              Contract code
            </label>
            <input id="monnifyContractCode" name="monnifyContractCode" className="input font-mono" defaultValue={value.monnify.contractCode} autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="monnifyApiKey">
              API key
            </label>
            <input id="monnifyApiKey" name="monnifyApiKey" className="input font-mono" defaultValue={value.monnify.apiKey} autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="monnifySecretKey">
              Secret key
            </label>
            <input
              id="monnifySecretKey"
              name="monnifySecretKey"
              type="password"
              className="input"
              autoComplete="new-password"
              placeholder={value.monnify.secretHint ? `Saved (${value.monnify.secretHint})` : ""}
            />
            <FieldHint>{value.monnify.secretHint ? "Leave empty to keep the saved key." : "Stored on the server, never shown again."}</FieldHint>
          </div>
        </div>
        <div className="mt-5">
          <span className="label">Webhook URL (paste into Monnify → Developer → Webhook URLs → Transaction completion)</span>
          <code className="block break-all rounded-[8px] border border-line bg-white px-3 py-2.5 font-mono text-sm text-ink">{value.webhookUrl}</code>
          <FieldHint>Online orders need this so they&apos;re marked paid even after the shopper closes the page. It only works once the site is live on this address.</FieldHint>
        </div>
        <div className="mt-4 grid gap-2">
          <button type="button" disabled={testing} onClick={() => runTest("monnify", testMonnifyAction)} className="btn btn-ghost justify-self-start">
            Test connection
          </button>
          {test?.key === "monnify" && <Note state={test.state} />}
        </div>
      </section>

      {/* Manual entry */}
      <section className="rounded-[8px] border border-line bg-card px-5 py-5 sm:px-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="allowManual" defaultChecked={value.allowManual} className="checkbox mt-0.5" />
          <span>
            <span className="block text-base font-semibold text-ink">Let cashiers record card and transfer payments by hand</span>
            <span className="block text-[#7C7C7C]">
              A fallback for when the terminal or network is down. Hand-recorded transfers still go to Transfer check. Switch this off once the connections are working, so every card and
              transfer sale is confirmed by Moniepoint or Monnify.
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="mr-auto">{!pending && <Note state={state} />}</div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save payment settings"}
        </button>
      </div>
    </form>
  );
}
