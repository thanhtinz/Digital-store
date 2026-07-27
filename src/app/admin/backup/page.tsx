'use client';

import Icon from '@/components/icons';

export default function AdminBackupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Backup</h1>
      <p className="mt-0.5 text-sm text-gray-500">
        Your entire store lives in the database — keep a copy somewhere safe.
      </p>

      <div className="card mt-5 max-w-2xl p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="download" className="text-brand-600" /> Download full backup
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          One JSON file containing every table: products, packages, stock (including unsold keys), orders,
          customers, wallets, coupons, settings, tickets, news — everything except uploaded image binaries.
        </p>
        <a href="/api/admin/backup" className="btn-primary mt-4 inline-flex">
          <Icon name="download" size={16} /> Download backup now
        </a>
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
          <p className="font-bold">Handle with care</p>
          <p className="mt-1">
            The file contains customer emails, unsold license keys and hashed passwords. Store it encrypted,
            never share it, and download a fresh copy at least weekly (put a reminder in your calendar).
          </p>
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          <p className="font-bold text-gray-700">Also recommended</p>
          <p className="mt-1">
            Enable automated snapshots on your database host (most managed PostgreSQL providers offer daily
            backups with point-in-time recovery) — this download is your extra, offline safety net.
          </p>
        </div>
      </div>
    </div>
  );
}
