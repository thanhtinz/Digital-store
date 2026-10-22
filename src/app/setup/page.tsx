import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { getT } from '@/i18n/server';
import SetupForm from './SetupForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thiết lập lần đầu', robots: { index: false, follow: false } };

// First-run installer. Lives outside the storefront group and the admin
// section on purpose: those layouts redirect here while the store is
// uninitialized, and this page sends everyone home once an admin exists —
// setup can never be re-run to mint a second admin.
export default async function SetupPage() {
  if (await isSetupComplete()) redirect('/');
  const t = getT();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{t('setup.title')}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{t('setup.subtitle')}</p>
      </div>
      <SetupForm />
    </main>
  );
}
