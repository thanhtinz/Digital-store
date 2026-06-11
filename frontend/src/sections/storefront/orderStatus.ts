// Map trạng thái đơn hàng -> key i18n + màu Label (đồng bộ store cũ).

export type OrderStatusColor = 'success' | 'warning' | 'info' | 'error' | 'default';

// Trả về key i18n (namespace orders_page) cho trạng thái đơn hàng.
export function orderStatusKey(status?: string): string {
  switch (status) {
    case 'completed':
      return 'status_completed';
    case 'paid':
      return 'status_paid';
    case 'pending':
    case 'pending_payment':
      return 'status_pending';
    case 'cancelled':
    case 'expired':
      return 'status_cancelled';
    case 'failed':
      return 'status_failed';
    default:
      return '';
  }
}

export function orderStatusColor(status?: string): OrderStatusColor {
  switch (status) {
    case 'completed':
      return 'success';
    case 'paid':
      return 'info';
    case 'pending':
    case 'pending_payment':
      return 'warning';
    case 'cancelled':
    case 'expired':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

// Nhóm trạng thái cho tab lọc (label là key i18n trong namespace orders_page).
export const ORDER_FILTER_TABS = [
  { value: 'all', labelKey: 'tab_all' },
  { value: 'pending', labelKey: 'tab_pending' },
  { value: 'paid', labelKey: 'tab_paid' },
  { value: 'completed', labelKey: 'tab_completed' },
  { value: 'cancelled', labelKey: 'tab_cancelled' },
  { value: 'failed', labelKey: 'tab_failed' },
];

export function matchOrderFilter(status: string | undefined, tab: string): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending') return status === 'pending' || status === 'pending_payment';
  if (tab === 'cancelled') return status === 'cancelled' || status === 'expired';
  return status === tab;
}
