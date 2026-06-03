// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// sections
import AdminOverviewView from '../../../sections/admin/AdminOverviewView';

// ----------------------------------------------------------------------

AdminPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function AdminPage() {
  return (
    <>
      <Head>
        <title> Quản trị | Digital Store</title>
      </Head>

      <AdminOverviewView />
    </>
  );
}
