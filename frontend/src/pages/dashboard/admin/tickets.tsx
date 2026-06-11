// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminTicketsView from '../../../sections/admin/AdminTicketsView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Ticket hỗ trợ | Quản trị</title></Head>
      <AdminTicketsView />
    </>
  );
}
