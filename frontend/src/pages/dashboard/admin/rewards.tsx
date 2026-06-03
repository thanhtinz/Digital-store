// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminRewardsView from '../../../sections/admin/AdminRewardsView';

// ----------------------------------------------------------------------

AdminRewardsPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminRewardsPage() {
  return (
    <>
      <Head>
        <title> Điểm thưởng | Quản trị</title>
      </Head>

      <AdminRewardsView />
    </>
  );
}
