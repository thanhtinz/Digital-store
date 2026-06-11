// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminGiftCodesView from '../../../sections/admin/AdminGiftCodesView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Mã giảm giá | Quản trị</title></Head>
      <AdminGiftCodesView />
    </>
  );
}
