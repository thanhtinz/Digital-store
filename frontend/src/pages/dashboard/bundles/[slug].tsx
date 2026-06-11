// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import BundleDetailView from '../../../sections/storefront/BundleDetailView';

// ----------------------------------------------------------------------

BundleDetailPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function BundleDetailPage() {
  return (
    <>
      <Head>
        <title> Chi tiết combo | Digital Store</title>
      </Head>

      <BundleDetailView />
    </>
  );
}
