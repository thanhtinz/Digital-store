'use client';

import Icon from '@/components/icons';
import { useAdminT } from '@/components/Providers';

export default function AdminBackupPage() {
  const t = useAdminT();
  return (
    <div>
      <h1 className="text-2xl font-bold">{t('admin.backup.title')}</h1>
      <p className="mt-0.5 text-sm text-gray-500">
        {t('admin.backup.subtitle')}
      </p>

      <div className="card mt-5 max-w-2xl p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="download" className="text-brand-600" /> {t('admin.backup.downloadTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {t('admin.backup.downloadText')}
        </p>
        <a href="/api/admin/backup" className="btn-primary mt-4 inline-flex">
          <Icon name="download" size={16} /> {t('admin.backup.downloadBtn')}
        </a>
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
          <p className="font-bold">{t('admin.backup.careTitle')}</p>
          <p className="mt-1">
            {t('admin.backup.careText')}
          </p>
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          <p className="font-bold text-gray-700">{t('admin.backup.alsoTitle')}</p>
          <p className="mt-1">
            {t('admin.backup.alsoText')}
          </p>
        </div>
      </div>
    </div>
  );
}
