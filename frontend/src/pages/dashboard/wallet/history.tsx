// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import WalletHistoryView from '../../../sections/storefront/WalletHistoryView';

// ----------------------------------------------------------------------

WalletHistoryPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function WalletHistoryPage() {
  return (
    <>
      <Head>
        <title> Lịch sử ví | Digital Store</title>
      </Head>

      <WalletHistoryView />
    </>
  );
}
