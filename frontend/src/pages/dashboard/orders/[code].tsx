// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import OrderDetailView from '../../../sections/storefront/OrderDetailView';

// ----------------------------------------------------------------------

OrderDetailPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function OrderDetailPage() {
  return (
    <>
      <Head>
        <title> Chi tiết đơn hàng | Digital Store</title>
      </Head>

      <OrderDetailView />
    </>
  );
}
