// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminSupportView from '../../../sections/admin/AdminSupportView';

// ----------------------------------------------------------------------

AdminSupportPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminSupportPage() {
  return (
    <>
      <Head>
        <title> Hỗ trợ & Tài chính | Quản trị</title>
      </Head>

      <AdminSupportView />
    </>
  );
}
