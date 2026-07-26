import Link from 'next/link';

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
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold">{siteName}</p>
          <p className="mt-2 text-sm text-gray-500">{tagline}</p>
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
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/orders" className="text-gray-600 hover:text-brand-600">Order history</Link></li>
            <li><Link href="/account" className="text-gray-600 hover:text-brand-600">Account & security</Link></li>
            <li><Link href="/wishlist" className="text-gray-600 hover:text-brand-600">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Support</p>
          <ul className="mt-3 space-y-2 text-sm">
            {supportEmail && (
              <li><a href={`mailto:${supportEmail}`} className="text-gray-600 hover:text-brand-600">{supportEmail}</a></li>
            )}
            <li className="text-gray-600">Secure payments: Visa · Mastercard · PayPal</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 py-5 text-center text-xs text-gray-400">
        {footerText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
      </div>
    </footer>
  );
}
