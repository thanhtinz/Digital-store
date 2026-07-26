const STYLES: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Awaiting payment', cls: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'Paid — processing', cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-200 text-gray-600' },
  REFUNDED: { label: 'Refunded', cls: 'bg-purple-100 text-purple-700' },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
