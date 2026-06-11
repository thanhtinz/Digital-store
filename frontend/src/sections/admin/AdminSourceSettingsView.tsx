// @mui
import { Alert, AlertTitle, Box, Card, CircularProgress, Container, Link, Stack, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { DRIVE_FIELDS } from './useAdminSettings';

// ----------------------------------------------------------------------

export default function AdminSourceSettingsView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Mã nguồn / Drive" links={[{ name: 'Cài đặt' }]} />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Card sx={{ maxWidth: 720 }}>
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <Alert severity="info">
                <AlertTitle>Cách lấy Service Account &amp; liên kết Drive</AlertTitle>
                1. Vào <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</Link> → tạo project.<br />
                2. <b>APIs &amp; Services → Library</b> → bật <b>Google Drive API</b>.<br />
                3. <b>Credentials → Create credentials → Service account</b> → tab <b>Keys → Add key → JSON</b>.<br />
                4. Dán toàn bộ nội dung JSON vào ô bên dưới.<br />
                5. Chia sẻ folder Drive chứa mã nguồn cho email <code>client_email</code> (quyền Viewer).<br />
                6. Trong sản phẩm mã nguồn → tab <b>Phiên bản</b>, dán <b>File ID</b> từng file.
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
              <LoadingButton variant="contained" size="large" loading={saving}
                onClick={() => saveConfig(DRIVE_FIELDS.map((f) => f.key))} sx={{ alignSelf: 'flex-start' }}>
                Lưu cấu hình
              </LoadingButton>
            </Stack>
          </Card>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
