// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminSourceSettingsView from '../../../../sections/admin/AdminSourceSettingsView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Mã nguồn | Quản trị</title></Head>
      <AdminSourceSettingsView />
    </>
  );
}
