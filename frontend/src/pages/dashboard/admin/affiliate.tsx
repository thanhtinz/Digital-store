// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../layouts/dashboard/AdminLayout';
// sections
import AdminAffiliateView from '../../../sections/admin/AdminAffiliateView';

// ----------------------------------------------------------------------

AdminAffiliatePage.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

// ----------------------------------------------------------------------

export default function AdminAffiliatePage() {
  return (
    <>
      <Head>
        <title> Giới thiệu bạn bè | Quản trị</title>
      </Head>

      <AdminAffiliateView />
    </>
  );
}
