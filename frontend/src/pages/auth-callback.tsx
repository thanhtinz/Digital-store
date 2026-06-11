import { useEffect } from 'react';
// next
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Stack } from '@mui/material';
// auth
import { setSession } from '../auth/utils';
// config
import { PATH_AFTER_LOGIN } from '../config-global';
// routes
import { PATH_AUTH } from '../routes/paths';
// components
import LoadingScreen from '../components/loading-screen';

// ----------------------------------------------------------------------

// Trang nhận token sau khi backend hoàn tất luồng OAuth (Google/GitHub/...).
// Backend redirect về: /auth-callback?token=<JWT>
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { token, error } = router.query;

    if (error || !token || typeof token !== 'string') {
      router.replace(`${PATH_AUTH.login}?error=oauth_failed`);
      return;
    }

    try {
      setSession(token);
      // reload toàn trang để AuthProvider khởi tạo lại với token mới.
      window.location.href = PATH_AFTER_LOGIN;
    } catch (e) {
      router.replace(`${PATH_AUTH.login}?error=oauth_failed`);
    }
  }, [router]);

  return (
    <>
      <Head>
        <title> Đang đăng nhập... | Digital Store</title>
      </Head>

      <Stack sx={{ height: '100vh' }}>
        <LoadingScreen />
      </Stack>
    </>
  );
}
