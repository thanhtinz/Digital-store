// @mui
import { Box, Card, CircularProgress, Container, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { SECURITY_KEYS } from './useAdminSettings';

// ----------------------------------------------------------------------

export default function AdminSecuritySettingsView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Bảo mật & Nhắc nhở" links={[{ name: 'Cài đặt' }]} />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Card sx={{ maxWidth: 720 }}>
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.require_email_verification === '1' || values.require_email_verification === 'true'}
                    onChange={(e) => set('require_email_verification', e.target.checked ? '1' : '0')}
                  />
                }
                label="Yêu cầu xác minh email khi đăng ký"
              />
              <TextField
                type="number"
                label="Nhắc gia hạn trước (ngày)"
                helperText="Số ngày trước khi gói có hạn hết hạn sẽ gửi email/thông báo nhắc. Mặc định 3."
                value={values.entitlement_reminder_days ?? ''}
                onChange={(e) => set('entitlement_reminder_days', e.target.value)}
              />
              <LoadingButton variant="contained" size="large" loading={saving}
                onClick={() => saveConfig(SECURITY_KEYS)} sx={{ alignSelf: 'flex-start' }}>
                Lưu cấu hình
              </LoadingButton>
            </Stack>
          </Card>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
