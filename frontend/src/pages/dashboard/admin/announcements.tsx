// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminAnnouncementsView from '../../../sections/admin/AdminAnnouncementsView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Thông báo | Quản trị</title></Head>
      <AdminAnnouncementsView />
    </>
  );
}
