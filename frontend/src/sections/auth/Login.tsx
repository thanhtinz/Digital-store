// next
import NextLink from 'next/link';
// @mui
import { Tooltip, Stack, Typography, Link, Box } from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// locales
import { useLocales } from '../../locales';
// layouts
import LoginLayout from '../../layouts/login';
// routes
import { PATH_AUTH } from '../../routes/paths';
//
import AuthLoginForm from './AuthLoginForm';
import AuthWithSocial from './AuthWithSocial';

// ----------------------------------------------------------------------

export default function Login() {
  const { method } = useAuthContext();
  const settings = useSiteSettings();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`auth.${k}`)}`;
  const siteName = settings.site_name || 'Digital Store';

  return (
    <LoginLayout>
      <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
        <Typography variant="h4">{`${t('sign_in')} ${siteName}`}</Typography>

        <Stack direction="row" spacing={0.5}>
          <Typography variant="body2">{t('no_account')}</Typography>

          <Link component={NextLink} href={PATH_AUTH.register} variant="subtitle2">
            {t('create_account')}
          </Link>
        </Stack>

        <Tooltip title={method} placement="left">
          <Box
            component="img"
            alt={method}
            src={`/assets/icons/auth/ic_${method}.png`}
            sx={{ width: 32, height: 32, position: 'absolute', right: 0 }}
          />
        </Tooltip>
      </Stack>

      <AuthLoginForm />

      <AuthWithSocial />
    </LoginLayout>
  );
}
