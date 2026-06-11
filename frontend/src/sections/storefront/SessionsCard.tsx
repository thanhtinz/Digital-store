import { useEffect, useState } from 'react';
// @mui
import { Box, Button, Card, Divider, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

function deviceLabel(ua?: string): string {
  if (!ua) return 'Thiết bị không xác định';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Điện thoại';
  if (/iPad|Tablet/i.test(ua)) return 'Máy tính bảng';
  let os = 'Máy tính';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let browser = '';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  return `${os}${browser ? ' · ' + browser : ''}`;
}

export default function SessionsCard() {
  const { enqueueSnackbar } = useSnackbar();
  const [sessions, setSessions] = useState<any[]>([]);

  const load = () => {
    axiosInstance.get('/api/auth/sessions').then((r) => setSessions(r.data?.sessions || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id: number) => {
    try {
      await axiosInstance.post(`/api/auth/sessions/${id}/revoke`);
      enqueueSnackbar('Đã đăng xuất thiết bị');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    }
  };

  const revokeOthers = async () => {
    try {
      await axiosInstance.post('/api/auth/sessions/revoke-others');
      enqueueSnackbar('Đã đăng xuất các thiết bị khác');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Phiên đăng nhập</Typography>
        {sessions.length > 1 && (
          <Button size="small" color="error" onClick={revokeOthers}>
            Đăng xuất thiết bị khác
          </Button>
        )}
      </Stack>

      {sessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Không có phiên nào.</Typography>
      ) : (
        <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={2}>
          {sessions.map((s) => (
            <Stack key={s.id} direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Iconify icon="solar:devices-bold-duotone" width={28} sx={{ color: 'text.secondary' }} />
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" noWrap>{deviceLabel(s.user_agent)}</Typography>
                    {s.current && <Label color="success">Hiện tại</Label>}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {s.ip_address || ''} · {new Date(s.last_seen_at).toLocaleString('vi-VN')}
                  </Typography>
                </Box>
              </Stack>
              {!s.current && (
                <Button size="small" color="error" variant="outlined" onClick={() => revoke(s.id)}>
                  Đăng xuất
                </Button>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Card>
  );
}
