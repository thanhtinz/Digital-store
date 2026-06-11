// next
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
// @mui
import { Link, Typography } from '@mui/material';
// routes
import { PATH_AUTH } from '../../routes/paths';
// locales
import { useLocales } from '../../locales';
// layouts
import CompactLayout from '../../layouts/compact';
// components
import Iconify from '../../components/iconify';
// sections
import AuthResetPasswordForm from '../../sections/auth/AuthResetPasswordForm';
// assets
import { PasswordIcon } from '../../assets/icons';

// ----------------------------------------------------------------------

ResetPasswordPage.getLayout = (page: React.ReactElement) => <CompactLayout>{page}</CompactLayout>;

// ----------------------------------------------------------------------

export default function ResetPasswordPage() {
  const router = useRouter();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`auth.${k}`)}`;
  const hasToken = typeof router.query.token === 'string' && !!router.query.token;

  return (
    <>
      <Head>
        <title> {hasToken ? t('reset_title') : t('forgot_title')} | Digital Store</title>
      </Head>

      <PasswordIcon sx={{ mb: 5, height: 96 }} />

      <Typography variant="h3" paragraph>
        {hasToken ? t('reset_title') : t('forgot_title')}
      </Typography>

      <Typography sx={{ color: 'text.secondary', mb: 5 }}>
        {hasToken ? t('reset_desc') : t('forgot_desc')}
      </Typography>

      <AuthResetPasswordForm />

      <Link
        component={NextLink}
        href={PATH_AUTH.login}
        color="inherit"
        variant="subtitle2"
        sx={{
          mt: 3,
          mx: 'auto',
          alignItems: 'center',
          display: 'inline-flex',
        }}
      >
        <Iconify icon="eva:chevron-left-fill" width={16} />
        {t('return_signin')}
      </Link>
    </>
  );
}
