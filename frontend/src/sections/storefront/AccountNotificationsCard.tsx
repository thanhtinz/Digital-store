import { useEffect, useState } from 'react';
// @mui
import { Alert, Box, Button, Card, Stack, Switch, Typography } from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// utils
import axiosInstance from '../../utils/axios';
import { enablePush, disablePush, isPushEnabled, pushSupported } from '../../utils/push';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

export default function AccountNotificationsCard() {
  const { user } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const emailVerified = (user as any)?.email_verified;

  useEffect(() => {
    isPushEnabled().then(setPushOn);
  }, []);

  const togglePush = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        const r = await enablePush();
        if (r.ok) { setPushOn(true); enqueueSnackbar('Đã bật thông báo đẩy'); }
        else enqueueSnackbar(r.error || 'Không thể bật', { variant: 'error' });
      } else {
        await disablePush();
        setPushOn(false);
        enqueueSnackbar('Đã tắt thông báo đẩy');
      }
    } finally {
      setBusy(false);
    }
  };

  const resendVerify = async () => {
    setResending(true);
    try {
      await axiosInstance.post('/api/auth/resend-verification');
      enqueueSnackbar('Đã gửi lại email xác minh');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Gửi thất bại', { variant: 'error' });
    } finally {
      setResending(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Thông báo</Typography>

      {emailVerified === false && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={resendVerify} disabled={resending}>
              Gửi lại
            </Button>
          }
        >
          Email của bạn chưa được xác minh.
        </Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Iconify icon="solar:bell-bing-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2">Thông báo đẩy trên trình duyệt</Typography>
          <Typography variant="caption" color="text.secondary">
            Nhận thông báo flash sale, đơn hàng, hàng về ngay cả khi không mở web.
          </Typography>
        </Box>
        <Switch
          checked={pushOn}
          disabled={busy || !pushSupported()}
          onChange={(e) => togglePush(e.target.checked)}
        />
      </Stack>
      {!pushSupported() && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          Trình duyệt hiện tại không hỗ trợ thông báo đẩy.
        </Typography>
      )}
    </Card>
  );
}
