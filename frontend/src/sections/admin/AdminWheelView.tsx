import { useEffect, useState } from 'react';
// @mui
import {
  Box, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert,
} from '@mui/material';
// next
import NextLink from 'next/link';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

const TYPES = [
  { value: 'points', label: 'Điểm thưởng' },
  { value: 'balance', label: 'Số dư (đ)' },
  { value: 'voucher', label: 'Mã giảm giá' },
  { value: 'none', label: 'Chúc may mắn (trượt)' },
];

const empty = { label: '', type: 'points', value: 0, voucher_code: '', weight: 1, color: '#00AB55', stock: -1, is_active: true, sort_order: 0 };

export default function AdminWheelView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => axiosInstance.get('/api/wheel/admin/prizes').then((r) => setItems(r.data?.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (p: any) => {
    setForm({ label: p.label, type: p.type, value: p.value, voucher_code: p.voucher_code || '', weight: p.weight, color: p.color, stock: p.stock, is_active: p.is_active, sort_order: p.sort_order });
    setEditId(p.id); setOpen(true);
  };

  const save = async () => {
    try {
      if (editId) await axiosInstance.patch(`/api/wheel/admin/prizes/${editId}`, form);
      else await axiosInstance.post('/api/wheel/admin/prizes', form);
      enqueueSnackbar('Đã lưu'); setOpen(false); load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    }
  };
  const remove = async (id: number) => { await axiosInstance.delete(`/api/wheel/admin/prizes/${id}`).catch(() => {}); load(); };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ my: 3 }}>
          <Typography variant="h4">Vòng quay may mắn</Typography>
          <Button variant="contained" onClick={openNew} startIcon={<Iconify icon="eva:plus-fill" />}>Thêm phần thưởng</Button>
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }}>
          Bật/tắt vòng quay và cấu hình phí, lượt miễn phí ở{' '}
          <NextLink href={PATH_DASHBOARD.admin.settings} style={{ fontWeight: 600 }}>Cài đặt cửa hàng</NextLink>.
        </Alert>

        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nhãn</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell align="right">Giá trị</TableCell>
                <TableCell align="right">Trọng số</TableCell>
                <TableCell align="right">Kho</TableCell>
                <TableCell align="right">Đã trúng</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: p.color }} />
                      {p.label}
                    </Stack>
                  </TableCell>
                  <TableCell>{TYPES.find((t) => t.value === p.type)?.label}</TableCell>
                  <TableCell align="right">{p.type === 'voucher' ? p.voucher_code : p.value}</TableCell>
                  <TableCell align="right">{p.weight}</TableCell>
                  <TableCell align="right">{p.stock < 0 ? '∞' : p.stock}</TableCell>
                  <TableCell align="right">{p.won_count}</TableCell>
                  <TableCell align="center">
                    <Label color={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Bật' : 'Tắt'}</Label>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(p)}><Iconify icon="solar:pen-bold" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove(p.id)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>Chưa có phần thưởng</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editId ? 'Sửa phần thưởng' : 'Thêm phần thưởng'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Nhãn" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <TextField select label="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              {form.type === 'voucher' ? (
                <TextField label="Mã giảm giá trao khi trúng" value={form.voucher_code} onChange={(e) => setForm({ ...form, voucher_code: e.target.value })} />
              ) : form.type !== 'none' ? (
                <TextField type="number" label="Giá trị (điểm/đ)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              ) : null}
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Trọng số (xác suất)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} fullWidth />
                <TextField type="number" label="Kho (-1 = ∞)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} fullWidth />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField type="color" label="Màu" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} sx={{ width: 90 }} />
                <TextField type="number" label="Thứ tự" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} fullWidth />
              </Stack>
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
        </Dialog>
      </Container>
    </RoleBasedGuard>
  );
}
