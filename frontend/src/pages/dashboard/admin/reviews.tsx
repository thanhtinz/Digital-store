// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminReviewsView from '../../../sections/admin/AdminReviewsView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Đánh giá | Quản trị</title></Head>
      <AdminReviewsView />
    </>
  );
}
