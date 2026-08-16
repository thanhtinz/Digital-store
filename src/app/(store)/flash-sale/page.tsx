import Link from 'next/link';
import prisma from '@/lib/db';
import Countdown from '@/components/Countdown';

import Icon from '@/components/icons';
import { notFound } from 'next/navigation';
import { featureEnabled } from '@/lib/features';
import { getMoneyFormatter } from '@/lib/currency';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.flashSale') };
}

export default async function FlashSalePage() {
  const money = await getMoneyFormatter();
  if (!(await featureEnabled('flash_sale'))) notFound();

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
      <p className="section-eyebrow text-red-600">Limited-time deals</p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Icon name="bolt" size={26} className="text-red-600" /> Flash Sale</h1>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
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
                      <div className="grid h-full place-items-center text-gray-300"><Icon name="bag" size={36} /></div>
                    )}
                    {pct > 0 && <span className="badge absolute left-2 top-2 bg-red-600 text-white">-{pct}%</span>}
                    {soldOut && <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white">SOLD OUT</div>}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-semibold">{item.package.product.name}</p>
                    <p className="text-xs text-gray-500">{item.package.name}</p>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-bold text-red-600">{money(Number(item.salePrice))}</span>
                      <span className="text-xs text-gray-400 line-through">{money(Number(item.package.price))}</span>
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
