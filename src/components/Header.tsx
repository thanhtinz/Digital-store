'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from './Providers';
import { api } from '@/lib/client';

type Props = {
  siteName: string;
  logo: string;
  categories: Array<{ id: number; name: string; slug: string }>;
};

export default function Header({ siteName, logo, categories }: Props) {
  const { user, cartCount, refreshUser } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
    setMobileOpen(false);
  };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    await refreshUser();
    setUserMenu(false);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-3">
        {/* Mobile menu button */}
        <button
          aria-label="Menu"
          className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
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

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          <Link href="/products" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            All Products
          </Link>
          <Link href="/flash-sale" className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            ⚡ Flash Sale
          </Link>
          {categories.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={search} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="input py-2 pl-9"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </div>
        </form>

        {/* Cart */}
        <Link href="/cart" aria-label="Cart" className="relative ml-auto rounded-lg p-2 hover:bg-gray-100 md:ml-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H8.7a2 2 0 0 1-2-1.6L5 4H2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9.5" cy="20" r="1.4" /><circle cx="17.5" cy="20" r="1.4" />
          </svg>
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
                    <Link href="/admin" onClick={() => setUserMenu(false)} className="block px-4 py-2 text-sm font-medium text-brand-700 hover:bg-gray-50">
                      Admin panel
                    </Link>
                  )}
                  <Link href="/orders" onClick={() => setUserMenu(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                    My orders
                  </Link>
                  <Link href="/wishlist" onClick={() => setUserMenu(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                    Wishlist
                  </Link>
                  <Link href="/account" onClick={() => setUserMenu(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                    Account & security
                  </Link>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 lg:hidden">
          <form onSubmit={search} className="py-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="input" />
          </form>
          <nav className="flex flex-col">
            <Link href="/products" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">All Products</Link>
            <Link href="/flash-sale" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">⚡ Flash Sale</Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">
                {c.name}
              </Link>
            ))}
            {!user && (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100">Sign in</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
