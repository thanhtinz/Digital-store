import Link from 'next/link';
import prisma from '@/lib/db';
import Countdown from '@/components/Countdown';
import { formatMoney } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Flash Sale' };

export default async function FlashSalePage() {
  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { endsAt: 'asc' },
    include: {
      items: {
        include: {
          package: { include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
        },
      },
    },
  });

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold">⚡ Flash Sale</h1>
      <p className="mt-1 text-sm text-gray-500">Limited-time prices — once the timer hits zero, they&apos;re gone.</p>

      {sales.length === 0 && (
        <div className="card mt-8 p-16 text-center text-gray-500">
          No flash sale is running right now. Check back soon!
        </div>
      )}

      {sales.map((sale) => (
        <section key={sale.id} className="mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">{sale.name}</h2>
            <span className="text-sm text-gray-500">ends in</span>
            <Countdown until={sale.endsAt.toISOString()} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {sale.items.map((item) => {
              const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
              const pct = Number(item.package.price) > 0
                ? Math.round((1 - Number(item.salePrice) / Number(item.package.price)) * 100)
                : 0;
              const left = item.quantityLimit != null ? Math.max(0, item.quantityLimit - item.soldCount) : null;
              return (
                <Link key={item.id} href={`/product/${item.package.product.slug}`} className="card group overflow-hidden transition hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {item.package.product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.package.product.images[0].url} alt={item.package.product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl text-gray-300">🛍️</div>
                    )}
                    {pct > 0 && <span className="badge absolute left-2 top-2 bg-red-600 text-white">-{pct}%</span>}
                    {soldOut && <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white">SOLD OUT</div>}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-semibold">{item.package.product.name}</p>
                    <p className="text-xs text-gray-500">{item.package.name}</p>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-bold text-red-600">{formatMoney(Number(item.salePrice))}</span>
                      <span className="text-xs text-gray-400 line-through">{formatMoney(Number(item.package.price))}</span>
                    </div>
                    {left != null && !soldOut && (
                      <p className="mt-1.5 text-[11px] font-medium text-orange-600">Only {left} left at this price</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
