// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import BundlesView from '../../../sections/storefront/BundlesView';

// ----------------------------------------------------------------------

BundlesPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function BundlesPage() {
  return (
    <>
      <Head>
        <title> Gói combo | Digital Store</title>
      </Head>

      <BundlesView />
    </>
  );
}
