'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMoney, useT } from './Providers';
import { api } from '@/lib/client';
import Icon from './icons';

type Suggestion = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  minPrice: number;
  minOriginal: number;
  onSale: boolean;
};

// Header search pill with an instant-suggestion dropdown. Typing debounces
// ~200ms into /api/search/suggest; arrow keys + Enter/Esc work at a basic
// level; submitting (or Enter with nothing highlighted) keeps the classic
// behaviour of landing on /products?q=.
export default function SearchBox({ id, onNavigate }: { id: string; onNavigate?: () => void }) {
  const t = useT();
  const money = useMoney();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  // Debounced suggestion fetch; stale responses are dropped by sequence.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoaded(false);
      setOpen(false);
      return;
    }
    const seq = ++seqRef.current;
    const timer = setTimeout(() => {
      api<{ products: Suggestion[] }>(`/api/search/suggest?q=${encodeURIComponent(term)}`)
        .then((d) => {
          if (seqRef.current !== seq) return;
          setItems(d.products || []);
          setLoaded(true);
          setOpen(true);
          setActive(-1);
        })
        .catch(() => {
          if (seqRef.current !== seq) return;
          setItems([]);
          setLoaded(true);
          setOpen(true);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  // Close when clicking anywhere outside this search box.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open ]);

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && items[active]) {
      go(`/product/${items[active].slug}`);
      return;
    }
    go(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <form onSubmit={submit} className="w-full">
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_10px_28px_-12px_rgba(0,0,0,.45)] ring-1 ring-white/60">
          <Icon name="search" size={16} className="ms-2.5 shrink-0 text-gray-400" />
          <input
            id={id}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => { if (items.length > 0 || loaded) setOpen(true); }}
            onKeyDown={onKeyDown}
            placeholder={t('nav.search')}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => { setQ(''); setOpen(false); }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <Icon name="x" size={13} />
            </button>
          )}
          <button
            type="submit"
            aria-label={t('home.search')}
            className="grid h-8 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-btn-primary transition hover:brightness-110 active:scale-95"
          >
            <Icon name="search" size={16} />
          </button>
        </div>
      </form>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 origin-top animate-scale-in overflow-hidden rounded-3xl border border-white/60 bg-white/95 py-1.5 text-left shadow-pop backdrop-blur-2xl"
        >
          {items.length > 0 ? (
            <>
              {items.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(`/product/${p.slug}`)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2 transition ${i === active ? 'bg-brand-50' : ''}`}
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-100">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-gray-300"><Icon name="bag" size={16} /></span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800">{p.name}</span>
                    <span className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-[13px] font-extrabold text-brand-600">{money(p.minPrice)}</span>
                      {p.onSale && p.minOriginal > p.minPrice && (
                        <span className="text-[11px] text-gray-400 line-through">{money(p.minOriginal)}</span>
                      )}
                    </span>
                  </span>
                  <Icon name="chevron-right" size={14} className="shrink-0 text-gray-300" />
                </button>
              ))}
              <div className="mt-1 border-t border-gray-100 pt-1">
                <button
                  type="button"
                  onClick={() => go(`/products?q=${encodeURIComponent(q.trim())}`)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50/80"
                >
                  <Icon name="search" size={14} /> {t('search.viewAllResults')}
                </button>
              </div>
            </>
          ) : loaded ? (
            <p className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500">
              <Icon name="search" size={14} className="text-gray-300" /> {t('search.noResults')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
