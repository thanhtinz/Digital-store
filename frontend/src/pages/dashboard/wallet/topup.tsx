// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import TopUpView from '../../../sections/storefront/TopUpView';

// ----------------------------------------------------------------------

TopUpPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function TopUpPage() {
  return (
    <>
      <Head>
        <title> Nạp tiền | Digital Store</title>
      </Head>

      <TopUpView />
    </>
  );
}
