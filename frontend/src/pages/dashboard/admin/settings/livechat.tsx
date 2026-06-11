// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminLivechatView from '../../../../sections/admin/AdminLivechatView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Live chat | Quản trị</title></Head>
      <AdminLivechatView />
    </>
  );
}
