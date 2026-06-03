// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import WishlistView from '../../sections/storefront/WishlistView';

// ----------------------------------------------------------------------

WishlistPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function WishlistPage() {
  return (
    <>
      <Head>
        <title> Yêu thích | Digital Store</title>
      </Head>

      <WishlistView />
    </>
  );
}
