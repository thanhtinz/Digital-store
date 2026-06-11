import { useEffect, useState } from 'react';
// @mui
import {
  Box, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  IconButton, MenuItem, Stack, Switch, TextField, Typography, FormControlLabel,
} from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';

// ----------------------------------------------------------------------

const REQ = [
  { value: 'manual', label: 'Trao tay (không tự động)' },
  { value: 'spend', label: 'Theo tổng chi tiêu (đ)' },
  { value: 'points', label: 'Theo điểm thưởng' },
];

const empty = {
  name: '', level: 0, color: '#00AB55', icon: '👑', sparkle: false, highlight_name: false,
  requirement_type: 'spend', threshold: '', discount_percent: '', order_priority: false,
  support_priority: false, is_active: true, is_default: false,
};

export default function AdminRanksView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => axiosInstance.get('/api/admin/ranks').then((r) => setItems(r.data?.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (r: any) => {
    setForm({
      name: r.name, level: r.level, color: r.color, icon: r.icon || '', sparkle: r.sparkle,
      highlight_name: r.highlight_name, requirement_type: r.requirement_type, threshold: r.threshold ?? '',
      discount_percent: r.discount_percent ?? '', order_priority: r.order_priority,
      support_priority: r.support_priority, is_active: r.is_active, is_default: r.is_default,
    });
    setEditId(r.id); setOpen(true);
  };

  const save = async () => {
    try {
      if (editId) await axiosInstance.patch(`/api/admin/ranks/${editId}`, form);
      else await axiosInstance.post('/api/admin/ranks', form);
      enqueueSnackbar('Đã lưu'); setOpen(false); load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    }
  };
  const remove = async (id: number) => { await axiosInstance.delete(`/api/admin/ranks/${id}`).catch(() => {}); load(); };
  const recompute = async () => {
    await axiosInstance.post('/api/admin/ranks/recompute').catch(() => {});
    enqueueSnackbar('Đang rà soát hạng ở chế độ nền');
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader
          title="Cấp bậc thành viên"
          action={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={recompute} startIcon={<Iconify icon="solar:refresh-bold" />}>Rà soát</Button>
              <Button variant="contained" onClick={openNew} startIcon={<Iconify icon="eva:plus-fill" />}>Thêm hạng</Button>
            </Stack>
          }
        />

        <Grid container spacing={2}>
          {items.map((r) => (
            <Grid key={r.id} item xs={12} sm={6} md={4}>
              <Card sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: r.color, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
                    {r.icon && r.icon.includes(':') ? <Iconify icon={r.icon} width={24} /> : <Typography sx={{ fontSize: 20 }}>{r.icon || '👑'}</Typography>}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{r.name} {r.is_default && '· mặc định'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lv{r.level} · {r.requirement_type === 'manual' ? 'trao tay' : r.requirement_type === 'points' ? `${r.threshold} điểm` : fCurrency(r.threshold)} · {r.user_count} user
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => openEdit(r)}><Iconify icon="solar:pen-bold" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.id)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                  {r.discount_percent > 0 && <Chip text={`-${r.discount_percent}%`} />}
                  {r.order_priority && <Chip text="Ưu tiên đơn" />}
                  {r.support_priority && <Chip text="Ưu tiên CSKH" />}
                  {r.sparkle && <Chip text="Lấp lánh" />}
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editId ? 'Sửa hạng' : 'Thêm hạng'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Tên hạng" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <TextField label="Cấp (level)" type="number" sx={{ width: 110 }} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Icon (emoji/iconify)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                <TextField label="Màu" type="color" sx={{ width: 90 }} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </Stack>
              <TextField select label="Điều kiện đạt hạng" value={form.requirement_type} onChange={(e) => setForm({ ...form, requirement_type: e.target.value })}>
                {REQ.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
              {form.requirement_type !== 'manual' && (
                <TextField type="number" label="Ngưỡng (chi tiêu/điểm)" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
              )}
              <TextField type="number" label="Giảm giá mặc định cho hạng (%)" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <FormControlLabel control={<Switch checked={form.order_priority} onChange={(e) => setForm({ ...form, order_priority: e.target.checked })} />} label="Ưu tiên đơn hàng" />
                <FormControlLabel control={<Switch checked={form.support_priority} onChange={(e) => setForm({ ...form, support_priority: e.target.checked })} />} label="Ưu tiên hỗ trợ" />
                <FormControlLabel control={<Switch checked={form.highlight_name} onChange={(e) => setForm({ ...form, highlight_name: e.target.checked })} />} label="Tên nổi bật" />
                <FormControlLabel control={<Switch checked={form.sparkle} onChange={(e) => setForm({ ...form, sparkle: e.target.checked })} />} label="Badge lấp lánh" />
                <FormControlLabel control={<Switch checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />} label="Hạng mặc định" />
                <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Đang bật" />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Huỷ</Button>
            <Button variant="contained" onClick={save} disabled={!form.name}>Lưu</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </RoleBasedGuard>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography variant="caption">{text}</Typography>
    </Box>
  );
}
