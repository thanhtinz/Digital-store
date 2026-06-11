// next
import NextLink from 'next/link';
// @mui
import { Stack, Typography, Link } from '@mui/material';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// locales
import { useLocales } from '../../locales';
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
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`auth.${k}`)}`;
  const siteName = settings.site_name || 'Digital Store';

  return (
    <LoginLayout title={settings.site_description || `${t('welcome_to')} ${siteName}`}>
      <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
        <Typography variant="h4">{t('register_title')}</Typography>

        <Stack direction="row" spacing={0.5}>
          <Typography variant="body2"> {t('have_account')} </Typography>

          <Link component={NextLink} href={PATH_AUTH.login} variant="subtitle2">
            {t('sign_in')}
          </Link>
        </Stack>
      </Stack>

      <AuthRegisterForm />

      <Typography
        component="div"
        sx={{ color: 'text.secondary', mt: 3, typography: 'caption', textAlign: 'center' }}
      >
        {`${t('agree_1')} `}
        <Link underline="always" color="text.primary">
          {t('terms')}
        </Link>
        {` ${t('and')} `}
        <Link underline="always" color="text.primary">
          {t('privacy')}
        </Link>
        .
      </Typography>

      <AuthWithSocial />
    </LoginLayout>
  );
}
