import { notFound } from 'next/navigation';
import { featureEnabled } from '@/lib/features';

export const dynamic = 'force-dynamic';

// The wallet page itself is a client component, so the feature check lives
// here — the URL must 404 while the feature is off, not just lose its links.
export default async function WalletLayout({ children }: { children: React.ReactNode }) {
  if (!(await featureEnabled('wallet'))) notFound();
  return <>{children}</>;
}
