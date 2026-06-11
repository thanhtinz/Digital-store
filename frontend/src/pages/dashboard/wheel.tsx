// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import WheelView from '../../sections/storefront/WheelView';

// ----------------------------------------------------------------------

WheelPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function WheelPage() {
  return (
    <>
      <Head>
        <title> Vòng quay may mắn | Digital Store</title>
      </Head>

      <WheelView />
    </>
  );
}
