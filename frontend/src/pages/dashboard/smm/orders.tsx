// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import SmmOrdersView from '../../../sections/storefront/smm/SmmOrdersView';

// ----------------------------------------------------------------------

SmmOrdersPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function SmmOrdersPage() {
  return (
    <>
      <Head>
        <title> Đơn hàng dịch vụ | Digital Store</title>
      </Head>
      <SmmOrdersView />
    </>
  );
}
