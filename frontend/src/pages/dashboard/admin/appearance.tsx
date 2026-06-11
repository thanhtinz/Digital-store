// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminAppearanceView from '../../../sections/admin/AdminAppearanceView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Giao diện & Hiệu ứng | Quản trị</title></Head>
      <AdminAppearanceView />
    </>
  );
}
