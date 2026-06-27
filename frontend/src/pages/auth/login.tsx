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
        <title> {`${translate('auth.sign_in')}`} | Digital Store</title>
      </Head>

      <GuestGuard>
        <Login />
      </GuestGuard>
    </>
  );
}
