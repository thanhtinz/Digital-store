// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import SmmServicesView from '../../../sections/storefront/smm/SmmServicesView';

// ----------------------------------------------------------------------

SmmServicesPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

export default function SmmServicesPage() {
  return (
    <>
      <Head>
        <title> Danh sách dịch vụ | Digital Store</title>
      </Head>
      <SmmServicesView />
    </>
  );
}
