// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminMarketingView from '../../../sections/admin/AdminMarketingView';

// ----------------------------------------------------------------------

AdminMarketingPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminMarketingPage() {
  return (
    <>
      <Head>
        <title> Marketing | Quản trị</title>
      </Head>

      <AdminMarketingView />
    </>
  );
}
