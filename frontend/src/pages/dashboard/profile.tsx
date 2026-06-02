// next
import Head from 'next/head';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// sections
import ProfileView from '../../sections/storefront/ProfileView';

// ----------------------------------------------------------------------

ProfilePage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function ProfilePage() {
  return (
    <>
      <Head>
        <title> Tài khoản của tôi | Digital Store</title>
      </Head>

      <ProfileView />
    </>
  );
}
