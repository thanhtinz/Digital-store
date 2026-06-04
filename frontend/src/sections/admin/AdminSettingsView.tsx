import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Alert, AlertTitle, Box, Button, Card, CardHeader, CircularProgress, Container, Link, Stack, TextField, Typography } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Các trường cấu hình chung (key trùng với siteConfig backend).
const FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
  { key: 'site_name', label: 'Tên cửa hàng' },
  { key: 'site_logo', label: 'Logo (URL ảnh)', help: 'Hiển thị ở header/sidebar. Để trống dùng logo mặc định.' },
  { key: 'site_banner', label: 'Banner trang chủ (URL ảnh)' },
  { key: 'site_description', label: 'Mô tả', multiline: true },
  { key: 'currency', label: 'Đơn vị tiền tệ', help: 'Ví dụ: VND, USD.' },
  { key: 'tax_rate', label: 'Thuế VAT (%)', help: 'Ví dụ 8 = 8%.' },
  { key: 'contact_email', label: 'Email liên hệ' },
  { key: 'hotline', label: 'Hotline' },
  { key: 'zalo', label: 'Zalo (URL/SĐT)' },
  { key: 'facebook', label: 'Facebook (URL)' },
  { key: 'instagram', label: 'Instagram (URL)' },
  { key: 'youtube', label: 'YouTube (URL)' },
  { key: 'tiktok', label: 'TikTok (URL)' },
  { key: 'telegram', label: 'Telegram (URL)' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'working_hours', label: 'Giờ làm việc' },
  { key: 'footer_about', label: 'Giới thiệu ở Footer', multiline: true },
  { key: 'copyright_text', label: 'Dòng bản quyền (Footer)' },
];

// ── Mã nguồn / Theme: kết nối Google Drive (service account) ──
const DRIVE_FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
  {
    key: 'google_service_account_json',
    label: 'Service Account JSON',
    help: 'Dán toàn bộ nội dung file JSON của service account.',
    multiline: true,
  },
  { key: 'source_drive_folder_id', label: 'Folder ID (tuỳ chọn)', help: 'ID folder gốc chứa mã nguồn (để tham chiếu).' },
  { key: 'source_download_expiry_minutes', label: 'Link tải hết hạn sau (phút)', help: 'Mặc định 60. Link tải dùng một lần và hết hạn sau số phút này.' },
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
      const keys = [...FIELDS, ...DRIVE_FIELDS].map((f) => f.key);
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
                title="Mã nguồn / Theme — Google Drive"
                subheader="File mã nguồn được lưu trên Drive và stream qua server (ẩn link thật)."
              />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Alert severity="info">
                  <AlertTitle>Cách lấy Service Account & liên kết Drive</AlertTitle>
                  1. Vào <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</Link> → tạo project.<br />
                  2. <b>APIs &amp; Services → Library</b> → bật <b>Google Drive API</b>.<br />
                  3. <b>APIs &amp; Services → Credentials → Create credentials → Service account</b> → tạo xong vào tab <b>Keys → Add key → JSON</b> để tải file JSON.<br />
                  4. Mở file JSON, dán toàn bộ nội dung vào ô bên dưới.<br />
                  5. Mở email <code>client_email</code> trong JSON, rồi <b>chia sẻ folder Drive</b> chứa file mã nguồn cho email đó (quyền Viewer).<br />
                  6. Trong sản phẩm mã nguồn → tab <b>Phiên bản</b>, dán <b>File ID</b> của từng file (lấy từ URL Drive).
                </Alert>
                {DRIVE_FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    helperText={f.help}
                    multiline={f.multiline}
                    minRows={f.multiline ? 4 : undefined}
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ))}
              </Stack>
            </Card>

            <Alert severity="info">
              Cấu hình <b>Cổng thanh toán (SePay)</b>, <b>Email/SMTP</b>, <b>Telegram</b>, <b>OAuth</b> và{' '}
              <b>Nguồn cung cấp</b> nằm ở trang{' '}
              <Link component={NextLink} href={PATH_DASHBOARD.admin.integrations}>
                Tích hợp
              </Link>
              .
            </Alert>

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
