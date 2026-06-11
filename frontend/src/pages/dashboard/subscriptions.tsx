// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import SubscriptionsView from '../../sections/storefront/SubscriptionsView';

// ----------------------------------------------------------------------

SubscriptionsPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function SubscriptionsPage() {
  return (
    <>
      <Head>
        <title> Gói đang sử dụng | Digital Store</title>
      </Head>

      <SubscriptionsView />
    </>
  );
}
