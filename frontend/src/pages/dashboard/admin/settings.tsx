// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import AdminSettingsView from '../../../sections/admin/AdminSettingsView';

// ----------------------------------------------------------------------

AdminSettingsPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function AdminSettingsPage() {
  return (
    <>
      <Head>
        <title> Cài đặt | Digital Store</title>
      </Head>

      <AdminSettingsView />
    </>
  );
}
