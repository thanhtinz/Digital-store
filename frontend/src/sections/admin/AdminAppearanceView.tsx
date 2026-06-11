import { useState } from 'react';
// @mui
import { Box, Button, Card, CardHeader, CircularProgress, Container, MenuItem, Stack, TextField } from '@mui/material';
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

const KEYS = ['click_effect', 'season_effect', 'nav_bg_image'];

const CLICK_EFFECTS = [
  { value: '', label: 'Tắt' },
  { value: 'hearts', label: 'Trái tim ❤️' },
  { value: 'sparkles', label: 'Lấp lánh ✨' },
  { value: 'stars', label: 'Ngôi sao ⭐' },
  { value: 'flowers', label: 'Hoa 🌸' },
  { value: 'bubbles', label: 'Bong bóng 🫧' },
  { value: 'snowflake', label: 'Bông tuyết ❄️' },
];

const SEASON_EFFECTS = [
  { value: '', label: 'Tắt' },
  { value: 'snow', label: 'Mùa đông — Tuyết rơi ❄' },
  { value: 'sakura', label: 'Mùa xuân — Hoa anh đào 🌸' },
  { value: 'leaves', label: 'Mùa thu — Lá rơi 🍂' },
  { value: 'rain', label: 'Mưa 💧' },
  { value: 'hearts', label: 'Lễ tình nhân — Tim rơi ❤️' },
];

export default function AdminAppearanceView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();
  const { enqueueSnackbar } = useSnackbar();
  const [uploading, setUploading] = useState(false);

  const uploadNavBg = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const r = await axiosInstance.post('/api/banners/admin/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data?.url || (r.data?.id ? `/api/images/${r.data.id}` : '');
      if (url) { set('nav_bg_image', url); await saveConfig(['nav_bg_image']); }
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Tải ảnh thất bại', { variant: 'error' });
    } finally { setUploading(false); }
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Giao diện & Hiệu ứng" />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 720 }}>
            <Card>
              <CardHeader title="Hiệu ứng" subheader="Hiệu ứng khi click chuột và hiệu ứng theo mùa hiển thị trên cửa hàng." />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <TextField select label="Hiệu ứng click chuột" value={values.click_effect || ''} onChange={(e) => set('click_effect', e.target.value)}>
                  {CLICK_EFFECTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
                <TextField select label="Hiệu ứng theo mùa" value={values.season_effect || ''} onChange={(e) => set('season_effect', e.target.value)}>
                  {SEASON_EFFECTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Stack>
            </Card>

            <Card>
              <CardHeader title="Ảnh nền menu (sidebar)" subheader="Hệ thống tự phủ lớp màu nền để chữ luôn rõ." />
              <Stack spacing={2.5} sx={{ p: 3 }} alignItems="flex-start">
                <Box
                  sx={{
                    width: 220, height: 120, borderRadius: 2, border: (t) => `1px dashed ${t.palette.divider}`,
                    bgcolor: 'background.neutral', overflow: 'hidden',
                    backgroundImage: values.nav_bg_image ? `url(${values.nav_bg_image})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    display: 'grid', placeItems: 'center',
                  }}
                >
                  {!values.nav_bg_image && <Iconify icon="solar:gallery-bold" width={36} sx={{ color: 'text.disabled' }} />}
                </Box>
                <Stack direction="row" spacing={1}>
                  <LoadingButton component="label" variant="contained" loading={uploading} startIcon={<Iconify icon="solar:upload-bold" />}>
                    Tải ảnh nền
                    <input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadNavBg(e.target.files[0])} />
                  </LoadingButton>
                  {values.nav_bg_image && (
                    <Button color="error" onClick={async () => { set('nav_bg_image', ''); await saveConfig(['nav_bg_image']); }}>Xoá</Button>
                  )}
                </Stack>
                <TextField fullWidth label="Hoặc dán URL ảnh nền" value={values.nav_bg_image ?? ''} onChange={(e) => set('nav_bg_image', e.target.value)} />
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
