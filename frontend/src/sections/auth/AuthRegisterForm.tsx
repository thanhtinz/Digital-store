import { useState } from 'react';
import * as Yup from 'yup';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { Stack, IconButton, InputAdornment, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// locales
import { useLocales } from '../../locales';
// components
import Iconify from '../../components/iconify';
import FormProvider, { RHFTextField } from '../../components/hook-form';

// ----------------------------------------------------------------------

type FormValuesProps = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  afterSubmit?: string;
};

export default function AuthRegisterForm() {
  const { register } = useAuthContext();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`auth.${k}`)}`;

  const [showPassword, setShowPassword] = useState(false);

  const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().required(t('first_name_required')),
    lastName: Yup.string().required(t('last_name_required')),
    email: Yup.string().required(t('email_required')).email(t('email_invalid')),
    password: Yup.string().required(t('password_required')),
  });

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(RegisterSchema),
    defaultValues,
  });

  const {
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = methods;

  const onSubmit = async (data: FormValuesProps) => {
    try {
      if (register) {
        await register(data.email, data.password, data.firstName, data.lastName);
      }
    } catch (error: any) {
      console.error(error);
      reset();
      // axios interceptor reject bằng response.data ({ detail }) hoặc chuỗi -> KHÔNG có .message.
      // Lấy đúng nội dung để Alert không bị trống (chỉ hiện icon).
      setError('afterSubmit', {
        type: 'manual',
        message:
          error?.detail ||
          error?.message ||
          (typeof error === 'string' ? error : '') ||
          t('register_failed'),
      });
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2.5}>
        {!!errors.afterSubmit && <Alert severity="error">{errors.afterSubmit.message}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RHFTextField name="firstName" label={t('first_name')} />
          <RHFTextField name="lastName" label={t('last_name')} />
        </Stack>

        <RHFTextField name="email" label={t('email')} />

        <RHFTextField
          name="password"
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <LoadingButton
          fullWidth
          color="inherit"
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting || isSubmitSuccessful}
          sx={{
            bgcolor: 'text.primary',
            color: (theme) => (theme.palette.mode === 'light' ? 'common.white' : 'grey.800'),
            '&:hover': {
              bgcolor: 'text.primary',
              color: (theme) => (theme.palette.mode === 'light' ? 'common.white' : 'grey.800'),
            },
          }}
        >
          {t('create_account_btn')}
        </LoadingButton>
      </Stack>
    </FormProvider>
  );
}
