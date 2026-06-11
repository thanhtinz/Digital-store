// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import MyDownloadsView from '../../sections/storefront/MyDownloadsView';

// ----------------------------------------------------------------------

DownloadsPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function DownloadsPage() {
  return (
    <>
      <Head>
        <title> Tải xuống của tôi | Digital Store</title>
      </Head>

      <MyDownloadsView />
    </>
  );
}
