// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminFlashSalesView from '../../../sections/admin/AdminFlashSalesView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Flash sale | Quản trị</title></Head>
      <AdminFlashSalesView />
    </>
  );
}
