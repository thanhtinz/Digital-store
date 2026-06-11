// @mui
import { Box, Card, CircularProgress, Container, Stack, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { GENERAL_FIELDS } from './useAdminSettings';

// ----------------------------------------------------------------------

export default function AdminGeneralSettingsView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Thông tin chung" links={[{ name: 'Cài đặt' }]} />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Card sx={{ maxWidth: 720 }}>
            <Stack spacing={2.5} sx={{ p: 3 }}>
              {GENERAL_FIELDS.map((f) => (
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
              <LoadingButton
                variant="contained" size="large" loading={saving}
                onClick={() => saveConfig(GENERAL_FIELDS.map((f) => f.key))}
                sx={{ alignSelf: 'flex-start' }}
              >
                Lưu cấu hình
              </LoadingButton>
            </Stack>
          </Card>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
