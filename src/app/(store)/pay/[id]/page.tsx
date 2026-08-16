import PayScreen from './PayScreen';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Complete your payment' };

export default function PayPage({ params }: { params: { id: string } }) {
  return <PayScreen id={params.id} />;
}
