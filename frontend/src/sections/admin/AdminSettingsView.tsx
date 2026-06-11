import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
import { useRouter } from 'next/router';
// @mui
import { Alert, AlertTitle, Box, Button, Card, CardHeader, CircularProgress, Container, Divider, FormControlLabel, Link, MenuItem, Stack, Switch, Tab, Tabs, TextField } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';

// ----------------------------------------------------------------------
// Các trường cấu hình chung (key trùng với siteConfig backend).
const FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
  { key: 'site_name', label: 'Tên cửa hàng' },
  { key: 'site_logo', label: 'Logo (URL ảnh)', help: 'Hiển thị ở header/sidebar. Để trống dùng logo mặc định.' },
  { key: 'site_banner', label: 'Banner trang chủ (URL ảnh)' },
  { key: 'site_description', label: 'Mô tả', multiline: true },
  { key: 'currency', label: 'Đơn vị tiền tệ', help: 'Ví dụ: VND, USD.' },
  { key: 'tax_rate', label: 'Thuế VAT (%)', help: 'Ví dụ 8 = 8%.' },
  { key: 'contact_email', label: 'Email liên hệ' },
  { key: 'hotline', label: 'Hotline' },
  { key: 'zalo', label: 'Zalo (URL/SĐT)' },
  { key: 'facebook', label: 'Facebook (URL)' },
  { key: 'instagram', label: 'Instagram (URL)' },
  { key: 'youtube', label: 'YouTube (URL)' },
  { key: 'tiktok', label: 'TikTok (URL)' },
  { key: 'telegram', label: 'Telegram (URL)' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'working_hours', label: 'Giờ làm việc' },
  { key: 'footer_about', label: 'Giới thiệu ở Footer', multiline: true },
  { key: 'copyright_text', label: 'Dòng bản quyền (Footer)' },
];

// ── Mã nguồn / Theme: kết nối Google Drive (service account) ──
const DRIVE_FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
  {
    key: 'google_service_account_json',
    label: 'Service Account JSON',
    help: 'Dán toàn bộ nội dung file JSON của service account.',
    multiline: true,
  },
  { key: 'source_drive_folder_id', label: 'Folder ID (tuỳ chọn)', help: 'ID folder gốc chứa mã nguồn (để tham chiếu).' },
  { key: 'source_download_expiry_minutes', label: 'Link tải hết hạn sau (phút)', help: 'Mặc định 60. Link tải dùng một lần và hết hạn sau số phút này.' },
];

// ── Live chat: nguồn + tham số ──
const LIVECHAT_PROVIDERS = [
  { value: 'builtin', label: 'Chat nội bộ (nút nổi → trang hỗ trợ)' },
  { value: 'tawkto', label: 'Tawk.to' },
  { value: 'crisp', label: 'Crisp' },
  { value: 'messenger', label: 'Facebook Messenger' },
  { value: 'zalo', label: 'Zalo OA' },
  { value: 'custom', label: 'Mã nhúng tuỳ chỉnh' },
];

const LIVECHAT_KEYS = [
  'livechat_enabled', 'livechat_provider', 'livechat_tawkto_id', 'livechat_crisp_id',
  'livechat_messenger_page_id', 'livechat_messenger_color', 'livechat_zalo_oa_id', 'livechat_custom_code',
];

// ── Tính năng nâng cao (lưu trong site_config) ──
const ADVANCED_KEYS = [
  'require_email_verification', 'entitlement_reminder_days',
  'wheel_enabled', 'wheel_cost_points', 'wheel_free_daily',
];

// ── Bật/tắt tính năng của web (lưu trong settings_features JSON) ──
const FEATURE_TOGGLES: { key: string; label: string; help?: string }[] = [
  { key: 'blog', label: 'Blog / Tin tức' },
  { key: 'offers', label: 'Ưu đãi / Khuyến mãi' },
  { key: 'flash_sales', label: 'Flash Sale' },
  { key: 'affiliate', label: 'Tiếp thị liên kết (Affiliate)' },
  { key: 'support', label: 'Hỗ trợ / Ticket' },
  { key: 'reviews', label: 'Đánh giá sản phẩm' },
  { key: 'wishlist', label: 'Danh sách yêu thích' },
  { key: 'announcements', label: 'Thông báo' },
  { key: 'balance', label: 'Ví / Số dư' },
  { key: 'api_docs', label: 'Tài liệu API' },
  { key: 'bundles', label: 'Gói combo' },
  { key: 'ranks', label: 'Cấp bậc thành viên' },
  { key: 'badges', label: 'Huy hiệu thành viên' },
  { key: 'product_qa', label: 'Hỏi & Đáp sản phẩm' },
];

const SETTINGS_TABS = [
  { value: 'general', label: 'Thông tin chung' },
  { value: 'features', label: 'Tính năng & Vòng quay' },
  { value: 'livechat', label: 'Live chat' },
  { value: 'source', label: 'Mã nguồn / Drive' },
];

