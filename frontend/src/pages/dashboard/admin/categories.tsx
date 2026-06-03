// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminCategoriesView from '../../../sections/admin/AdminCategoriesView';

// ----------------------------------------------------------------------

AdminCategoriesPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminCategoriesPage() {
  return (
    <>
      <Head>
        <title> Danh mục | Quản trị</title>
      </Head>

      <AdminCategoriesView />
    </>
  );
}
