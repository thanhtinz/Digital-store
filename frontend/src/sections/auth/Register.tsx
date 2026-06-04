// next
import NextLink from 'next/link';
// @mui
import { Stack, Typography, Link } from '@mui/material';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// layouts
import LoginLayout from '../../layouts/login';
// routes
import { PATH_AUTH } from '../../routes/paths';
//
import AuthWithSocial from './AuthWithSocial';
import AuthRegisterForm from './AuthRegisterForm';

// ----------------------------------------------------------------------

export default function Register() {
  const settings = useSiteSettings();
  const siteName = settings.site_name || 'Digital Store';

  return (
    <LoginLayout title={settings.site_description || `Chào mừng đến với ${siteName}`}>
      <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
        <Typography variant="h4">Đăng ký tài khoản miễn phí.</Typography>

        <Stack direction="row" spacing={0.5}>
          <Typography variant="body2"> Đã có tài khoản? </Typography>

          <Link component={NextLink} href={PATH_AUTH.login} variant="subtitle2">
            Đăng nhập
          </Link>
        </Stack>
      </Stack>

      <AuthRegisterForm />

      <Typography
        component="div"
        sx={{ color: 'text.secondary', mt: 3, typography: 'caption', textAlign: 'center' }}
      >
        {'Khi đăng ký, tôi đồng ý với '}
        <Link underline="always" color="text.primary">
          Điều khoản dịch vụ
        </Link>
        {' và '}
        <Link underline="always" color="text.primary">
          Chính sách bảo mật
        </Link>
        .
      </Typography>

      <AuthWithSocial />
    </LoginLayout>
  );
}
