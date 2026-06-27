// next
import Head from 'next/head';
// auth
import GuestGuard from '../../auth/GuestGuard';
// locales
import { useLocales } from '../../locales';
// sections
import Login from '../../sections/auth/Login';

// ----------------------------------------------------------------------

export default function LoginPage() {
  const { translate } = useLocales();

  return (
    <>
      <Head>
        {/* Hậu tố "| Tên site" do SiteHead tự ghép từ cấu hình admin (site_name). */}
        <title>{`${translate('auth.sign_in')}`}</title>
      </Head>

      <GuestGuard>
        <Login />
      </GuestGuard>
    </>
  );
}
