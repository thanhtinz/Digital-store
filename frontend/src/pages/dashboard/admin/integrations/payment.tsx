// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminPaymentView from '../../../../sections/admin/AdminPaymentView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Thanh toán | Quản trị</title></Head>
      <AdminPaymentView />
    </>
  );
}
