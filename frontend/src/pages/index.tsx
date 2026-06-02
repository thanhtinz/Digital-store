// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../layouts/dashboard';
// sections
import HomeView from '../sections/storefront/HomeView';

// ----------------------------------------------------------------------

HomePage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      <Head>
        <title> Trang chủ | Digital Store</title>
      </Head>

      <HomeView />
    </>
  );
}
