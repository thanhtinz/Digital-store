import { useEffect, useState } from 'react';
// @mui
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Các trường cấu hình hiển thị trong form (key trùng với siteConfig backend).
const FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
  { key: 'site_name', label: 'Tên cửa hàng' },
  { key: 'site_logo', label: 'Logo (URL ảnh)', help: 'Hiển thị ở header/sidebar. Để trống dùng logo mặc định.' },
  { key: 'site_description', label: 'Mô tả', multiline: true },
  { key: 'tax_rate', label: 'Thuế VAT (%)', help: 'Ví dụ 8 = 8%.' },
];

const SEPAY_FIELDS: { key: string; label: string; help?: string }[] = [
  { key: 'sepay_account_number', label: 'Số tài khoản nhận' },
  { key: 'sepay_bank_code', label: 'Mã ngân hàng (BIN/VietQR)', help: 'Ví dụ: MBBank, VCB, ACB...' },
];

export default function AdminSettingsView() {
  const { enqueueSnackbar } = useSnackbar();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/admin/settings')
      .then((r) => setValues(r.data || {}))
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được cấu hình', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [enqueueSnackbar]);

  const set = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Chỉ gửi các key có trong form để tránh ghi đè cấu hình khác.
      const keys = [...FIELDS, ...SEPAY_FIELDS].map((f) => f.key);
      const payload = Object.fromEntries(keys.map((k) => [k, values[k] ?? '']));
      await axiosInstance.patch('/api/admin/settings', payload);
      enqueueSnackbar('Đã lưu cấu hình');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          Cài đặt cửa hàng
        </Typography>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Card>
              <CardHeader title="Thông tin chung" />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                {FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    helperText={f.help}
                    multiline={f.multiline}
                    minRows={f.multiline ? 2 : undefined}
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ))}
              </Stack>
            </Card>

            <Card>
              <CardHeader
                title="Cổng nạp tiền (SePay / VietQR)"
                subheader="Cấu hình tài khoản nhận để hiện QR ở trang nạp tiền."
              />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Alert severity="info">
                  Cần điền đủ <b>Số tài khoản</b> và <b>Mã ngân hàng</b> thì QR nạp tiền mới hiển thị.
                </Alert>
                {SEPAY_FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    helperText={f.help}
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ))}
              </Stack>
            </Card>

            <Box sx={{ textAlign: 'right' }}>
              <Button
                size="large"
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              >
                Lưu cấu hình
              </Button>
            </Box>
          </Stack>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
