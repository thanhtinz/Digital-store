// next
import Head from 'next/head';
// auth
import GuestGuard from '../../auth/GuestGuard';
// locales
import { useLocales } from '../../locales';
// sections
import Register from '../../sections/auth/Register';

// ----------------------------------------------------------------------

export default function RegisterPage() {
  const { translate } = useLocales();

  return (
    <>
      <Head>
        {/* Hậu tố "| Tên site" do SiteHead tự ghép từ cấu hình admin (site_name). */}
        <title>{`${translate('auth.create_account')}`}</title>
      </Head>

      <GuestGuard>
        <Register />
      </GuestGuard>
    </>
  );
}
