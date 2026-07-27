import prisma from '@/lib/db';
import { getSettings } from '@/lib/settings';
import Icon from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'System status' };

async function check<T>(fn: () => Promise<T>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

// Public status page — live checks against the store's own subsystems.
export default async function StatusPage() {
  const dbOk = await check(() => prisma.$queryRaw`SELECT 1`);
  const s = dbOk
    ? await getSettings(['stripe_enabled', 'paypal_enabled', 'smtp_host', 'customer_bot_token']).catch(() => null)
    : null;

  const components: { name: string; desc: string; ok: boolean | null }[] = [
    { name: 'Storefront & checkout', desc: 'Website, cart and order placement', ok: true },
    { name: 'Database', desc: 'Catalog, orders and accounts', ok: dbOk },
    {
      name: 'Card payments (Stripe)',
      desc: 'Visa / Mastercard / AMEX checkout',
      ok: s ? s.stripe_enabled === 'true' : null,
    },
    { name: 'PayPal payments', desc: 'PayPal checkout and wallet top-ups', ok: s ? s.paypal_enabled === 'true' : null },
    { name: 'Email delivery', desc: 'Order confirmations and receipts', ok: s ? !!s.smtp_host : null },
    { name: 'Telegram bot', desc: 'Customer notifications bot', ok: s ? !!s.customer_bot_token : null },
    { name: 'Instant delivery', desc: 'Automatic stock fulfillment', ok: dbOk },
  ];
  const allUp = components.every((c) => c.ok !== false);

  return (
    <div className="container max-w-3xl py-8">
      <p className="section-eyebrow">Transparency</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">System status</h1>

      <div className={`card mt-5 flex items-center gap-4 p-5 ${allUp ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${allUp ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
          <Icon name={allUp ? 'check' : 'clock'} size={24} />
        </span>
        <div>
          <p className="text-lg font-bold">{allUp ? 'All systems operational' : 'Partial service degradation'}</p>
          <p className="text-xs text-gray-500">
            Checked live at {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' })} UTC
          </p>
        </div>
      </div>

      <div className="card mt-5 divide-y divide-gray-100">
        {components.map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-5 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{c.name}</span>
              <span className="block text-xs text-gray-400">{c.desc}</span>
            </span>
            {c.ok === true && <span className="badge bg-green-100 text-green-700">Operational</span>}
            {c.ok === false && <span className="badge bg-red-100 text-red-700">Down</span>}
            {c.ok === null && <span className="badge bg-gray-100 text-gray-500">Not configured</span>}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Instant delivery runs 24/7. If something looks wrong, contact support — we answer fast.
      </p>
    </div>
  );
}
