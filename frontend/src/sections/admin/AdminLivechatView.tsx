// @mui
import { Alert, Box, Card, CircularProgress, Container, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { LIVECHAT_PROVIDERS, LIVECHAT_KEYS } from './useAdminSettings';

// ----------------------------------------------------------------------

// Một vài nhân vật có sẵn từ kho mở (đường dẫn tương đối trong assets/models).
const LIVE2D_PRESETS = [
  { value: '', label: 'Mặc định (Asuna - Sword Art Online)' },
  { value: 'SAO/asuna/asuna_01/asuna_01.model.json', label: 'Asuna - Sword Art Online' },
  { value: 'Saekano/kato/01.json', label: 'Kato Megumi - Saekano' },
];

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
              {provider === 'live2d' && (
                <>
                  <Alert severity="info">
                    Nhân vật anime Live2D đứng ở góc, biết chào khách, tư vấn, hướng dẫn và trả lời tự động bằng AI + đọc giọng nói (TTS).
                    Cần cấu hình <b>AI</b> ở trang Tích hợp → AI. Nếu chưa có model Live2D, hệ thống dùng avatar tĩnh (chat vẫn chạy).
                  </Alert>
                  <TextField
                    select label="Chọn nhân vật có sẵn (kho AzharRizkiZ/Live2D-Model)"
                    value={LIVE2D_PRESETS.some((p) => p.value === values.live2d_model_url) ? values.live2d_model_url : '__custom'}
                    onChange={(e) => set('live2d_model_url', e.target.value === '__custom' ? '' : e.target.value)}
                  >
                    {LIVE2D_PRESETS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                    <MenuItem value="__custom">— Tự nhập URL / đường dẫn —</MenuItem>
                  </TextField>
                  <TextField
                    label="URL model hoặc đường dẫn trong kho"
                    helperText='Dán URL .model.json/.model3.json đầy đủ, HOẶC đường dẫn tương đối trong kho (vd "Konosuba/megumin/megumin_01/megumin_01.model.json"). Xem kho: github.com/AzharRizkiZ/Live2D-Model'
                    value={values.live2d_model_url || ''} onChange={(e) => set('live2d_model_url', e.target.value)}
                  />
                  <TextField
                    label="Tỉ lệ nhân vật (scale)" type="number" placeholder="0.16"
                    helperText="Mặc định 0.16. Tăng/giảm nếu nhân vật quá to/nhỏ."
                    value={values.live2d_scale || ''} onChange={(e) => set('live2d_scale', e.target.value)}
                  />
                  <TextField
                    label="Lời chào" placeholder="Xin chào! Mình có thể giúp gì cho bạn?"
                    value={values.assistant_greeting || ''} onChange={(e) => set('assistant_greeting', e.target.value)}
                  />
                  <TextField
                    label="Lời thoại ngẫu nhiên (mỗi dòng 1 câu)" multiline minRows={3}
                    helperText="Hiện luân phiên trên đầu nhân vật khi rảnh."
                    value={values.assistant_tips || ''} onChange={(e) => set('assistant_tips', e.target.value)}
                  />
                  <TextField
                    label="Tính cách / hướng dẫn cho AI (system prompt)" multiline minRows={3}
                    helperText="Để trống dùng mặc định (tư vấn mua hàng + hướng dẫn website)."
                    value={values.assistant_system_prompt || ''} onChange={(e) => set('assistant_system_prompt', e.target.value)}
                  />
                </>
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
