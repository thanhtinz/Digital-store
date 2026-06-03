// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import CardChargeView from '../../../sections/storefront/CardChargeView';

// ----------------------------------------------------------------------

CardChargePage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function CardChargePage() {
  return (
    <>
      <Head>
        <title> Nạp thẻ cào | Digital Store</title>
      </Head>

      <CardChargeView />
    </>
  );
}
