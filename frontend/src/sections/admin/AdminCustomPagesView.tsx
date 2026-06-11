// @mui
import { Box, Card, CardHeader, CircularProgress, Container, Stack, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings from './useAdminSettings';

// ----------------------------------------------------------------------

const KEYS = [
  'notfound_title', 'notfound_message', 'notfound_image',
  'redirect_title', 'redirect_message', 'redirect_warning', 'redirect_seconds',
];

export default function AdminCustomPagesView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Trang tuỳ chỉnh" />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 720 }}>
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
