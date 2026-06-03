// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminUsersView from '../../../sections/admin/AdminUsersView';

// ----------------------------------------------------------------------

AdminUsersPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminUsersPage() {
  return (
    <>
      <Head>
        <title> Người dùng | Quản trị</title>
      </Head>

      <AdminUsersView />
    </>
  );
}
