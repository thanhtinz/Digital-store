// @mui
import { Box, Card, CircularProgress, Container, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { FEATURE_TOGGLES } from './useAdminSettings';

// ----------------------------------------------------------------------

export default function AdminFeaturesView() {
  const { featureOn, setFeature, loading, saving, saveFlags } = useAdminSettings();

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Tính năng của web" links={[{ name: 'Cài đặt' }]} />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Card sx={{ maxWidth: 720 }}>
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, pb: 0 }}>
              Bật/tắt nhanh các tính năng hiển thị trên cửa hàng. Tắt sẽ ẩn ở menu và chặn truy cập.
              Mỗi tính năng còn có công tắc riêng ở trang quản trị tương ứng.
            </Typography>
            <Box sx={{ p: 3, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
              {FEATURE_TOGGLES.map((f) => (
                <FormControlLabel
                  key={f.key}
                  control={<Switch checked={featureOn(f.key)} onChange={(e) => setFeature(f.key, e.target.checked)} />}
                  label={f.label}
                />
              ))}
            </Box>
            <Stack sx={{ p: 3, pt: 0 }}>
              <LoadingButton
                variant="contained" size="large" loading={saving}
                onClick={() => saveFlags(FEATURE_TOGGLES.map((f) => f.key))}
                sx={{ alignSelf: 'flex-start' }}
              >
                Lưu
              </LoadingButton>
            </Stack>
          </Card>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
