'use client';

import { useMemo, useState } from 'react';
import { useSettings, field, SettingsHeader } from '../shared';
import { useAdminT } from '@/components/Providers';
import { formatMoneyWith, moneyFormatFrom, parseRates } from '@/lib/utils';
import Icon from '@/components/icons';

const COMMON = ['USD', 'EUR', 'GBP', 'VND', 'JPY', 'AUD', 'CAD', 'SGD', 'THB', 'PHP', 'INR'];

type Row = { code: string; rate: string };

export default function CurrencySettingsPage() {
  const { s, set, save, busy } = useSettings();
  const t = useAdminT();
  // Local rows mirror the currency_rates JSON so the admin edits a table,
  // not a blob. They serialize back on every change.
  const [rows, setRows] = useState<Row[] | null>(null);

  const preview = useMemo(() => {
    if (!s) return '';
    return formatMoneyWith(1234567.89, moneyFormatFrom(s));
  }, [s]);

  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.common.loading')}</div>;

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

  // Editing any single format piece is an explicit opt-in to 'custom' —
  // in 'auto' the pieces are ignored and the currency code's conventions
  // rule, so a stale USD-era separator saved long ago can't leak back in.
  const setPiece = (k: string, v: string) => {
    set(k, v);
    set('currency_format_mode', 'custom');
  };
  const formatMode = s.currency_format_mode === 'custom' ? 'custom' : 'auto';

  const base = (s.currency || 'USD').toUpperCase();
  const paymentCode = (s.payment_currency || 'VND').toUpperCase();
  const paymentRate = parseRates(s.currency_rates || '{}')[paymentCode];

  return (
    <div className="space-y-6">
      <SettingsHeader
        title={t('admin.currency.title')}
        subtitle={t('admin.currency.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="card p-5">
        <h2 className="font-bold">{t('admin.currency.baseTitle')}</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('admin.currency.baseText')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('admin.currency.code')}</label>
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
          <div>
            <label className="label">{t('admin.currency.formatMode')}</label>
            <select
              className="input"
              value={formatMode}
              onChange={(e) => set('currency_format_mode', e.target.value)}
            >
              <option value="auto">{t('admin.currency.formatAuto')}</option>
              <option value="custom">{t('admin.currency.formatCustom')}</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">{t('admin.currency.formatModeHelp')}</p>
          </div>
          {field(s, setPiece, { k: 'currency_symbol', label: t('admin.currency.symbol'), placeholder: t('admin.currency.symbolPlaceholder') })}
          <div>
            <label className="label">{t('admin.currency.symbolPos')}</label>
            <select
              className="input"
              value={s.currency_symbol_position ?? ''}
              onChange={(e) => setPiece('currency_symbol_position', e.target.value)}
            >
              <option value="">{t('admin.currency.posAuto')}</option>
              <option value="before">{t('admin.currency.posBefore')}</option>
              <option value="after">{t('admin.currency.posAfter')}</option>
            </select>
          </div>
          {field(s, setPiece, { k: 'currency_decimals', label: t('admin.currency.decimals'), type: 'number', help: t('admin.currency.decimalsHelp') })}
          {field(s, setPiece, { k: 'currency_thousand_sep', label: t('admin.currency.thousandSep'), help: t('admin.currency.sepHelp') })}
          {field(s, setPiece, { k: 'currency_decimal_sep', label: t('admin.currency.decimalSep'), help: t('admin.currency.sepHelp') })}
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('admin.currency.preview')}</p>
          <p className="mt-1 text-2xl font-extrabold">{preview}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">{t('admin.currency.ratesTitle')}</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('admin.currency.ratesText', { base })}
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
              <span className="whitespace-nowrap text-sm text-gray-500">{t('admin.currency.perOne', { base })}</span>
              <button
                aria-label={t('admin.currency.removeRate')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => writeRows(currentRows.filter((_, j) => j !== i))}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => writeRows([...currentRows, { code: '', rate: '' }])}>
            <Icon name="plus" size={15} /> {t('admin.currency.addRate')}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">{t('admin.currency.paymentsTitle')}</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('admin.currency.paymentsText')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('admin.currency.chargeCurrency')}</label>
            <input
              className="input uppercase"
              maxLength={3}
              value={s.payment_currency ?? ''}
              onChange={(e) => set('payment_currency', e.target.value.toUpperCase())}
            />
            {paymentCode !== base && !paymentRate && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {t('admin.currency.noRate', { code: paymentCode })}
              </p>
            )}
          </div>
          {field(s, set, {
            k: 'currency_round_step',
            label: t('admin.currency.roundStep'),
            type: 'number',
            help: t('admin.currency.roundStepHelp'),
          })}
          {field(s, set, {
            k: 'payment_min',
            label: t('admin.currency.paymentMin', { base }),
            type: 'number',
            help: t('admin.currency.paymentMinHelp'),
          })}
        </div>
      </div>
    </div>
  );
}
