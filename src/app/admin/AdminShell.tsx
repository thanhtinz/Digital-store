'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdminT, useStore } from '@/components/Providers';
import Icon from '@/components/icons';
import { api } from '@/lib/client';

// The admin area is fully separate from the storefront: its own header,
// sidebar menu and footer. Settings are separate pages (no tabs).
const NAV: Array<{ href: string; labelKey: string; icon: string } | { sectionKey: string }> = [
  { href: '/admin', labelKey: 'admin.nav.dashboard', icon: 'dashboard' },
  { href: '/admin/reports', labelKey: 'admin.nav.reports', icon: 'chart' },
  { href: '/admin/deliveries', labelKey: 'admin.nav.deliveries', icon: 'truck' },
  { href: '/admin/payments', labelKey: 'admin.nav.paymentReviews', icon: 'credit-card' },
  { href: '/admin/inventory', labelKey: 'admin.nav.autoDelivery', icon: 'bolt' },
  { href: '/admin/orders', labelKey: 'admin.nav.orders', icon: 'box' },
  { href: '/admin/products', labelKey: 'admin.nav.products', icon: 'bag' },
  { href: '/admin/categories', labelKey: 'admin.nav.categories', icon: 'folder' },
  { sectionKey: 'admin.nav.sectionMarketing' },
  { href: '/admin/banners', labelKey: 'admin.nav.banners', icon: 'image' },
  { href: '/admin/coupons', labelKey: 'admin.nav.coupons', icon: 'ticket' },
  { href: '/admin/flash-sales', labelKey: 'admin.nav.flashSales', icon: 'bolt' },
  { href: '/admin/auto-coupons', labelKey: 'admin.nav.autoCoupons', icon: 'gift' },
  { href: '/admin/posts', labelKey: 'admin.nav.posts', icon: 'news' },
  { sectionKey: 'admin.nav.sectionCommunity' },
  { href: '/admin/tickets', labelKey: 'admin.nav.tickets', icon: 'chat' },
  { href: '/admin/reviews', labelKey: 'admin.nav.reviews', icon: 'star' },
  { href: '/admin/users', labelKey: 'admin.nav.users', icon: 'users' },
  { sectionKey: 'admin.nav.sectionConfiguration' },
  { href: '/admin/security', labelKey: 'admin.nav.security', icon: 'shield' },
  { href: '/admin/audit', labelKey: 'admin.nav.audit', icon: 'list' },
  { href: '/admin/api-keys', labelKey: 'admin.nav.apiKeys', icon: 'key' },
  { href: '/admin/backup', labelKey: 'admin.nav.backup', icon: 'download' },
  { href: '/admin/settings/features', labelKey: 'admin.nav.features', icon: 'spark' },
  { href: '/admin/settings', labelKey: 'admin.nav.siteSettings', icon: 'settings' },
  { href: '/admin/settings/currency', labelKey: 'admin.nav.currency', icon: 'chart' },
  { href: '/admin/settings/appearance', labelKey: 'admin.nav.appearance', icon: 'image' },
  { href: '/admin/settings/payments', labelKey: 'admin.nav.paymentSettings', icon: 'credit-card' },
  { href: '/admin/settings/marketing', labelKey: 'admin.nav.rewards', icon: 'star' },
  { href: '/admin/settings/google', labelKey: 'admin.nav.google', icon: 'key' },
  { href: '/admin/settings/email', labelKey: 'admin.nav.email', icon: 'mail' },
  { href: '/admin/settings/notifications', labelKey: 'admin.nav.notifications', icon: 'bell' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useStore();
  const t = useAdminT();
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
        {t('admin.shell.checking')}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* ── Admin header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900 text-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            aria-label={t('admin.shell.menu')}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            onClick={() => setDrawer((v) => !v)}
          >
            <Icon name="menu" />
          </button>
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
              <Icon name="shield" size={17} />
            </span>
            <span className="text-sm font-bold tracking-wide">{t('admin.shell.title')}</span>
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
              <span className="hidden sm:inline">{t('admin.shell.viewStore')}</span>
            </Link>
            <div className="mx-1 h-6 w-px bg-white/15" />
            <span className="hidden max-w-[160px] truncate text-sm text-gray-300 md:block">{user.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">{t('admin.shell.signOut')}</span>
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
          <span>{t('admin.shell.footerNote')}</span>
          <span className="flex items-center gap-4">
            <Link href="/admin/orders" className="hover:text-gray-600">{t('admin.nav.orders')}</Link>
            <Link href="/admin/settings" className="hover:text-gray-600">{t('admin.nav.siteSettings')}</Link>
            <Link href="/" className="hover:text-gray-600">{t('admin.shell.storefront')}</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  const t = useAdminT();
  return (
    <nav className="space-y-0.5 p-3">
      {NAV.map((item, i) => {
        if ('sectionKey' in item) {
          return (
            <p key={i} className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {t(item.sectionKey)}
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
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
