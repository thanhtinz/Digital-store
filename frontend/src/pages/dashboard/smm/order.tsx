// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import SmmOrderView from '../../../sections/storefront/smm/SmmOrderView';

// ----------------------------------------------------------------------

SmmOrderPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

export default function SmmOrderPage() {
  return (
    <>
      <Head>
        <title> Đặt đơn dịch vụ | Digital Store</title>
      </Head>
      <SmmOrderView />
    </>
  );
}
