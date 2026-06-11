// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import AffiliateView from '../../sections/storefront/AffiliateView';

// ----------------------------------------------------------------------

AffiliatePage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function AffiliatePage() {
  return (
    <>
      <Head>
        <title> Affiliate | Digital Store</title>
      </Head>

      <AffiliateView />
    </>
  );
}
