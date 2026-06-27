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
        <title> {`${translate('auth.create_account')}`} | Digital Store</title>
      </Head>

      <GuestGuard>
        <Register />
      </GuestGuard>
    </>
  );
}
