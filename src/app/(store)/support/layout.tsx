import { notFound } from 'next/navigation';
import { featureEnabled } from '@/lib/features';

export const dynamic = 'force-dynamic';

// Covers the ticket list and every ticket thread under /support.
export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  if (!(await featureEnabled('support'))) notFound();
  return <>{children}</>;
}
