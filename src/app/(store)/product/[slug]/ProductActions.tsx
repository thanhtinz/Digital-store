'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

// Wishlist toggle + share button shown next to the product title.
export default function ProductActions({ productId }: { productId: number }) {
  const { user, toast } = useStore();
  const [inWishlist, setInWishlist] = useState(false);
  const [busy, setBusy] = useState(false);

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
        <Icon name="send" size={17} />
      </button>
    </div>
  );
}
