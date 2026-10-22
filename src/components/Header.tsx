'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore, useMoney, useT } from './Providers';
import { api } from '@/lib/client';
import Icon from './icons';
import AppearanceMenu from './AppearanceMenu';
import LanguageSwitcher from './LanguageSwitcher';

type Category = { id: number; name: string; slug: string };

type Props = {
  siteName: string;
  logo: string;
  categories: Category[];
  features?: Record<string, boolean>;
};

// Shopee-style chrome in frosted brand glass: a slim utility bar over a
// gradient main bar (bag logo + wordmark, pill search with a hot-keyword
// row, glass icon actions). All colours come from the --brand-* variables,
// so the appearance customizer re-tints the whole header live.
export default function Header({ siteName, logo, categories, features = {} }: Props) {
  const on = (k: string) => features[k] !== false;
  const { user, cartCount, refreshUser } = useStore();
  const money = useMoney();
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [catMenu, setCatMenu] = useState(false);       // desktop dropdown
  const [catAccordion, setCatAccordion] = useState(true); // mobile accordion

  // Close overlays on navigation.
  const closeAll = () => {
    setMobileOpen(false);
    setUserMenu(false);
    setCatMenu(false);
  };

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
    closeAll();
  };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    await refreshUser();
    closeAll();
    router.push('/');
    router.refresh();
  };

  const searchPill = (id: string) => (
    <form onSubmit={search} className="w-full">
      <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_10px_28px_-12px_rgba(0,0,0,.45)] ring-1 ring-white/60">
        <Icon name="search" size={16} className="ms-2.5 shrink-0 text-gray-400" />
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('nav.search')}
          className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          aria-label={t('home.search')}
          className="grid h-8 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-btn-primary transition hover:brightness-110 active:scale-95"
        >
          <Icon name="search" size={16} />
        </button>
      </div>
    </form>
  );

  return (
    <>
    {/* The drawer lives outside <header>: backdrop-blur would otherwise turn
        the header into the containing block for position:fixed children. */}
    <header className="sticky top-0 z-50">
      {/* ── Utility bar ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="container flex h-8 items-center justify-between gap-4 text-[11px] font-medium sm:text-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/admin" className="transition hover:text-white/75">{t('utility.seller')}</Link>
            <span className="hidden h-3 w-px bg-white/30 sm:block" />
            <span className="hidden items-center gap-1.5 sm:flex">
              <Icon name="download" size={12} /> {t('utility.download')}
            </span>
            <span className="hidden h-3 w-px bg-white/30 md:block" />
            <span className="hidden items-center gap-1.5 md:flex">
              {t('utility.connect')}
              <Icon name="facebook" size={12} />
              <Icon name="instagram" size={12} />
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 [&_label]:text-white/85">
            {on('support') && (
              <Link href="/support" className="hidden items-center gap-1.5 transition hover:text-white/75 sm:flex">
                <Icon name="chat" size={12} /> {t('utility.help')}
              </Link>
            )}
            <LanguageSwitcher />
            {user ? (
              <Link href="/account" className="max-w-32 truncate transition hover:text-white/75">{user.name}</Link>
            ) : (
              <span className="flex items-center gap-2">
                <Link href="/register" className="transition hover:text-white/75">{t('nav.signUp')}</Link>
                <span className="h-3 w-px bg-white/30" />
                <Link href="/login" className="transition hover:text-white/75">{t('nav.signIn')}</Link>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main bar (frosted brand glass) ──────────────────────── */}
      <div className="border-b border-white/25 bg-gradient-to-r from-brand-600/95 via-brand-500/95 to-brand-500/90 shadow-[0_18px_36px_-24px_rgb(var(--brand-800)/.55)] backdrop-blur-xl backdrop-saturate-150">
        <div className="container flex items-center gap-2 pb-2 pt-3 sm:gap-3">
          {/* Burger (mobile) */}
          <button
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/15 active:scale-95 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>

          {/* Logo — bag tile + wordmark; an uploaded image replaces both */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={closeAll}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={siteName} className="h-10 w-auto max-w-[170px] rounded-xl bg-white/90 object-contain px-1.5" />
            ) : (
              <>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)] ring-1 ring-white/40 backdrop-blur">
                  <Icon name="bag" size={21} />
                </span>
                <span className="hidden text-xl font-extrabold tracking-tight text-white drop-shadow-sm sm:block">{siteName}</span>
              </>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="ms-2 hidden items-center gap-0.5 xl:flex">
            <Link href="/products" className="rounded-full px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15 hover:text-white">
              {t('nav.products')}
            </Link>
            {categories.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setCatMenu((v) => !v)}
                  className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    catMenu ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {t('nav.categories')}
                  <Icon name="chevron-right" size={14} className={`transition-transform ${catMenu ? '-rotate-90' : 'rotate-90'}`} />
                </button>
                {catMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCatMenu(false)} />
                    <div className="absolute start-0 z-50 mt-2 w-60 origin-top-left animate-scale-in overflow-hidden rounded-3xl border border-white/60 bg-white/90 py-1.5 shadow-pop backdrop-blur-2xl">
                      {categories.map((c) => (
                        <Link
                          key={c.id}
                          href={`/category/${c.slug}`}
                          onClick={closeAll}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50/80 hover:text-brand-700"
                        >
                          <Icon name="folder" size={16} className="text-gray-400" />
                          {c.name}
                        </Link>
                      ))}
                      <div className="mt-1 border-t border-gray-100 pt-1">
                        <Link
                          href="/products"
                          onClick={closeAll}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50/80"
                        >
                          View all products
                          <Icon name="chevron-right" size={14} />
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {on('flash_sale') && (
              <Link href="/flash-sale" className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-yellow-200 transition hover:bg-white/15">
                <Icon name="bolt" size={15} /> {t('nav.flashSale')}
              </Link>
            )}
            {on('news') && (
              <Link href="/news" className="rounded-full px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15 hover:text-white">
                {t('nav.news')}
              </Link>
            )}
          </nav>

          {/* Search (desktop) + hot keywords */}
          <div className="mx-auto hidden w-full max-w-xl flex-1 md:block">
            {searchPill('search-desktop')}
            {(categories.length > 0 || on('flash_sale')) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 px-2 text-[11px] font-medium text-white/80">
                {on('flash_sale') && (
                  <Link href="/flash-sale" className="transition hover:text-white">{t('nav.flashSale')}</Link>
                )}
                {categories.slice(0, 5).map((c) => (
                  <Link key={c.id} href={`/category/${c.slug}`} className="transition hover:text-white">{c.name}</Link>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ms-0">
            <AppearanceMenu variant="gear" placement="down" />

            {/* Notifications — order & delivery updates live on the orders page */}
            <span className="hidden sm:block">
              <Link href="/orders" aria-label={t('nav.notifications')} onClick={closeAll} className="btn-icon-glass relative">
                <Icon name="bell" size={20} />
              </Link>
            </span>

            <Link href="/cart" aria-label="Cart" onClick={closeAll} className="btn-icon-glass relative">
              <Icon name="cart" size={20} />
              {cartCount > 0 && (
                <span className="absolute -end-1 -top-1 grid h-5 min-w-5 animate-scale-in place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-brand-700 shadow ring-1 ring-brand-100">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* User */}
            {user === undefined ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/25" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-extrabold text-brand-700 shadow ring-2 ring-white/50 transition hover:ring-white"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute end-0 z-50 mt-2 w-56 origin-top-right animate-scale-in overflow-hidden rounded-3xl border border-white/60 bg-white/90 py-1 shadow-pop backdrop-blur-2xl">
                      <div className="border-b border-gray-100 px-4 py-2.5">
                        <p className="truncate text-sm font-semibold">{user.name}</p>
                        <p className="truncate text-xs text-gray-500">{user.email}</p>
                      </div>
                      {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                        <Link href="/admin" onClick={closeAll} className="block px-4 py-2 text-sm font-medium text-brand-700 hover:bg-gray-50">
                          Admin console
                        </Link>
                      )}
                      <Link href="/orders" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('nav.myOrders')}</Link>
                      {on('wallet') && (
                        <Link href="/wallet" onClick={closeAll} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50">
                          {t('nav.wallet')}
                          <span className="text-xs font-bold text-brand-600">{money(user.balance ?? 0)}</span>
                        </Link>
                      )}
                      {on('giftcards') && <Link href="/gift-cards" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('nav.giftCards')}</Link>}
                      <Link href="/affiliate" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('nav.affiliate')}</Link>
                      {on('wishlist') && <Link href="/wishlist" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('nav.wishlist')}</Link>}
                      {on('support') && <Link href="/support" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('nav.support')}</Link>}
                      <Link href="/account" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('nav.account')}</Link>
                      <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50">
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold text-white ring-1 ring-white/70 transition hover:bg-white/15">{t('nav.signIn')}</Link>
                <Link href="/register" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow transition hover:bg-brand-50">{t('nav.signUp')}</Link>
              </div>
            )}
          </div>
        </div>

        {/* Search (mobile) */}
        <div className="container pb-3 md:hidden">{searchPill('search-mobile')}</div>
      </div>
    </header>

    {/* ── Mobile burger drawer ─────────────────────────────────── */}
    {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[55] animate-fade-in bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed bottom-0 left-0 top-0 z-[60] flex w-[300px] max-w-[85vw] animate-slide-in-left flex-col bg-white/95 shadow-2xl backdrop-blur-2xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
              <span className="text-base font-extrabold">{siteName}</span>
              <button aria-label="Close menu" className="rounded-full p-2 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <nav className="flex flex-col">
                <Link href="/products" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                  <Icon name="bag" size={17} className="text-gray-400" /> {t('footer.allProducts')}
                </Link>
                {on('flash_sale') && (
                  <Link href="/flash-sale" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                    <Icon name="bolt" size={17} /> {t('nav.flashSale')}
                  </Link>
                )}
                {on('news') && (
                  <Link href="/news" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                    <Icon name="news" size={17} className="text-gray-400" /> {t('nav.news')}
                  </Link>
                )}

                {/* Categories dropdown (accordion) */}
                {categories.length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={() => setCatAccordion((v) => !v)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon name="folder" size={17} className="text-gray-400" /> {t('nav.categories')}
                      </span>
                      <Icon name="chevron-right" size={15} className={`text-gray-400 transition-transform ${catAccordion ? 'rotate-90' : ''}`} />
                    </button>
                    {catAccordion && (
                      <div className="ms-4 border-s border-gray-200 ps-2">
                        {categories.map((c) => (
                          <Link
                            key={c.id}
                            href={`/category/${c.slug}`}
                            onClick={closeAll}
                            className="block rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-brand-700"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="my-2 border-t border-gray-100" />

                {user ? (
                  <>
                    <Link href="/orders" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="box" size={17} className="text-gray-400" /> {t('nav.myOrders')}
                    </Link>
                    {on('wallet') && (
                      <Link href="/wallet" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                        <Icon name="credit-card" size={17} className="text-gray-400" /> {t('nav.wallet')}
                      </Link>
                    )}
                    {on('wishlist') && (
                      <Link href="/wishlist" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                        <Icon name="heart" size={17} className="text-gray-400" /> {t('nav.wishlist')}
                      </Link>
                    )}
                    {on('support') && (
                      <Link href="/support" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                        <Icon name="chat" size={17} className="text-gray-400" /> {t('nav.support')}
                      </Link>
                    )}
                    <Link href="/account" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="user" size={17} className="text-gray-400" /> {t('nav.account')}
                    </Link>
                  </>
                ) : (
                  <Link href="/login" onClick={closeAll} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                    <Icon name="user" size={17} className="text-gray-400" /> {t('nav.signIn')}
                  </Link>
                )}
              </nav>
            </div>

            {user && (
              <div className="border-t border-gray-100 p-3">
                <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <Icon name="logout" size={17} /> {t('nav.signOut')}
                </button>
              </div>
            )}
          </div>
        </>
    )}
    </>
  );
}
