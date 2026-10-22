// Serializable coupon shape rendered by the homepage voucher strip and the
// hero voucher panel (values already converted from Decimal to number).
//
// This module is intentionally NOT marked 'use client': voucherHeadline is a
// pure formatter that Server Components call during SSR (the homepage hero
// panel). When it lived in VoucherCard.tsx — a 'use client' module — the
// production server bundle replaced the function export with a client
// reference, so calling it on the server threw "x is not a function" as soon
// as at least one coupon existed.
export type Voucher = {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  endsAt: string | null;
};

export function voucherHeadline(
  v: Voucher,
  t: (k: string, p?: Record<string, string | number>) => string,
  money: (n: number) => string
) {
  return v.type === 'PERCENT'
    ? t('home.voucherOffPercent', { value: v.value })
    : t('home.voucherOffFixed', { amount: money(v.value) });
}
