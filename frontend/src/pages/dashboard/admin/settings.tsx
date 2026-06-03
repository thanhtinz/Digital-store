// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminSettingsView from '../../../sections/admin/AdminSettingsView';

// ----------------------------------------------------------------------

AdminSettingsPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

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
