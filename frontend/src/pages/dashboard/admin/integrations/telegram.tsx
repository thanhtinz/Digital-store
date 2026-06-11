// next
import Head from 'next/head';
// layouts
import AdminLayout from '../../../../layouts/dashboard/AdminLayout';
// sections
import AdminTelegramView from '../../../../sections/admin/AdminTelegramView';

// ----------------------------------------------------------------------

Page.getLayout = (page: React.ReactElement) => <AdminLayout>{page}</AdminLayout>;

export default function Page() {
  return (
    <>
      <Head><title> Telegram | Quản trị</title></Head>
      <AdminTelegramView />
    </>
  );
}
