import { useEffect, useState } from 'react';
// @mui
import { Box, Card, Stack, Switch, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Công tắc bật/tắt RIÊNG cho từng tính năng, đặt đầu trang quản trị tương ứng.
//  - flag:      cờ trong settings_features (mặc định BẬT) → POST /admin/feature-flag
//  - configKey: key trong site_config kiểu '1'/'0' (mặc định TẮT) → PATCH /admin/settings
// ----------------------------------------------------------------------

type Props = {
  label: string;
  description?: string;
  flag?: string;       // ví dụ: 'badges', 'ranks', 'product_qa'
  configKey?: string;  // ví dụ: 'wheel_enabled', 'loyalty_enabled'
  icon?: string;
};

export default function FeatureToggle({ label, description, flag, configKey, icon = 'solar:bolt-bold-duotone' }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [on, setOn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/admin/settings')
      .then((r) => {
        const data = r.data || {};
        if (flag) {
          let features: any = {};
          try {
            features = typeof data.settings_features === 'string' ? JSON.parse(data.settings_features) : data.settings_features || {};
          } catch { features = {}; }
          setOn(features?.[flag] !== false); // mặc định bật
        } else if (configKey) {
          setOn(data[configKey] === '1' || data[configKey] === 'true'); // mặc định tắt
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [flag, configKey]);

  const toggle = async (next: boolean) => {
    setOn(next);
    setSaving(true);
    try {
      if (flag) {
        await axiosInstance.post('/api/admin/feature-flag', { key: flag, enabled: next });
      } else if (configKey) {
        await axiosInstance.patch('/api/admin/settings', { [configKey]: next ? '1' : '0' });
      }
      enqueueSnackbar(next ? `Đã bật ${label.toLowerCase()}` : `Đã tắt ${label.toLowerCase()}`);
    } catch (e: any) {
      setOn(!next);
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      sx={{
        p: 2.5, mb: 3,
        display: 'flex', alignItems: 'center', gap: 2,
        borderLeft: (t) => `4px solid ${on ? t.palette.success.main : t.palette.text.disabled}`,
      }}
    >
      <Box
        sx={{
          width: 44, height: 44, borderRadius: 1.5, flexShrink: 0, display: 'grid', placeItems: 'center',
          bgcolor: on ? 'success.lighter' : 'background.neutral', color: on ? 'success.dark' : 'text.disabled',
        }}
      >
        <Iconify icon={icon} width={24} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1">{label}</Typography>
          <Typography variant="caption" sx={{ color: on ? 'success.main' : 'text.disabled', fontWeight: 700 }}>
            {loaded ? (on ? 'ĐANG BẬT' : 'ĐANG TẮT') : '...'}
          </Typography>
        </Stack>
        {description && (
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        )}
      </Box>
      <Switch checked={on} disabled={!loaded || saving} onChange={(e) => toggle(e.target.checked)} />
    </Card>
  );
}
