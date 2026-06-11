// @mui
import { Alert, Box, Card, CircularProgress, Container, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { LIVECHAT_PROVIDERS, LIVECHAT_KEYS } from './useAdminSettings';

// ----------------------------------------------------------------------

export default function AdminLivechatView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();
  const provider = values.livechat_provider || 'builtin';

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Live chat" links={[{ name: 'Cài đặt' }]} />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Card sx={{ maxWidth: 720 }}>
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.livechat_enabled === '1' || values.livechat_enabled === 'true'}
                    onChange={(e) => set('livechat_enabled', e.target.checked ? '1' : '0')}
                  />
                }
                label="Bật live chat trên client"
              />

              <TextField select label="Nguồn live chat" value={provider} onChange={(e) => set('livechat_provider', e.target.value)}>
                {LIVECHAT_PROVIDERS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>

              {provider === 'builtin' && (
                <Alert severity="info">Hiện nút chat nổi ở góc phải, bấm vào mở trang hỗ trợ/chat nội bộ.</Alert>
              )}
              {provider === 'tawkto' && (
                <TextField label="Tawk.to Property/Widget ID" helperText="Dạng PROPERTY_ID/WIDGET_ID."
                  value={values.livechat_tawkto_id || ''} onChange={(e) => set('livechat_tawkto_id', e.target.value)} />
              )}
              {provider === 'crisp' && (
                <TextField label="Crisp Website ID" helperText="Crisp → Settings → Website Settings (CRISP_WEBSITE_ID)."
                  value={values.livechat_crisp_id || ''} onChange={(e) => set('livechat_crisp_id', e.target.value)} />
              )}
              {provider === 'messenger' && (
                <>
                  <TextField label="Facebook Page ID" helperText="Cần thêm domain website vào whitelist trong cài đặt trang."
                    value={values.livechat_messenger_page_id || ''} onChange={(e) => set('livechat_messenger_page_id', e.target.value)} />
                  <TextField label="Màu chủ đạo (tuỳ chọn)" placeholder="#1877F2"
                    value={values.livechat_messenger_color || ''} onChange={(e) => set('livechat_messenger_color', e.target.value)} />
                </>
              )}
              {provider === 'zalo' && (
                <TextField label="Zalo OA ID" helperText="ID Official Account Zalo."
                  value={values.livechat_zalo_oa_id || ''} onChange={(e) => set('livechat_zalo_oa_id', e.target.value)} />
              )}
              {provider === 'custom' && (
                <TextField label="Mã nhúng tuỳ chỉnh (HTML/script)" multiline minRows={4} helperText="Dán nguyên đoạn mã nhúng của nhà cung cấp."
                  value={values.livechat_custom_code || ''} onChange={(e) => set('livechat_custom_code', e.target.value)} />
              )}

              <LoadingButton variant="contained" size="large" loading={saving}
                onClick={() => saveConfig(LIVECHAT_KEYS)} sx={{ alignSelf: 'flex-start' }}>
                Lưu cấu hình
              </LoadingButton>
            </Stack>
          </Card>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
