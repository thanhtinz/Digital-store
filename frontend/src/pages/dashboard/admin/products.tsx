// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminProductsView from '../../../sections/admin/AdminProductsView';

// ----------------------------------------------------------------------

AdminProductsPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminProductsPage() {
  return (
    <>
      <Head>
        <title> Sản phẩm | Quản trị</title>
      </Head>

      <AdminProductsView />
    </>
  );
}
