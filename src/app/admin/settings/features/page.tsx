'use client';

import Icon from '@/components/icons';
import { useAdminT } from '@/components/Providers';
import { useSettings, SettingsHeader } from '../shared';

const FEATURES: { key: string; icon: string; titleKey: string; descKey: string }[] = [
  { key: 'feature_wallet', icon: 'credit-card', titleKey: 'admin.features.wallet', descKey: 'admin.features.walletDesc' },
  { key: 'feature_giftcards', icon: 'gift', titleKey: 'admin.features.giftcards', descKey: 'admin.features.giftcardsDesc' },
  { key: 'feature_reviews', icon: 'star', titleKey: 'admin.features.reviews', descKey: 'admin.features.reviewsDesc' },
  { key: 'feature_wishlist', icon: 'heart', titleKey: 'admin.features.wishlist', descKey: 'admin.features.wishlistDesc' },
  { key: 'feature_news', icon: 'news', titleKey: 'admin.features.news', descKey: 'admin.features.newsDesc' },
  { key: 'feature_flash_sale', icon: 'bolt', titleKey: 'admin.features.flashSale', descKey: 'admin.features.flashSaleDesc' },
  { key: 'feature_support', icon: 'users', titleKey: 'admin.features.support', descKey: 'admin.features.supportDesc' },
];

export default function AdminFeaturesPage() {
  const { s, set, save, busy } = useSettings();
  const t = useAdminT();
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

  return (
    <div>
      <SettingsHeader
        title={t('admin.features.title')}
        subtitle={t('admin.features.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {FEATURES.map((f) => {
          const on = s[f.key] !== 'false';
          return (
            <div key={f.key} className={`card flex items-start gap-4 p-5 transition ${on ? '' : 'opacity-70'}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${on ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                <Icon name={f.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{t(f.titleKey)}</p>
                  <button
                    role="switch"
                    aria-checked={on}
                    onClick={() => set(f.key, on ? 'false' : 'true')}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{t(f.descKey)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400">{t('admin.features.note')}</p>
    </div>
  );
}
