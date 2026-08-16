import { getT } from '@/i18n/server';

// Shared layout for legal/policy pages.
export default function LegalPage({ title, updated, children }: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const t = getT();
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-1 text-xs text-gray-400">{t('legal.updated', { date: updated })}</p>
      <div className="prose-content card mt-6 p-6 sm:p-8 [&>h2]:text-base [&>h2:first-child]:mt-0">{children}</div>
    </div>
  );
}
