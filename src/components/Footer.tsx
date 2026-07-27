import Link from 'next/link';
import Icon from './icons';

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

export default function Footer({ siteName, tagline, logo, footerText, footerAbout, supportEmail, socials, categories, features = {} }: Props) {
  const socialLinks = SOCIAL_ORDER.filter((k) => socials?.[k]);
  const on = (k: string) => features[k] !== false;
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      {/* Trust strip */}
      <div className="border-b border-gray-100">
        <div className="container grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
          {([
            ['bolt', 'Instant delivery', 'Digital goods in seconds'],
            ['lock', 'Secure payments', 'Stripe & PayPal protected'],
            ['refresh', 'Easy refunds', 'Fair refund policy'],
            ['chat', 'Human support', 'Real answers, fast'],
          ] as const).map(([icon, title, desc]) => (
            <div key={title} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={icon} size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={siteName} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : (
            <p className="text-lg font-extrabold">{siteName}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">{footerAbout || tagline}</p>
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
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
                  className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                >
                  <Icon name={k} size={17} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/products" className="text-gray-600 hover:text-brand-600">All products</Link></li>
            {on('flash_sale') && <li><Link href="/flash-sale" className="text-gray-600 hover:text-brand-600">Flash sale</Link></li>}
            {on('news') && <li><Link href="/news" className="text-gray-600 hover:text-brand-600">News & updates</Link></li>}
            {on('giftcards') && <li><Link href="/gift-cards" className="text-gray-600 hover:text-brand-600">Gift cards</Link></li>}
            {on('reviews') && <li><Link href="/reviews" className="text-gray-600 hover:text-brand-600">Customer reviews</Link></li>}
            {categories.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="text-gray-600 hover:text-brand-600">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Help & legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            {on('support') && <li><Link href="/support" className="text-gray-600 hover:text-brand-600">Support center</Link></li>}
            <li><Link href="/faq" className="text-gray-600 hover:text-brand-600">FAQ</Link></li>
            <li><Link href="/refund-policy" className="text-gray-600 hover:text-brand-600">Refund policy</Link></li>
            <li><Link href="/terms" className="text-gray-600 hover:text-brand-600">Terms of service</Link></li>
            <li><Link href="/privacy" className="text-gray-600 hover:text-brand-600">Privacy policy</Link></li>
            <li><Link href="/status" className="text-gray-600 hover:text-brand-600">System status</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">We accept</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['VISA', 'Mastercard', 'AMEX', 'PayPal', 'Stripe'].map((brand) => (
              <span
                key={brand}
                className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-gray-600"
              >
                {brand}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="lock" size={13} /> 256-bit SSL encrypted checkout
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 py-5 text-center text-xs text-gray-400">
        {footerText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
      </div>
    </footer>
  );
}
