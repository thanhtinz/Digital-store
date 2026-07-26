'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from './Providers';
import { api } from '@/lib/client';
import Icon from './icons';

type Category = { id: number; name: string; slug: string };

type Props = {
  siteName: string;
  logo: string;
  categories: Category[];
};

export default function Header({ siteName, logo, categories }: Props) {
  const { user, cartCount, refreshUser } = useStore();
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

  return (
    <>
    {/* The drawer lives outside <header>: backdrop-blur would otherwise turn
        the header into the containing block for position:fixed children. */}
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-2 sm:gap-3">
        {/* Burger (mobile) */}
        <button
          aria-label="Open menu"
          className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Icon name="menu" size={22} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2" onClick={closeAll}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={siteName} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-lg font-extrabold text-white">
              {siteName.charAt(0)}
            </span>
          )}
          <span className="hidden text-lg font-extrabold tracking-tight sm:block">{siteName}</span>
        </Link>

        {/* Desktop nav — compact: Products / Categories dropdown / Flash Sale */}
        <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
          <Link href="/products" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Products
          </Link>

          {categories.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setCatMenu((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  catMenu ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Categories
                <Icon name="chevron-right" size={14} className={`transition-transform ${catMenu ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              {catMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCatMenu(false)} />
                  <div className="absolute left-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/category/${c.slug}`}
                        onClick={closeAll}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-700"
                      >
                        <Icon name="folder" size={16} className="text-gray-400" />
                        {c.name}
                      </Link>
                    ))}
                    <div className="mt-1 border-t border-gray-100 pt-1">
                      <Link
                        href="/products"
                        onClick={closeAll}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-brand-600 hover:bg-gray-50"
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

          <Link href="/flash-sale" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            <Icon name="bolt" size={15} /> Flash Sale
          </Link>
        </nav>

        {/* Search (desktop) */}
        <form onSubmit={search} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="input py-2 pl-9"
            />
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </form>

        {/* Cart */}
        <Link href="/cart" aria-label="Cart" onClick={closeAll} className="relative ml-auto rounded-lg p-2 hover:bg-gray-100 md:ml-0">
          <Icon name="cart" size={22} />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>

        {/* User */}
        {user === undefined ? (
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        ) : user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenu((v) => !v)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700"
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
                <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                    <Link href="/admin" onClick={closeAll} className="block px-4 py-2 text-sm font-medium text-brand-700 hover:bg-gray-50">
                      Admin console
                    </Link>
                  )}
                  <Link href="/orders" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">My orders</Link>
                  <Link href="/wallet" onClick={closeAll} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50">
                    Wallet
                    <span className="text-xs font-bold text-brand-600">${(user.balance ?? 0).toFixed(2)}</span>
                  </Link>
                  <Link href="/affiliate" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">Affiliate program</Link>
                  <Link href="/wishlist" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">Wishlist</Link>
                  <Link href="/support" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">Support</Link>
                  <Link href="/account" onClick={closeAll} className="block px-4 py-2 text-sm hover:bg-gray-50">Account & security</Link>
                  <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50">
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary hidden px-3 py-2 sm:inline-flex">Sign in</Link>
            <Link href="/register" className="btn-primary px-3 py-2">Sign up</Link>
          </div>
        )}
      </div>
    </header>

    {/* ── Mobile burger drawer ─────────────────────────────────── */}
    {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed bottom-0 left-0 top-0 z-[60] flex w-[300px] max-w-[85vw] flex-col bg-white shadow-xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
              <span className="text-base font-extrabold">{siteName}</span>
              <button aria-label="Close menu" className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <form onSubmit={search} className="mb-3">
                <div className="relative">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="input py-2 pl-9" />
                  <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </form>

              <nav className="flex flex-col">
                <Link href="/products" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                  <Icon name="bag" size={17} className="text-gray-400" /> All Products
                </Link>
                <Link href="/flash-sale" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <Icon name="bolt" size={17} /> Flash Sale
                </Link>

                {/* Categories dropdown (accordion) */}
                {categories.length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={() => setCatAccordion((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon name="folder" size={17} className="text-gray-400" /> Categories
                      </span>
                      <Icon name="chevron-right" size={15} className={`text-gray-400 transition-transform ${catAccordion ? 'rotate-90' : ''}`} />
                    </button>
                    {catAccordion && (
                      <div className="ml-4 border-l border-gray-200 pl-2">
                        {categories.map((c) => (
                          <Link
                            key={c.id}
                            href={`/category/${c.slug}`}
                            onClick={closeAll}
                            className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-brand-700"
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
                    <Link href="/orders" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="box" size={17} className="text-gray-400" /> My orders
                    </Link>
                    <Link href="/wallet" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="credit-card" size={17} className="text-gray-400" /> Wallet
                    </Link>
                    <Link href="/wishlist" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="heart" size={17} className="text-gray-400" /> Wishlist
                    </Link>
                    <Link href="/support" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="chat" size={17} className="text-gray-400" /> Support
                    </Link>
                    <Link href="/account" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                      <Icon name="user" size={17} className="text-gray-400" /> Account & security
                    </Link>
                  </>
                ) : (
                  <Link href="/login" onClick={closeAll} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                    <Icon name="user" size={17} className="text-gray-400" /> Sign in
                  </Link>
                )}
              </nav>
            </div>

            {user && (
              <div className="border-t border-gray-100 p-3">
                <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <Icon name="logout" size={17} /> Sign out
                </button>
              </div>
            )}
          </div>
        </>
    )}
    </>
  );
}
