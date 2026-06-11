// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import OrdersView from '../../../sections/storefront/OrdersView';

// ----------------------------------------------------------------------

OrdersPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function OrdersPage() {
  return (
    <>
      <Head>
        <title> Đơn hàng của tôi | Digital Store</title>
      </Head>

      <OrdersView />
    </>
  );
}
