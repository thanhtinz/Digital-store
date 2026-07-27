'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

// Wishlist toggle + share + affiliate buttons shown next to the title.
export default function ProductActions({
  productId,
  slug,
  affiliate,
  wishlistEnabled = true,
}: {
  productId: number;
  slug: string;
  affiliate: { enabled: boolean; rate: number };
  wishlistEnabled?: boolean;
}) {
  const { user, toast } = useStore();
  const [inWishlist, setInWishlist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [affOpen, setAffOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<{ productIds: number[] }>('/api/wishlist')
      .then((d) => setInWishlist(d.productIds.includes(productId)))
      .catch(() => {});
  }, [user, productId]);

  const toggle = async () => {
    if (!user) {
      toast('Sign in to save products to your wishlist', 'error');
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ inWishlist: boolean }>('/api/wishlist', { method: 'POST', json: { productId } });
      setInWishlist(d.inWishlist);
      toast(d.inWishlist ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className="flex gap-2">
      {affiliate.enabled && affiliate.rate > 0 && (
        <button
          onClick={() => setAffOpen(true)}
          title={`Earn ${affiliate.rate}% commission promoting this product`}
          className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-bold text-green-700 transition hover:bg-green-100"
        >
          <Icon name="gift" size={15} /> Earn {affiliate.rate}%
        </button>
      )}
      {wishlistEnabled && (
        <button
          onClick={toggle}
          disabled={busy}
          aria-label="Toggle wishlist"
          className={`grid h-10 w-10 place-items-center rounded-lg border transition ${
            inWishlist
              ? 'border-red-200 bg-red-50 text-red-500'
              : 'border-gray-300 bg-white text-gray-400 hover:border-red-200 hover:text-red-400'
          }`}
        >
          <Icon name="heart" size={18} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>
      )}
      <button
        onClick={share}
        aria-label="Share product"
        className="grid h-10 w-10 place-items-center rounded-lg border border-gray-300 bg-white text-gray-400 transition hover:border-brand-300 hover:text-brand-600"
      >
        <Icon name="share" size={17} />
      </button>

      {affOpen && <AffiliateModal slug={slug} rate={affiliate.rate} onClose={() => setAffOpen(false)} />}
    </div>
  );
}

// Explains the program, then reveals the personal product link to copy.
function AffiliateModal({ slug, rate, onClose }: { slug: string; rate: number; onClose: () => void }) {
  const { user, toast } = useStore();
  const pathname = usePathname();
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api<{ refCode: string | null }>('/api/affiliate/me')
      .then((d) => {
        if (d.refCode) setLink(`${window.location.origin}/product/${slug}?ref=${d.refCode}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, slug]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast(`Affiliate link copied — earn ${rate}% on every sale`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
        >
          <Icon name="x" size={16} />
        </button>

        <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-100 text-green-600">
          <Icon name="gift" size={22} />
        </span>
        <h2 className="mt-3 text-lg font-bold">Earn {rate}% promoting this product</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          Share your personal link anywhere — social media, groups, your website. You earn a{' '}
          <b className="text-gray-900">{rate}% commission</b> on every order from customers you refer, credited
          straight to your wallet.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
          {[
            'Anyone who signs up via your link is yours for 30 days (cookie)',
            'Commission is paid the moment their order is paid',
            'Track earnings anytime on your affiliate dashboard',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Icon name="check" size={15} className="mt-0.5 shrink-0 text-green-600" /> {line}
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Your link for this product</p>
          {user ? (
            <>
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1 font-mono text-xs"
                  readOnly
                  value={loading ? 'Generating your link…' : link || 'Could not load — try again'}
                  onFocus={(e) => e.target.select()}
                />
                <button className="btn-primary shrink-0 px-3" onClick={copy} disabled={!link}>
                  Copy
                </button>
              </div>
              <Link href="/affiliate" className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline">
                Open affiliate dashboard
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-600">Sign in to get your personal link.</p>
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn-primary mt-2 inline-flex">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
