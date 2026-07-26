import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Orders' };

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/orders');

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { id: 'desc' },
    take: 100,
    include: { items: true },
  });

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold">Purchase history</h1>
      {orders.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <Icon name="box" size={56} className="mx-auto text-gray-300" />
          <p className="mt-4 font-semibold">You haven&apos;t placed any orders yet</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.code}`} className="card flex flex-wrap items-center gap-4 p-4 transition hover:shadow-md">
              <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                {o.items[0]?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.items[0].imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gray-300"><Icon name="box" size={24} /></span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  #{o.code}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {o.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                  {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={o.status} />
                <span className="text-sm font-bold">{formatMoney(Number(o.total), o.currency)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
