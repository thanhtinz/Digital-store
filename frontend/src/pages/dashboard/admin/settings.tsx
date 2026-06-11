// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminGeneralSettingsView from '../../../sections/admin/AdminGeneralSettingsView';

// ----------------------------------------------------------------------

AdminSettingsPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminSettingsPage() {
  return (
    <>
      <Head><title> Thông tin chung | Quản trị</title></Head>
      <AdminGeneralSettingsView />
    </>
  );
}
