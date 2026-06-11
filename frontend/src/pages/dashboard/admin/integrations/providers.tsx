// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminProvidersView from '../../../../sections/admin/AdminProvidersView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Nguồn cung cấp | Quản trị</title></Head>
      <AdminProvidersView />
    </>
  );
}