export default function AdminSettingsView() {
  const { enqueueSnackbar } = useSnackbar();
  const { query, push } = useRouter();
  const tab = (query.tab as string) || 'general';
  const goTab = (v: string) =>
    push(v === 'general' ? '/dashboard/admin/settings' : `/dashboard/admin/settings?tab=${v}`, undefined, { shallow: true });
  const [values, setValues] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/admin/settings')
      .then((r) => {
        const data = r.data || {};
        setValues(data);
        // settings_features được lưu dạng chuỗi JSON -> parse ra object.
        try {
          const f = typeof data.settings_features === 'string'
            ? JSON.parse(data.settings_features)
            : data.settings_features || {};
          setFeatures(f && typeof f === 'object' ? f : {});
        } catch {
          setFeatures({});
        }
      })
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được cấu hình', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [enqueueSnackbar]);

  const set = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));
  // Mặc định BẬT trừ khi đặt false tường minh (đồng bộ quy ước backend).
  const featureOn = (k: string) => features[k] !== false;
  const setFeature = (k: string, on: boolean) => setFeatures((p) => ({ ...p, [k]: on }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Chỉ gửi các key có trong form để tránh ghi đè cấu hình khác.
      const keys = [...FIELDS.map((f) => f.key), ...DRIVE_FIELDS.map((f) => f.key), ...LIVECHAT_KEYS, ...ADVANCED_KEYS];
      const payload: Record<string, string> = Object.fromEntries(keys.map((k) => [k, values[k] ?? '']));
      // Lưu cờ tính năng dưới dạng JSON (giữ nguyên các key khác như maintenance).
      payload.settings_features = JSON.stringify(features);
      await axiosInstance.patch('/api/admin/settings', payload);
      enqueueSnackbar('Đã lưu cấu hình');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Cài đặt cửa hàng" />

        <Tabs value={tab} onChange={(_, v) => goTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
          {SETTINGS_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {tab === 'general' && (
            <Card>
              <CardHeader title="Thông tin chung" />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                {FIELDS.map((f) => (
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
              </Stack>
            </Card>
            )}

            {tab === 'features' && (
            <>
            <Card>
              <CardHeader
                title="Tính năng của web"
                subheader="Bật/tắt các tính năng hiển thị trên cửa hàng. Tắt sẽ ẩn ở menu và chặn truy cập."
              />
              <Box
                sx={{
                  p: 3,
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                {FEATURE_TOGGLES.map((f) => (
                  <FormControlLabel
                    key={f.key}
                    control={
                      <Switch
                        checked={featureOn(f.key)}
                        onChange={(e) => setFeature(f.key, e.target.checked)}
                      />
                    }
                    label={f.label}
                  />
                ))}
              </Box>

              <Divider />

              <Stack spacing={2} sx={{ p: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      color="error"
                      checked={features.maintenance === true}
                      onChange={(e) => setFeature('maintenance', e.target.checked)}
                    />
                  }
                  label="Chế độ bảo trì (chỉ admin/staff đăng nhập được)"
                />
                <TextField
                  label="Thông báo bảo trì"
                  placeholder="Hệ thống đang bảo trì. Vui lòng quay lại sau."
                  value={features.maintenance_message ?? ''}
                  onChange={(e) =>
                    setFeatures((p) => ({ ...p, maintenance_message: e.target.value }))
                  }
                />
              </Stack>
            </Card>

            <Card>
              <CardHeader
                title="Tính năng nâng cao"
                subheader="Xác minh email, nhắc gia hạn gói, vòng quay may mắn."
              />
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

                <Divider />

                <FormControlLabel
                  control={
                    <Switch
                      checked={values.wheel_enabled === '1' || values.wheel_enabled === 'true'}
                      onChange={(e) => set('wheel_enabled', e.target.checked ? '1' : '0')}
                    />
                  }
                  label="Bật vòng quay may mắn"
                />
                <TextField
                  type="number"
                  label="Phí mỗi lượt quay (điểm)"
                  helperText="Số điểm trừ cho mỗi lượt quay (sau khi hết lượt miễn phí). 0 = chỉ quay miễn phí."
                  value={values.wheel_cost_points ?? ''}
                  onChange={(e) => set('wheel_cost_points', e.target.value)}
                />
                <TextField
                  type="number"
                  label="Lượt quay miễn phí mỗi ngày"
                  helperText="Số lượt quay miễn phí mỗi user/ngày. 0 = không có."
                  value={values.wheel_free_daily ?? ''}
                  onChange={(e) => set('wheel_free_daily', e.target.value)}
                />
                <Alert severity="info">
                  Quản lý phần thưởng vòng quay, huy hiệu, combo và Hỏi&Đáp ở các trang quản trị riêng tương ứng.
                </Alert>
              </Stack>
            </Card>
            </>
            )}

            {tab === 'livechat' && (
            <Card>
              <CardHeader
                title="Live chat"
                subheader="Hiển thị widget hỗ trợ ở góc trang client. Hỗ trợ nhiều nguồn."
              />
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

                <TextField
                  select
                  label="Nguồn live chat"
                  value={values.livechat_provider || 'builtin'}
                  onChange={(e) => set('livechat_provider', e.target.value)}
                >
                  {LIVECHAT_PROVIDERS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>

                {(values.livechat_provider || 'builtin') === 'builtin' && (
                  <Alert severity="info">
                    Hiện nút chat nổi ở góc phải, bấm vào sẽ mở trang hỗ trợ/chat nội bộ của hệ thống.
                  </Alert>
                )}

                {values.livechat_provider === 'tawkto' && (
                  <TextField
                    label="Tawk.to Property/Widget ID"
                    helperText="Dạng PROPERTY_ID/WIDGET_ID (lấy từ Tawk.to → Administration → Chat Widget → mã nhúng)."
                    value={values.livechat_tawkto_id || ''}
                    onChange={(e) => set('livechat_tawkto_id', e.target.value)}
                  />
                )}

                {values.livechat_provider === 'crisp' && (
                  <TextField
                    label="Crisp Website ID"
                    helperText="Crisp → Settings → Website Settings → Setup instructions (CRISP_WEBSITE_ID)."
                    value={values.livechat_crisp_id || ''}
                    onChange={(e) => set('livechat_crisp_id', e.target.value)}
                  />
                )}

                {values.livechat_provider === 'messenger' && (
                  <>
                    <TextField
                      label="Facebook Page ID"
                      helperText="ID trang Facebook. Cần thêm domain website vào whitelist trong cài đặt trang."
                      value={values.livechat_messenger_page_id || ''}
                      onChange={(e) => set('livechat_messenger_page_id', e.target.value)}
                    />
                    <TextField
                      label="Màu chủ đạo (tuỳ chọn)"
                      placeholder="#1877F2"
                      value={values.livechat_messenger_color || ''}
                      onChange={(e) => set('livechat_messenger_color', e.target.value)}
                    />
                  </>
                )}

                {values.livechat_provider === 'zalo' && (
                  <TextField
                    label="Zalo OA ID"
                    helperText="ID Official Account Zalo (Zalo OA → Quản lý → Widget chat)."
                    value={values.livechat_zalo_oa_id || ''}
                    onChange={(e) => set('livechat_zalo_oa_id', e.target.value)}
                  />
                )}

                {values.livechat_provider === 'custom' && (
                  <TextField
                    label="Mã nhúng tuỳ chỉnh (HTML/script)"
                    multiline
                    minRows={4}
                    helperText="Dán nguyên đoạn mã nhúng của nhà cung cấp live chat bất kỳ."
                    value={values.livechat_custom_code || ''}
                    onChange={(e) => set('livechat_custom_code', e.target.value)}
                  />
                )}
              </Stack>
            </Card>
            )}

            {tab === 'source' && (
            <>
            <Card>
              <CardHeader
                title="Mã nguồn / Theme — Google Drive"
                subheader="File mã nguồn được lưu trên Drive và stream qua server (ẩn link thật)."
              />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Alert severity="info">
                  <AlertTitle>Cách lấy Service Account & liên kết Drive</AlertTitle>
                  1. Vào <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</Link> → tạo project.<br />
                  2. <b>APIs &amp; Services → Library</b> → bật <b>Google Drive API</b>.<br />
                  3. <b>APIs &amp; Services → Credentials → Create credentials → Service account</b> → tạo xong vào tab <b>Keys → Add key → JSON</b> để tải file JSON.<br />
                  4. Mở file JSON, dán toàn bộ nội dung vào ô bên dưới.<br />
                  5. Mở email <code>client_email</code> trong JSON, rồi <b>chia sẻ folder Drive</b> chứa file mã nguồn cho email đó (quyền Viewer).<br />
                  6. Trong sản phẩm mã nguồn → tab <b>Phiên bản</b>, dán <b>File ID</b> của từng file (lấy từ URL Drive).
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
              </Stack>
            </Card>
            </>
            )}

            <Alert severity="info">
              Cấu hình <b>Cổng thanh toán (SePay)</b>, <b>Email/SMTP</b>, <b>Telegram</b>, <b>OAuth</b> và{' '}
              <b>Nguồn cung cấp</b> nằm ở trang{' '}
              <Link component={NextLink} href={PATH_DASHBOARD.admin.integrations}>
                Tích hợp
              </Link>
              .
            </Alert>

            <Box sx={{ textAlign: 'right' }}>
              <Button
                size="large"
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              >
                Lưu cấu hình
              </Button>
            </Box>
          </Stack>
        )}
      </Container>
    </RoleBasedGuard>
  );
}
