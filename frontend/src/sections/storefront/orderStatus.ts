// Map trạng thái đơn hàng -> nhãn tiếng Việt + màu Label (đồng bộ store cũ).

export type OrderStatusColor = 'success' | 'warning' | 'info' | 'error' | 'default';

export function orderStatusLabel(status?: string): string {
  switch (status) {
    case 'completed':
      return 'Đã giao hàng';
    case 'paid':
      return 'Đã thanh toán';
    case 'pending':
    case 'pending_payment':
      return 'Đặt hàng';
    case 'cancelled':
    case 'expired':
      return 'Đã hủy';
    case 'failed':
      return 'Lỗi';
    default:
      return status || '—';
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

// Nhóm trạng thái cho tab lọc.
export const ORDER_FILTER_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Đặt hàng' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'completed', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'failed', label: 'Lỗi' },
];

export function matchOrderFilter(status: string | undefined, tab: string): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending') return status === 'pending' || status === 'pending_payment';
  if (tab === 'cancelled') return status === 'cancelled' || status === 'expired';
  return status === tab;
}
