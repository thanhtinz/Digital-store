import { notFound } from 'next/navigation';
import { featureEnabled } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  if (!(await featureEnabled('giftcards'))) notFound();
  return <>{children}</>;
}
