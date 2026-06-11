import { useState } from 'react';
import * as Yup from 'yup';
// next
import { useRouter } from 'next/router';
// form
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
// @mui
import { Alert, Stack } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// routes
import { PATH_AUTH } from '../../routes/paths';
// locales
import { useLocales } from '../../locales';
// utils
import axios from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';
import FormProvider, { RHFTextField } from '../../components/hook-form';

// ----------------------------------------------------------------------
// Quên mật khẩu (dùng backend):
//  - Không có ?token → nhập email → POST /api/auth/forgot-password (gửi link qua email)
//  - Có ?token (mở từ link trong email) → nhập mật khẩu mới → POST /api/auth/reset-password
// ----------------------------------------------------------------------

export default function AuthResetPasswordForm() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`auth.${k}`)}`;

  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [sent, setSent] = useState(false);

  // ── Chế độ đặt mật khẩu mới (có token) ──
  if (token) {
    return <NewPasswordForm token={token} t={t} />;
  }

  // ── Chế độ gửi email khôi phục ──
  const ForgotSchema = Yup.object().shape({
    email: Yup.string().required(t('email_required')).email(t('email_invalid')),
  });
  const methods = useForm({ resolver: yupResolver(ForgotSchema), defaultValues: { email: '' } });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data: { email: string }) => {
    try {
      await axios.post('/api/auth/forgot-password', { email: data.email });
      setSent(true);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || t('forgot_failed'), { variant: 'error' });
    }
  };

  if (sent) {
    return <Alert severity="success">{t('email_sent')}</Alert>;
  }

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <RHFTextField name="email" label={t('email')} />

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        sx={{ mt: 3 }}
      >
        {t('send_request')}
      </LoadingButton>
    </FormProvider>
  );
}

// ----------------------------------------------------------------------

function NewPasswordForm({ token, t }: { token: string; t: (k: string) => string }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const Schema = Yup.object().shape({
    password: Yup.string().min(8, t('password_min_8')).required(t('new_password_required')),
    confirmPassword: Yup.string()
      .required(t('confirm_password_required'))
      .oneOf([Yup.ref('password'), null], t('passwords_must_match')),
  });
  const methods = useForm({
    resolver: yupResolver(Schema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data: { password: string }) => {
    try {
      await axios.post('/api/auth/reset-password', { token, new_password: data.password });
      enqueueSnackbar(t('reset_success'));
      router.push(PATH_AUTH.login);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || t('reset_failed'), { variant: 'error' });
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <RHFTextField name="password" type="password" label={t('new_password')} />
        <RHFTextField name="confirmPassword" type="password" label={t('confirm_password')} />

        <LoadingButton fullWidth size="large" type="submit" variant="contained" loading={isSubmitting}>
          {t('update_password')}
        </LoadingButton>
      </Stack>
    </FormProvider>
  );
}
