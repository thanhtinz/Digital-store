'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import Icon from '@/components/icons';
import { api } from '@/lib/client';

// The admin area is fully separate from the storefront: its own header,
// sidebar menu and footer. Settings are separate pages (no tabs).
const NAV: Array<{ href: string; label: string; icon: string } | { section: string }> = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/reports', label: 'Reports', icon: 'chart' },
  { href: '/admin/deliveries', label: 'Deliveries', icon: 'truck' },
  { href: '/admin/payments', label: 'Payment reviews', icon: 'credit-card' },
  { href: '/admin/inventory', label: 'Auto delivery', icon: 'bolt' },
  { href: '/admin/orders', label: 'Orders', icon: 'box' },
  { href: '/admin/products', label: 'Products', icon: 'bag' },
  { href: '/admin/categories', label: 'Categories', icon: 'folder' },
  { section: 'Marketing' },
  { href: '/admin/banners', label: 'Banners', icon: 'image' },
  { href: '/admin/coupons', label: 'Coupons', icon: 'ticket' },
  { href: '/admin/flash-sales', label: 'Flash sales', icon: 'bolt' },
  { href: '/admin/auto-coupons', label: 'Auto coupons', icon: 'gift' },
  { href: '/admin/posts', label: 'News', icon: 'news' },
  { section: 'Community' },
  { href: '/admin/tickets', label: 'Support tickets', icon: 'chat' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'star' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { section: 'Configuration' },
  { href: '/admin/security', label: 'Security', icon: 'shield' },
  { href: '/admin/audit', label: 'Audit log', icon: 'list' },
  { href: '/admin/api-keys', label: 'API keys', icon: 'key' },
  { href: '/admin/backup', label: 'Backup', icon: 'download' },
  { href: '/admin/settings/features', label: 'Features', icon: 'spark' },
  { href: '/admin/settings', label: 'Site settings', icon: 'settings' },
  { href: '/admin/settings/currency', label: 'Currency', icon: 'chart' },
  { href: '/admin/settings/appearance', label: 'Appearance', icon: 'image' },
  { href: '/admin/settings/payments', label: 'Payments', icon: 'credit-card' },
  { href: '/admin/settings/marketing', label: 'Rewards & affiliate', icon: 'star' },
  { href: '/admin/settings/google', label: 'Google login', icon: 'key' },
  { href: '/admin/settings/email', label: 'Email (SMTP)', icon: 'mail' },
  { href: '/admin/settings/notifications', label: 'Notifications', icon: 'bell' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/admin');
    if (user && user.role === 'CUSTOMER') router.replace('/');
  }, [user, router]);

  useEffect(() => setDrawer(false), [pathname]);

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    await refreshUser();
    router.push('/login');
  };

  if (!user || user.role === 'CUSTOMER') {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-100 text-sm text-gray-400">
        Checking access…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* ── Admin header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900 text-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            aria-label="Menu"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            onClick={() => setDrawer((v) => !v)}
          >
            <Icon name="menu" />
          </button>
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
              <Icon name="shield" size={17} />
            </span>
            <span className="text-sm font-bold tracking-wide">Admin Console</span>
          </Link>
          <span className="hidden rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-300 sm:block">
            {user.role}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <Icon name="store" size={16} />
              <span className="hidden sm:inline">View store</span>
            </Link>
            <div className="mx-1 h-6 w-px bg-white/15" />
            <span className="hidden max-w-[160px] truncate text-sm text-gray-300 md:block">{user.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Sidebar (desktop) ──────────────────────────────────── */}
        <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
          <SidebarNav pathname={pathname} />
        </aside>

        {/* ── Sidebar drawer (mobile) ────────────────────────────── */}
        {drawer && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawer(false)} />
            <aside className="fixed bottom-0 left-0 top-14 z-50 w-64 overflow-y-auto border-r border-gray-200 bg-white lg:hidden">
              <SidebarNav pathname={pathname} />
            </aside>
          </>
        )}

        {/* ── Content ────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>

      {/* ── Admin footer ─────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-gray-400 sm:px-6">
          <span>Admin Console · internal use only</span>
          <span className="flex items-center gap-4">
            <Link href="/admin/orders" className="hover:text-gray-600">Orders</Link>
            <Link href="/admin/settings" className="hover:text-gray-600">Settings</Link>
            <Link href="/" className="hover:text-gray-600">Storefront</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-0.5 p-3">
      {NAV.map((item, i) => {
        if ('section' in item) {
          return (
            <p key={i} className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {item.section}
            </p>
          );
        }
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon name={item.icon} size={17} className={active ? '' : 'text-gray-400'} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
