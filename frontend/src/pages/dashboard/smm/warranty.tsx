// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import SmmWarrantyView from '../../../sections/storefront/smm/SmmWarrantyView';

// ----------------------------------------------------------------------

SmmWarrantyPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function SmmWarrantyPage() {
  return (
    <>
      <Head>
        <title> Bảo hành dịch vụ | Digital Store</title>
      </Head>
      <SmmWarrantyView />
    </>
  );
}
