// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminRanksView from '../../../sections/admin/AdminRanksView';

// ----------------------------------------------------------------------

AdminRanksPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminRanksPage() {
  return (
    <>
      <Head>
        <title> Cấp bậc | Quản trị</title>
      </Head>
      <AdminRanksView />
    </>
  );
}
