// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminFeaturesView from '../../../../sections/admin/AdminFeaturesView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Tính năng | Quản trị</title></Head>
      <AdminFeaturesView />
    </>
  );
}
