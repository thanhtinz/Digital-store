// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminMaintenanceView from '../../../sections/admin/AdminMaintenanceView';

// ----------------------------------------------------------------------

AdminMaintenancePage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminMaintenancePage() {
  return (
    <>
      <Head>
        <title> Bảo trì | Quản trị</title>
      </Head>
      <AdminMaintenanceView />
    </>
  );
}
