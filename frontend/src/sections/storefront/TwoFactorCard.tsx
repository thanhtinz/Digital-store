import { useEffect, useState } from 'react';
// @mui
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// locales
import { useLocales } from '../../locales';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import Image from '../../components/image';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Thẻ bật/tắt xác thực 2 bước (2FA) cho trang tài khoản.
// ----------------------------------------------------------------------

export default function TwoFactorCard() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`account_page.${k}`)}`;
  const { enqueueSnackbar } = useSnackbar();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = () => {
    axiosInstance
      .get('/api/auth/me')
      .then((r) => setEnabled(!!r.data?.two_factor_enabled))
      .catch(() => setEnabled(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const r = await axiosInstance.get('/api/auth/2fa/setup');
      setSetup({ secret: r.data?.secret, qr: r.data?.qr_code });
      setCode('');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Error', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!setup) return;
    setBusy(true);
    try {
      await axiosInstance.post('/api/auth/2fa/verify', { secret: setup.secret, code: code.trim() });
      enqueueSnackbar(t('twofa_enabled_ok'));
      setSetup(null);
      setEnabled(true);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || t('twofa_failed'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await axiosInstance.post('/api/auth/2fa/disable');
      enqueueSnackbar(t('twofa_disabled_ok'));
      setEnabled(false);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Error', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:shield-keyhole-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1">{t('twofa_title')}</Typography>
        </Stack>
        <Label color={enabled ? 'success' : 'default'} variant="soft">
          {enabled ? t('twofa_on') : t('twofa_off')}
        </Label>
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {t('twofa_desc')}
      </Typography>

      {/* Đang bật setup */}
      {setup ? (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="body2">{t('twofa_scan')}</Typography>
          {setup.qr && (
            <Image src={setup.qr} sx={{ width: 168, height: 168, borderRadius: 1, bgcolor: 'common.white', p: 1 }} />
          )}
          <Box sx={{ typography: 'caption', color: 'text.disabled', wordBreak: 'break-all' }}>
            {setup.secret}
          </Box>
          <TextField
            label={t('twofa_code')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ inputMode: 'numeric' }}
            size="small"
          />
          <Stack direction="row" spacing={1.5}>
            <LoadingButton variant="contained" loading={busy} disabled={code.length < 6} onClick={verify}>
              {t('twofa_verify')}
            </LoadingButton>
            <Button color="inherit" onClick={() => setSetup(null)}>
              {t('twofa_cancel')}
            </Button>
          </Stack>
        </Stack>
      ) : enabled ? (
        <LoadingButton color="error" variant="outlined" loading={busy} onClick={disable} startIcon={<Iconify icon="solar:lock-unlocked-bold" />}>
          {t('twofa_disable')}
        </LoadingButton>
      ) : (
        <LoadingButton variant="contained" loading={busy} onClick={startSetup} startIcon={<Iconify icon="solar:lock-bold" />}>
          {t('twofa_enable')}
        </LoadingButton>
      )}
    </Card>
  );
}
