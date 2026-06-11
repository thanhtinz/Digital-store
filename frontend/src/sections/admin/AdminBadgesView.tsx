import { useEffect, useState } from 'react';
// @mui
import {
  Box, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  IconButton, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import ResponsiveDialog from '../../components/responsive-dialog';
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';

// ----------------------------------------------------------------------

const CRITERIA = [
  { value: '', label: 'Trao tay (không tự động)' },
  { value: 'orders', label: 'Số đơn hoàn tất ≥' },
  { value: 'spend', label: 'Tổng chi tiêu (đ) ≥' },
  { value: 'reviews', label: 'Số đánh giá ≥' },
  { value: 'points', label: 'Điểm thưởng ≥' },
];

const empty = { code: '', name: '', description: '', icon: '🏅', color: '#00AB55', criteria_type: '', threshold: '', sort_order: 0, is_active: true };

export default function AdminBadgesView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => axiosInstance.get('/api/admin/badges').then((r) => setItems(r.data?.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (b: any) => {
    setForm({ code: b.code, name: b.name, description: b.description || '', icon: b.icon || '🏅', color: b.color, criteria_type: b.criteria_type || '', threshold: b.threshold ?? '', sort_order: b.sort_order || 0, is_active: b.is_active });
    setEditId(b.id); setOpen(true);
  };

  const save = async () => {
    try {
      if (editId) await axiosInstance.patch(`/api/admin/badges/${editId}`, form);
      else await axiosInstance.post('/api/admin/badges', form);
      enqueueSnackbar('Đã lưu'); setOpen(false); load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    }
  };

  const remove = async (id: number) => { await axiosInstance.delete(`/api/admin/badges/${id}`).catch(() => {}); load(); };
  const recompute = async () => {
    await axiosInstance.post('/api/admin/badges/recompute').catch(() => {});
    enqueueSnackbar('Đang rà soát trao huy hiệu ở chế độ nền');
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader
          title="Huy hiệu thành viên"
          action={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={recompute} startIcon={<Iconify icon="solar:refresh-bold" />}>Rà soát</Button>
              <Button variant="contained" onClick={openNew} startIcon={<Iconify icon="eva:plus-fill" />}>Thêm</Button>
            </Stack>
          }
        />

        <FeatureToggle
          flag="badges"
          label="Huy hiệu thành viên"
          description="Hiển thị huy hiệu trên hồ sơ khách hàng."
          icon="solar:medal-ribbon-bold-duotone"
        />

        <Grid container spacing={2}>
          {items.map((b) => (
            <Grid key={b.id} item xs={12} sm={6} md={4}>
              <Card sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: b.color, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
                    {b.icon && b.icon.includes(':') ? <Iconify icon={b.icon} width={26} /> : <Typography sx={{ fontSize: 22 }}>{b.icon || '🏅'}</Typography>}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{b.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.criteria_type ? `${CRITERIA.find((c) => c.value === b.criteria_type)?.label} ${b.threshold}` : 'Trao tay'} · {b.awarded_count} người
                    </Typography>
                  </Box>
                  {!b.is_active && <Label color="default">Tắt</Label>}
                  <IconButton size="small" onClick={() => openEdit(b)}><Iconify icon="solar:pen-bold" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(b.id)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>

        <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editId ? 'Sửa huy hiệu' : 'Thêm huy hiệu'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Mã (code)" value={form.code} disabled={!!editId} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <TextField label="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField label="Icon (emoji hoặc iconify)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} fullWidth />
                <TextField label="Màu" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} sx={{ width: 90 }} />
              </Stack>
              <TextField select label="Tiêu chí tự trao" value={form.criteria_type} onChange={(e) => setForm({ ...form, criteria_type: e.target.value })}>
                {CRITERIA.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
              {form.criteria_type && (
                <TextField type="number" label="Ngưỡng" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
              )}
              <TextField type="number" label="Thứ tự" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              <Stack direction="row" alignItems="center">
                <Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <Typography variant="body2">Đang bật</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Huỷ</Button>
            <Button variant="contained" onClick={save}>Lưu</Button>
          </DialogActions>
        </ResponsiveDialog>
      </Container>
    </RoleBasedGuard>
  );
}
