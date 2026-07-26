'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/products', label: 'Products', icon: '🛍️' },
  { href: '/admin/categories', label: 'Categories', icon: '🗂️' },
  { href: '/admin/banners', label: 'Banners', icon: '🖼️' },
  { href: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
  { href: '/admin/flash-sales', label: 'Flash sales', icon: '⚡' },
  { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/admin');
    if (user && user.role === 'CUSTOMER') router.replace('/');
  }, [user, router]);

  if (!user || user.role === 'CUSTOMER') {
    return <div className="container py-16 text-center text-gray-400">Checking access…</div>;
  }

  return (
    <div className="container flex gap-6 py-6">
      {/* Sidebar (desktop) / drawer (mobile) */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <SidebarNav pathname={pathname} />
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile nav bar */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
          <button onClick={() => setOpen((v) => !v)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
            ☰ Menu
          </button>
          <span className="text-sm font-bold">
            {NAV.find((n) => n.href === pathname)?.label || 'Admin'}
          </span>
        </div>
        {open && (
          <div className="card mb-4 p-2 lg:hidden" onClick={() => setOpen(false)}>
            <SidebarNav pathname={pathname} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>{item.icon}</span> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
