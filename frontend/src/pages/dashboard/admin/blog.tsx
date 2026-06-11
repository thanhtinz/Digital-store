// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminBlogView from '../../../sections/admin/AdminBlogView';

// ----------------------------------------------------------------------

AdminBlogPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminBlogPage() {
  return (
    <>
      <Head>
        <title> Blog | Quản trị</title>
      </Head>

      <AdminBlogView />
    </>
  );
}
