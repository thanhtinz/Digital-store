import Link from 'next/link';
import Icon from './icons';

type Props = {
  siteName: string;
  tagline: string;
  footerText: string;
  supportEmail: string;
  categories: Array<{ id: number; name: string; slug: string }>;
};

export default function Footer({ siteName, tagline, footerText, supportEmail, categories }: Props) {
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
          <p className="text-lg font-extrabold">{siteName}</p>
          <p className="mt-2 text-sm text-gray-500">{tagline}</p>
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
              <Icon name="mail" size={15} /> {supportEmail}
            </a>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/products" className="text-gray-600 hover:text-brand-600">All products</Link></li>
            <li><Link href="/flash-sale" className="text-gray-600 hover:text-brand-600">Flash sale</Link></li>
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
            <li><Link href="/support" className="text-gray-600 hover:text-brand-600">Support center</Link></li>
            <li><Link href="/faq" className="text-gray-600 hover:text-brand-600">FAQ</Link></li>
            <li><Link href="/refund-policy" className="text-gray-600 hover:text-brand-600">Refund policy</Link></li>
            <li><Link href="/terms" className="text-gray-600 hover:text-brand-600">Terms of service</Link></li>
            <li><Link href="/privacy" className="text-gray-600 hover:text-brand-600">Privacy policy</Link></li>
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
