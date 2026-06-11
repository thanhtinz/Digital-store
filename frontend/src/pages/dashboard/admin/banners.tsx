// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminBannersView from '../../../sections/admin/AdminBannersView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Banner | Quản trị</title></Head>
      <AdminBannersView />
    </>
  );
}
