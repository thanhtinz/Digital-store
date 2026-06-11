// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminBadgesView from '../../../sections/admin/AdminBadgesView';

// ----------------------------------------------------------------------

AdminBadgesPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminBadgesPage() {
  return (
    <>
      <Head>
        <title> Huy hiệu | Quản trị</title>
      </Head>
      <AdminBadgesView />
    </>
  );
}
