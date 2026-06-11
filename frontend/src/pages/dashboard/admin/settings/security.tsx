// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminSecuritySettingsView from '../../../../sections/admin/AdminSecuritySettingsView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Bảo mật | Quản trị</title></Head>
      <AdminSecuritySettingsView />
    </>
  );
}
