// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminOrdersView from '../../../sections/admin/AdminOrdersView';

// ----------------------------------------------------------------------

AdminOrdersPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminOrdersPage() {
  return (
    <>
      <Head>
        <title> Đơn hàng | Quản trị</title>
      </Head>

      <AdminOrdersView />
    </>
  );
}
