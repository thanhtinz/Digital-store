// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminSmmView from '../../../sections/admin/AdminSmmView';

// ----------------------------------------------------------------------

AdminSmmPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminSmmPage() {
  return (
    <>
      <Head>
        <title> SMM Panel | Quản trị</title>
      </Head>

      <AdminSmmView />
    </>
  );
}
