// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminOverviewView from '../../../sections/admin/AdminOverviewView';

// ----------------------------------------------------------------------

AdminPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

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
