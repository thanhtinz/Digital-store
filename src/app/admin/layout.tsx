import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import AdminShell from './AdminShell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Console', robots: { index: false, follow: false } };

// Server-side gate for the whole admin area: anonymous visitors and customers
// never receive an admin page at all, so access does not depend on client JS.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role === 'CUSTOMER') redirect('/');
  return <AdminShell>{children}</AdminShell>;
}
