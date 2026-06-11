// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminCustomPagesView from '../../../sections/admin/AdminCustomPagesView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Trang tuỳ chỉnh | Quản trị</title></Head>
      <AdminCustomPagesView />
    </>
  );
}
