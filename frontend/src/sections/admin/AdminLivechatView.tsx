import { useEffect, useState } from 'react';
// @mui
import { Alert, Box, Card, Chip, CircularProgress, Container, Divider, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import useAdminSettings, { LIVECHAT_PROVIDERS, LIVECHAT_KEYS } from './useAdminSettings';

// ----------------------------------------------------------------------

type Live2dChar = { id: string; name: string; modelUrl: string; scale?: string; personality: string; greeting: string; quotes: string[] };

export default function AdminLivechatView() {
  const { values, set, loading, saving, saveConfig } = useAdminSettings();
  const { enqueueSnackbar } = useSnackbar();
  const provider = values.livechat_provider || 'builtin';

  const [chars, setChars] = useState<Live2dChar[]>([]);
  const [scanning, setScanning] = useState(false);

  const loadChars = () => {
    axiosInstance.get('/api/admin/live2d/characters').then((r) => setChars(r.data?.items || [])).catch(() => {});
  };
  useEffect(() => { loadChars(); }, []);

  const selected = chars.find((c) => c.modelUrl === values.live2d_model_url);

  const scanCharacter = async (force = false) => {
    const modelUrl = (values.live2d_model_url || '').trim();
    if (!modelUrl) { enqueueSnackbar('Nhập URL/đường dẫn model trước đã', { variant: 'warning' }); return; }
    setScanning(true);
    try {
      const r = await axiosInstance.post('/api/admin/live2d/scan', { modelUrl, scale: values.live2d_scale || '', force });
      const c: Live2dChar = r.data?.character;
      if (c) {
        if (!values.assistant_greeting) set('assistant_greeting', c.greeting || '');
        await saveConfig(LIVECHAT_KEYS);
        loadChars();
        enqueueSnackbar(r.data?.cached ? `Đã có sẵn nhân vật "${c.name}" (${c.quotes?.length || 0} câu)` : `Đã tạo "${c.name}" + ${c.quotes?.length || 0} câu thoại 🎉`);
      }
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Quét nhân vật thất bại', { variant: 'error' });
    } finally { setScanning(false); }
  };

  const deleteChar = async (id: string) => {
    try { await axiosInstance.delete(`/api/admin/live2d/characters/${id}`); loadChars(); }
    catch (e: any) { enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' }); }
  };

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
                    Nhân vật anime Live2D biết chào khách, tư vấn, hướng dẫn và trả lời bằng AI + đọc giọng nói (TTS).
                    Khi mở chat sẽ hiện khung lớn: bên trái là tin nhắn, bên phải là nhân vật đang tương tác.
                    Cần cấu hình <b>AI</b> ở Tích hợp → AI. Khi nhập model mới, bấm <b>Quét nhân vật</b> để AI tự đọc tính cách & tạo 100 câu thoại (chỉ chạy 1 lần, lưu sẵn vào hệ thống).
                  </Alert>

                  {chars.length > 0 && (
                    <TextField
                      select label="Nhân vật đã lưu (AI đã tạo lời thoại)"
                      value={chars.some((c) => c.modelUrl === values.live2d_model_url) ? values.live2d_model_url : ''}
                      onChange={(e) => { set('live2d_model_url', e.target.value); const c = chars.find((x) => x.modelUrl === e.target.value); if (c) { set('live2d_scale', c.scale || ''); set('assistant_greeting', c.greeting || ''); } }}
                    >
                      <MenuItem value="">— Chọn nhân vật đã lưu —</MenuItem>
                      {chars.map((c) => <MenuItem key={c.id} value={c.modelUrl}>{c.name} · {c.quotes?.length || 0} câu</MenuItem>)}
                    </TextField>
                  )}

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

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <LoadingButton
                      variant="contained" color="secondary" loading={scanning}
                      startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
                      onClick={() => scanCharacter(false)}
                    >
                      Quét nhân vật & tạo lời thoại (AI)
                    </LoadingButton>
                    {selected && (
                      <LoadingButton color="inherit" loading={scanning} onClick={() => scanCharacter(true)}>
                        Tạo lại
                      </LoadingButton>
                    )}
                  </Stack>

                  {selected && (
                    <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.neutral' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:user-heart-rounded-bold" />
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{selected.name}</Typography>
                        <Chip size="small" label={`${selected.quotes?.length || 0} câu thoại`} />
                        <IconButton size="small" color="error" title="Xoá nhân vật" onClick={() => deleteChar(selected.id)}>
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">Tính cách (AI tạo):</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>{selected.personality}</Typography>
                      <Typography variant="caption" color="text.secondary">Vài câu thoại mẫu:</Typography>
                      <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                        {(selected.quotes || []).slice(0, 5).map((q, i) => <li key={i}>{q}</li>)}
                      </Typography>
                    </Card>
                  )}

                  <TextField
                    label="Lời chào (tuỳ chọn — để trống dùng câu AI tạo)" placeholder={selected?.greeting || 'Xin chào! Mình có thể giúp gì cho bạn?'}
                    value={values.assistant_greeting || ''} onChange={(e) => set('assistant_greeting', e.target.value)}
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
