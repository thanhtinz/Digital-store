import { useState } from 'react';
// @mui
import { Box, Button, Card, CardHeader, CircularProgress, Container, Stack, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings from './useAdminSettings';

// ----------------------------------------------------------------------

const KEYS = [
  'notfound_title', 'notfound_message', 'notfound_image',
  'redirect_title', 'redirect_message', 'redirect_warning', 'redirect_seconds',
  'loading_image',
];

export default function AdminCustomPagesView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();
  const { enqueueSnackbar } = useSnackbar();
  const [uploading, setUploading] = useState(false);

  // Tải GIF/ảnh loading lên (giữ animation -> webp động) rồi lưu URL.
  const uploadLoading = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const r = await axiosInstance.post('/api/banners/admin/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data?.url || (r.data?.id ? `/api/images/${r.data.id}` : '');
      if (url) {
        set('loading_image', url);
        await saveConfig(['loading_image']);
      }
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Tải ảnh thất bại', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Trang tuỳ chỉnh" />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 720 }}>
            <Card>
              <CardHeader title="Ảnh loading toàn site" subheader="Hiển thị ở màn hình loading khi chuyển trang. Hỗ trợ GIF (giữ chuyển động)." />
              <Stack spacing={2.5} sx={{ p: 3 }} alignItems="flex-start">
                <Box
                  sx={{
                    width: 160, height: 160, borderRadius: 2, border: (t) => `1px dashed ${t.palette.divider}`,
                    bgcolor: 'background.neutral', display: 'grid', placeItems: 'center', overflow: 'hidden',
                  }}
                >
                  {values.loading_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={values.loading_image} alt="loading" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  ) : (
                    <Iconify icon="solar:gallery-bold" width={40} sx={{ color: 'text.disabled' }} />
                  )}
                </Box>
                <Stack direction="row" spacing={1}>
                  <LoadingButton component="label" variant="contained" loading={uploading} startIcon={<Iconify icon="solar:upload-bold" />}>
                    Tải ảnh/GIF lên
                    <input hidden type="file" accept="image/*,image/gif" onChange={(e) => e.target.files?.[0] && uploadLoading(e.target.files[0])} />
                  </LoadingButton>
                  {values.loading_image && (
                    <Button color="error" onClick={async () => { set('loading_image', ''); await saveConfig(['loading_image']); }}>
                      Xoá
                    </Button>
                  )}
                </Stack>
                <TextField fullWidth label="Hoặc dán URL ảnh loading" value={values.loading_image ?? ''} onChange={(e) => set('loading_image', e.target.value)} />
              </Stack>
            </Card>

            <Card>
              <CardHeader title="Trang 404 (không tìm thấy)" subheader="Để trống sẽ dùng nội dung mặc định (đã dịch theo ngôn ngữ)." />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <TextField label="Tiêu đề" placeholder="Rất tiếc, không tìm thấy trang!" value={values.notfound_title ?? ''} onChange={(e) => set('notfound_title', e.target.value)} />
                <TextField label="Nội dung" multiline minRows={2} value={values.notfound_message ?? ''} onChange={(e) => set('notfound_message', e.target.value)} />
                <TextField label="Ảnh minh hoạ (URL)" placeholder="Để trống dùng ảnh mặc định" value={values.notfound_image ?? ''} onChange={(e) => set('notfound_image', e.target.value)} />
              </Stack>
            </Card>

            <Card>
              <CardHeader title="Trang chuyển hướng link ngoài" subheader="Hiện khi khách bấm vào link dẫn ra ngoài website." />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <TextField label="Tiêu đề" placeholder="Bạn sắp rời khỏi website" value={values.redirect_title ?? ''} onChange={(e) => set('redirect_title', e.target.value)} />
                <TextField label="Nội dung" multiline minRows={2} value={values.redirect_message ?? ''} onChange={(e) => set('redirect_message', e.target.value)} />
                <TextField label="Cảnh báo an toàn" multiline minRows={2} value={values.redirect_warning ?? ''} onChange={(e) => set('redirect_warning', e.target.value)} />
                <TextField type="number" label="Đếm ngược (giây)" helperText="Mặc định 5" value={values.redirect_seconds ?? ''} onChange={(e) => set('redirect_seconds', e.target.value)} />
              </Stack>
            </Card>

            <Box>
              <LoadingButton variant="contained" size="large" loading={saving} onClick={() => saveConfig(KEYS)}>
                Lưu cấu hình
              </LoadingButton>
            </Box>
          </Stack>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
