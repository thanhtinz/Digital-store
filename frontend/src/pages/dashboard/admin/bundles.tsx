// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminBundlesView from '../../../sections/admin/AdminBundlesView';

// ----------------------------------------------------------------------

AdminBundlesPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminBundlesPage() {
  return (
    <>
      <Head>
        <title> Gói combo | Quản trị</title>
      </Head>
      <AdminBundlesView />
    </>
  );
}
