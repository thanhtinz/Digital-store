// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminOAuthView from '../../../../sections/admin/AdminOAuthView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> OAuth | Quản trị</title></Head>
      <AdminOAuthView />
    </>
  );
}
