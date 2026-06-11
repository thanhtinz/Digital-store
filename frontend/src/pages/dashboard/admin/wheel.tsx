// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminWheelView from '../../../sections/admin/AdminWheelView';

// ----------------------------------------------------------------------

AdminWheelPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminWheelPage() {
  return (
    <>
      <Head>
        <title> Vòng quay | Quản trị</title>
      </Head>
      <AdminWheelView />
    </>
  );
}
