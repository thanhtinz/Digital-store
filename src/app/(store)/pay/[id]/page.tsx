import PayScreen from './PayScreen';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.pay') };
}

export default function PayPage({ params }: { params: { id: string } }) {
  return <PayScreen id={params.id} />;
}
