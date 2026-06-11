import { useEffect, useState } from 'react';
// @mui
import { Alert, Box, Card, CardHeader, Container, Grid, Stack, Switch, TextField, Typography, FormControlLabel } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';
import MaintenanceScreen from '../../components/maintenance/MaintenanceScreen';
import AdminPageHeader from './AdminPageHeader';

// ----------------------------------------------------------------------

type Form = {
  on: boolean;
  title: string;
  message: string;
  image: string;
  contact: string;
  eta: string;
};

const EMPTY: Form = { on: false, title: '', message: '', image: '', contact: '', eta: '' };

export default function AdminMaintenanceView() {
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/admin/settings')
      .then((r) => {
        let f: any = {};
        try {
          f = typeof r.data?.settings_features === 'string' ? JSON.parse(r.data.settings_features) : r.data?.settings_features || {};
        } catch { f = {}; }
        setForm({
          on: f.maintenance === true || f.maintenance === '1' || f.maintenance === 'true',
          title: f.maintenance_title || '',
          message: f.maintenance_message || '',
          image: f.maintenance_image || '',
          contact: f.maintenance_contact || '',
          eta: f.maintenance_eta || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.post('/api/admin/feature-set', {
        patch: {
          maintenance: form.on,
          maintenance_title: form.title,
          maintenance_message: form.message,
          maintenance_image: form.image,
          maintenance_contact: form.contact,
          maintenance_eta: form.eta,
        },
      });
      enqueueSnackbar('Đã lưu cấu hình bảo trì');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Chế độ bảo trì" />

        <Card sx={{ p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2, borderLeft: (t) => `4px solid ${form.on ? t.palette.error.main : t.palette.text.disabled}` }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">
              Bảo trì {form.on ? <Typography component="span" color="error.main" fontWeight={700}>ĐANG BẬT</Typography> : <Typography component="span" color="text.disabled" fontWeight={700}>ĐANG TẮT</Typography>}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Khi bật, khách sẽ thấy trang bảo trì. Chỉ admin/staff đăng nhập và truy cập được.
            </Typography>
          </Box>
          <Switch color="error" checked={form.on} onChange={(e) => set('on', e.target.checked)} />
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Tuỳ chỉnh trang bảo trì" />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <TextField label="Tiêu đề" placeholder="Hệ thống đang bảo trì" value={form.title} onChange={(e) => set('title', e.target.value)} />
                <TextField label="Nội dung" multiline minRows={3} placeholder="Chúng tôi đang nâng cấp..." value={form.message} onChange={(e) => set('message', e.target.value)} />
                <TextField label="Ảnh minh hoạ (URL)" placeholder="https://..." value={form.image} onChange={(e) => set('image', e.target.value)} helperText="Để trống dùng icon mặc định." />
                <TextField label="Thời gian dự kiến hoạt động lại" placeholder="VD: 14:00 hôm nay" value={form.eta} onChange={(e) => set('eta', e.target.value)} />
                <TextField label="Thông tin liên hệ" multiline minRows={2} placeholder="Hotline / Zalo / Email hỗ trợ..." value={form.contact} onChange={(e) => set('contact', e.target.value)} />
                <LoadingButton variant="contained" size="large" loading={saving || loading} onClick={save}>
                  Lưu cấu hình
                </LoadingButton>
                <Alert severity="info">Cấu hình áp dụng ngay sau khi lưu (khách tải lại trang sẽ thấy).</Alert>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Xem trước</Typography>
            <MaintenanceScreen preview config={{ ...form }} />
          </Grid>
        </Grid>
      </Container>
    </RoleBasedGuard>
  );
}
