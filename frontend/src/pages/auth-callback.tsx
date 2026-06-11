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
// utils
import axiosInstance from '../utils/axios';
// components
import LoadingScreen from '../components/loading-screen';

// ----------------------------------------------------------------------

// Trang nhận token sau khi backend hoàn tất luồng OAuth (Google/GitHub/...).
// Backend redirect về: /auth-callback?token=<JWT>
// Cũng xử lý xác minh email: /auth-callback?verify=<token>
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { token, error, verify } = router.query;

    // Xác minh email
    if (verify && typeof verify === 'string') {
      axiosInstance
        .post('/api/auth/verify-email', { token: verify })
        .finally(() => router.replace(`${PATH_AUTH.login}?verified=1`));
      return;
    }

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
