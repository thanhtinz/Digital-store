'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

// Wishlist toggle + share + affiliate-link buttons shown next to the title.
export default function ProductActions({
  productId,
  slug,
  affiliate,
}: {
  productId: number;
  slug: string;
  affiliate: { enabled: boolean; rate: number };
}) {
  const { user, toast } = useStore();
  const [inWishlist, setInWishlist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [affBusy, setAffBusy] = useState(false);

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

  // Copy a ready-to-share affiliate link for THIS product. The dashboard
  // endpoint lazily assigns a referral code on first use.
  const copyAffiliateLink = async () => {
    if (!user) {
      toast('Sign in to get your affiliate link', 'error');
      return;
    }
    setAffBusy(true);
    try {
      const d = await api<{ refCode: string | null }>('/api/affiliate/me');
      if (!d.refCode) throw new Error('Could not create your referral code — try again');
      const link = `${window.location.origin}/product/${slug}?ref=${d.refCode}`;
      await navigator.clipboard.writeText(link);
      toast(`Affiliate link copied — earn ${affiliate.rate}% on every sale`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setAffBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      {affiliate.enabled && affiliate.rate > 0 && (
        <button
          onClick={copyAffiliateLink}
          disabled={affBusy}
          title={`Copy your affiliate link — earn ${affiliate.rate}% commission on every sale`}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
        >
          <Icon name="gift" size={15} /> Earn {affiliate.rate}%
        </button>
      )}
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
      <button
        onClick={share}
        aria-label="Share product"
        className="grid h-10 w-10 place-items-center rounded-lg border border-gray-300 bg-white text-gray-400 transition hover:border-brand-300 hover:text-brand-600"
      >
        <Icon name="share" size={17} />
      </button>
    </div>
  );
}
