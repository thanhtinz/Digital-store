'use client';

import { useMemo, useState } from 'react';
import { useSettings, field, SettingsHeader } from '../shared';
import { formatMoneyWith, moneyFormatFrom, parseRates } from '@/lib/utils';
import Icon from '@/components/icons';

const COMMON = ['USD', 'EUR', 'GBP', 'VND', 'JPY', 'AUD', 'CAD', 'SGD', 'THB', 'PHP', 'INR'];

type Row = { code: string; rate: string };

export default function CurrencySettingsPage() {
  const { s, set, save, busy } = useSettings();
  // Local rows mirror the currency_rates JSON so the admin edits a table,
  // not a blob. They serialize back on every change.
  const [rows, setRows] = useState<Row[] | null>(null);

  const preview = useMemo(() => {
    if (!s) return '';
    return formatMoneyWith(1234567.89, moneyFormatFrom(s));
  }, [s]);

  if (!s) return <div className="py-16 text-center text-gray-400">Loading…</div>;

  const currentRows: Row[] =
    rows ?? Object.entries(parseRates(s.currency_rates || '{}')).map(([code, rate]) => ({ code, rate: String(rate) }));

  const writeRows = (next: Row[]) => {
    setRows(next);
    const out: Record<string, number> = {};
    for (const r of next) {
      const rate = Number(r.rate);
      if (/^[A-Za-z]{3}$/.test(r.code) && Number.isFinite(rate) && rate > 0) out[r.code.toUpperCase()] = rate;
    }
    set('currency_rates', JSON.stringify(out));
  };

  const base = (s.currency || 'USD').toUpperCase();
  const paymentCode = (s.payment_currency || 'VND').toUpperCase();
  const paymentRate = parseRates(s.currency_rates || '{}')[paymentCode];

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Currency"
        subtitle="The currency your prices are stored in, how amounts are displayed, and the rates used to charge in another currency."
        onSave={save}
        busy={busy}
      />

      <div className="card p-5">
        <h2 className="font-bold">Base currency</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Every price in the catalog, every wallet balance and every order total is stored in this currency. Changing it
          re-labels existing prices — it does not convert them.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Currency code</label>
            <input
              className="input uppercase"
              maxLength={3}
              list="common-currencies"
              value={s.currency ?? ''}
              onChange={(e) => set('currency', e.target.value.toUpperCase())}
            />
            <datalist id="common-currencies">
              {COMMON.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          {field(s, set, { k: 'currency_symbol', label: 'Symbol', placeholder: 'Leave blank to use the default for the code' })}
          <div>
            <label className="label">Symbol position</label>
            <select
              className="input"
              value={s.currency_symbol_position ?? 'before'}
              onChange={(e) => set('currency_symbol_position', e.target.value)}
            >
              <option value="before">Before the amount ($10.00)</option>
              <option value="after">After the amount (10,00 &#8363;)</option>
            </select>
          </div>
          {field(s, set, { k: 'currency_decimals', label: 'Decimal places', type: 'number', help: 'Use 0 for currencies without cents, such as VND or JPY.' })}
          {field(s, set, { k: 'currency_thousand_sep', label: 'Thousands separator' })}
          {field(s, set, { k: 'currency_decimal_sep', label: 'Decimal separator' })}
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Preview</p>
          <p className="mt-1 text-2xl font-extrabold">{preview}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">Exchange rates</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          How many units of each currency equal <b>1 {base}</b>. Used when a customer pays through a gateway that settles
          in another currency — the rate is frozen onto the payment the moment it is created, so a later edit never
          changes an amount a customer has already been quoted.
        </p>

        <div className="mt-4 space-y-2">
          {currentRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input w-28 uppercase"
                maxLength={3}
                placeholder="VND"
                value={row.code}
                onChange={(e) => writeRows(currentRows.map((r, j) => (j === i ? { ...r, code: e.target.value.toUpperCase() } : r)))}
              />
              <span className="text-sm text-gray-400">=</span>
              <input
                className="input flex-1"
                type="number"
                step="any"
                placeholder="25400"
                value={row.rate}
                onChange={(e) => writeRows(currentRows.map((r, j) => (j === i ? { ...r, rate: e.target.value } : r)))}
              />
              <span className="whitespace-nowrap text-sm text-gray-500">per 1 {base}</span>
              <button
                aria-label="Remove rate"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => writeRows(currentRows.filter((_, j) => j !== i))}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => writeRows([...currentRows, { code: '', rate: '' }])}>
            <Icon name="plus" size={15} /> Add a rate
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">Payments</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Vietnamese methods (SePay, PayOS, bank transfer) collect in this currency; card gateways always charge in the
          base currency.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Charge currency for Vietnamese methods</label>
            <input
              className="input uppercase"
              maxLength={3}
              value={s.payment_currency ?? ''}
              onChange={(e) => set('payment_currency', e.target.value.toUpperCase())}
            />
            {paymentCode !== base && !paymentRate && (
              <p className="mt-1 text-xs font-medium text-red-600">
                No exchange rate is configured for {paymentCode} — add one above before enabling those methods.
              </p>
            )}
          </div>
          {field(s, set, {
            k: 'currency_round_step',
            label: 'Round converted amounts up to',
            type: 'number',
            help: 'For currencies without cents. 1000 turns 253,746 into 254,000 so customers type a clean number.',
          })}
          {field(s, set, {
            k: 'payment_min',
            label: `Minimum order total (${base})`,
            type: 'number',
            help: 'Orders below this cannot be paid for. Card gateways reject very small amounts.',
          })}
        </div>
      </div>
    </div>
  );
}
