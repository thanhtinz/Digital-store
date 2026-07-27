'use client';

import Icon from '@/components/icons';
import { useSettings, SettingsHeader } from '../shared';

const FEATURES: { key: string; icon: string; title: string; desc: string }[] = [
  { key: 'feature_wallet', icon: 'credit-card', title: 'Wallet', desc: 'Balance top-ups and instant wallet checkout. Hiding it also hides the Wallet page and the balance payment method.' },
  { key: 'feature_giftcards', icon: 'gift', title: 'Gift cards', desc: 'Buying and redeeming prepaid gift card codes.' },
  { key: 'feature_reviews', icon: 'star', title: 'Product reviews', desc: 'Review form and review lists on products, plus the public /reviews wall.' },
  { key: 'feature_wishlist', icon: 'heart', title: 'Wishlist', desc: 'Save-for-later hearts on products and the wishlist page.' },
  { key: 'feature_news', icon: 'news', title: 'News & blog', desc: 'The /news section and its links in the header and footer.' },
  { key: 'feature_flash_sale', icon: 'bolt', title: 'Flash sales', desc: 'The flash sale section on the home page, the /flash-sale page and nav links. Sale prices stop applying while off.' },
  { key: 'feature_livechat', icon: 'chat', title: 'Live chat widget', desc: 'The floating chat bubble on the storefront.' },
  { key: 'feature_support', icon: 'users', title: 'Support center', desc: 'Customer ticket pages. Turning this off also hides live chat.' },
];

export default function AdminFeaturesPage() {
  const { s, set, save, busy } = useSettings();
  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

  return (
    <div>
      <SettingsHeader
        title="Features"
        subtitle="Switch parts of the storefront on or off — changes apply immediately after saving."
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
                  <p className="font-bold">{f.title}</p>
                  <button
                    role="switch"
                    aria-checked={on}
                    onClick={() => set(f.key, on ? 'false' : 'true')}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Loyalty points and the affiliate program have their own switches under Rewards &amp; affiliate;
        payment methods under Payments; Telegram under Notifications.
      </p>
    </div>
  );
}
