// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminQuestionsView from '../../../sections/admin/AdminQuestionsView';

// ----------------------------------------------------------------------

AdminQuestionsPage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function AdminQuestionsPage() {
  return (
    <>
      <Head>
        <title> Hỏi & Đáp | Quản trị</title>
      </Head>
      <AdminQuestionsView />
    </>
  );
}
