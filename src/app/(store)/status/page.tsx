import prisma from '@/lib/db';
import { getSettings } from '@/lib/settings';
import Icon from '@/components/icons';
import { formatDateTime } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.status') };
}

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
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  const dbOk = await check(() => prisma.$queryRaw`SELECT 1`);
  const s = dbOk
    ? await getSettings(['stripe_enabled', 'paypal_enabled', 'smtp_host', 'customer_bot_token']).catch(() => null)
    : null;

  const components: { name: string; desc: string; ok: boolean | null }[] = [
    { name: t('status.storefront'), desc: t('status.storefrontDesc'), ok: true },
    { name: t('status.database'), desc: t('status.databaseDesc'), ok: dbOk },
    { name: t('status.stripe'), desc: t('status.stripeDesc'), ok: s ? s.stripe_enabled === 'true' : null },
    { name: t('status.paypal'), desc: t('status.paypalDesc'), ok: s ? s.paypal_enabled === 'true' : null },
    { name: t('status.email'), desc: t('status.emailDesc'), ok: s ? !!s.smtp_host : null },
    { name: t('status.telegram'), desc: t('status.telegramDesc'), ok: s ? !!s.customer_bot_token : null },
    { name: t('status.delivery'), desc: t('status.deliveryDesc'), ok: dbOk },
  ];
  const allUp = components.every((c) => c.ok !== false);

  return (
    <div className="container max-w-3xl py-8">
      <p className="section-eyebrow">{t('status.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('status.title')}</h1>

      <div className={`card mt-5 flex items-center gap-4 p-5 ${allUp ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${allUp ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
          <Icon name={allUp ? 'check' : 'clock'} size={24} />
        </span>
        <div>
          <p className="text-lg font-bold">{allUp ? t('status.allUp') : t('status.degraded')}</p>
          <p className="text-xs text-gray-500">
            {t('status.checkedAt', {
              time: formatDateTime(new Date(), intlLocale, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }),
            })}
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
            {c.ok === true && <span className="badge bg-green-100 text-green-700">{t('status.operational')}</span>}
            {c.ok === false && <span className="badge bg-red-100 text-red-700">{t('status.down')}</span>}
            {c.ok === null && <span className="badge bg-gray-100 text-gray-500">{t('status.notConfigured')}</span>}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">{t('status.footer')}</p>
    </div>
  );
}
