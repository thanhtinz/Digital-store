import { useEffect, useState } from 'react';
// utils
import axiosInstance from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Hằng số cấu hình (key trùng với siteConfig backend) + hook load/save dùng
// chung cho các trang cấu hình đã tách nhỏ.
// ----------------------------------------------------------------------

export const GENERAL_FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
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

export const DRIVE_FIELDS: { key: string; label: string; help?: string; multiline?: boolean }[] = [
  { key: 'google_service_account_json', label: 'Service Account JSON', help: 'Dán toàn bộ nội dung file JSON của service account.', multiline: true },
  { key: 'source_drive_folder_id', label: 'Folder ID (tuỳ chọn)', help: 'ID folder gốc chứa mã nguồn (để tham chiếu).' },
  { key: 'source_download_expiry_minutes', label: 'Link tải hết hạn sau (phút)', help: 'Mặc định 60. Link tải dùng một lần và hết hạn sau số phút này.' },
];

export const LIVECHAT_PROVIDERS = [
  { value: 'builtin', label: 'Chat nội bộ (nút nổi → trang hỗ trợ)' },
  { value: 'live2d', label: 'Trợ lý ảo Live2D + AI (anime)' },
  { value: 'tawkto', label: 'Tawk.to' },
  { value: 'crisp', label: 'Crisp' },
  { value: 'messenger', label: 'Facebook Messenger' },
  { value: 'zalo', label: 'Zalo OA' },
  { value: 'custom', label: 'Mã nhúng tuỳ chỉnh' },
];

export const LIVECHAT_KEYS = [
  'livechat_enabled', 'livechat_provider', 'livechat_tawkto_id', 'livechat_crisp_id',
  'livechat_messenger_page_id', 'livechat_messenger_color', 'livechat_zalo_oa_id', 'livechat_custom_code',
  // Trợ lý ảo Live2D (tính cách & lời thoại do AI tự sinh khi quét model)
  'live2d_model_url', 'live2d_scale', 'assistant_greeting',
];

export const SECURITY_KEYS = ['require_email_verification', 'entitlement_reminder_days'];

export const FEATURE_TOGGLES: { key: string; label: string }[] = [
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

export default function useAdminSettings() {
  const { enqueueSnackbar } = useSnackbar();
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
        try {
          const f = typeof data.settings_features === 'string' ? JSON.parse(data.settings_features) : data.settings_features || {};
          setFeatures(f && typeof f === 'object' ? f : {});
        } catch { setFeatures({}); }
      })
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được cấu hình', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [enqueueSnackbar]);

  const set = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));
  const featureOn = (k: string) => features[k] !== false;
  const setFeature = (k: string, on: boolean) => setFeatures((p) => ({ ...p, [k]: on }));

  // Lưu các key cấu hình (site_config).
  const saveConfig = async (keys: string[]) => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(keys.map((k) => [k, values[k] ?? '']));
      await axiosInstance.patch('/api/admin/settings', payload);
      enqueueSnackbar('Đã lưu cấu hình');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Merge các cờ tính năng (không đụng cờ khác như maintenance/trang riêng).
  const saveFlags = async (flagKeys: string[]) => {
    setSaving(true);
    try {
      const patch = Object.fromEntries(flagKeys.map((k) => [k, featureOn(k)]));
      await axiosInstance.post('/api/admin/feature-set', { patch });
      enqueueSnackbar('Đã lưu');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return { values, set, features, featureOn, setFeature, loading, saving, saveConfig, saveFlags };
}
