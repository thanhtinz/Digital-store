// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminIntegrationsView from '../../../sections/admin/AdminIntegrationsView';

// ----------------------------------------------------------------------

AdminIntegrationsPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminIntegrationsPage() {
  return (
    <>
      <Head>
        <title> Tích hợp | Quản trị</title>
      </Head>

      <AdminIntegrationsView />
    </>
  );
}
