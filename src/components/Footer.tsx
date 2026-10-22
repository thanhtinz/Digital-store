import Link from 'next/link';
import Icon from './icons';
import AppearanceMenu from './AppearanceMenu';
import LanguageSwitcher from './LanguageSwitcher';
import type { TFunction } from '@/i18n';

type Props = {
  siteName: string;
  tagline: string;
  logo: string;
  footerText: string;
  footerAbout: string;
  supportEmail: string;
  socials: Record<string, string>;
  categories: Array<{ id: number; name: string; slug: string }>;
  features?: Record<string, boolean>;
};

const SOCIAL_ORDER = ['facebook', 'twitter', 'instagram', 'youtube', 'telegram', 'discord'] as const;

export default function Footer({ siteName, tagline, logo, footerText, footerAbout, supportEmail, socials, categories, features = {}, t }: Props & { t: TFunction }) {
  const socialLinks = SOCIAL_ORDER.filter((k) => socials?.[k]);
  const on = (k: string) => features[k] !== false;
  return (
    <footer className="relative mt-20 border-t border-gray-200/80 bg-white">
      {/* Brand hairline along the top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />
      {/* Trust strip */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
        <div className="container grid grid-cols-2 gap-x-4 gap-y-5 py-7 sm:grid-cols-4">
          {([
            ['bolt', t('trust.instant'), t('trust.instantSub')],
            ['lock', t('trust.secure'), t('trust.secureSub')],
            ['refresh', t('trust.refund'), t('trust.refundSub')],
            ['chat', t('trust.human'), t('trust.humanSub')],
          ] as const).map(([icon, title, desc]) => (
            <div key={title} className="group flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 shadow-sm ring-1 ring-brand-100 transition group-hover:scale-105">
                <Icon name={icon} size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12 lg:py-14">
        <div>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={siteName} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : (
            <p className="text-lg font-extrabold">{siteName}</p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-gray-500">{footerAbout || tagline}</p>
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700 hover:underline">
              <Icon name="mail" size={15} /> {supportEmail}
            </a>
          )}
          {socialLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((k) => (
                <a
                  key={k}
                  href={socials[k]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={k}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 hover:shadow-sm"
                >
                  <Icon name={k} size={17} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-400">{t('footer.shop')}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/products" className="text-gray-600 transition hover:text-brand-600">{t('footer.allProducts')}</Link></li>
            {on('flash_sale') && <li><Link href="/flash-sale" className="text-gray-600 transition hover:text-brand-600">{t('footer.flashSale')}</Link></li>}
            {on('news') && <li><Link href="/news" className="text-gray-600 transition hover:text-brand-600">{t('footer.news')}</Link></li>}
            {on('giftcards') && <li><Link href="/gift-cards" className="text-gray-600 transition hover:text-brand-600">{t('footer.giftCards')}</Link></li>}
            {on('reviews') && <li><Link href="/reviews" className="text-gray-600 transition hover:text-brand-600">{t('footer.reviews')}</Link></li>}
            {categories.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="text-gray-600 transition hover:text-brand-600">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-400">{t('footer.help')}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {on('support') && <li><Link href="/support" className="text-gray-600 transition hover:text-brand-600">{t('footer.support')}</Link></li>}
            <li><Link href="/faq" className="text-gray-600 transition hover:text-brand-600">{t('footer.faq')}</Link></li>
            <li><Link href="/refund-policy" className="text-gray-600 transition hover:text-brand-600">{t('footer.refund')}</Link></li>
            <li><Link href="/terms" className="text-gray-600 transition hover:text-brand-600">{t('footer.terms')}</Link></li>
            <li><Link href="/privacy" className="text-gray-600 transition hover:text-brand-600">{t('footer.privacy')}</Link></li>
            <li><Link href="/status" className="text-gray-600 transition hover:text-brand-600">{t('footer.status')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-400">{t('footer.accept')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['VISA', 'Mastercard', 'AMEX', 'PayPal', 'Stripe'].map((brand) => (
              <span
                key={brand}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-gray-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700"
              >
                {brand}
              </span>
            ))}
          </div>
          <p className="mt-3.5 flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="lock" size={13} /> {t('footer.ssl')}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 py-5">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <span>{footerText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}</span>
          <span className="flex items-center gap-4">
            <LanguageSwitcher />
            <AppearanceMenu />
          </span>
        </div>
      </div>
    </footer>
  );
}
