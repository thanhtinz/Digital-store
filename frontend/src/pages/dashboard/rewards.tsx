// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import RewardsView from '../../sections/storefront/RewardsView';

// ----------------------------------------------------------------------

RewardsPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function RewardsPage() {
  return (
    <>
      <Head>
        <title> Điểm thưởng | Digital Store</title>
      </Head>

      <RewardsView />
    </>
  );
}
