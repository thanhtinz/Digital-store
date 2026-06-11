import { useEffect, useState } from 'react';
// @mui
import {
  Box, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Alert,
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

const TYPES = [
  { value: 'points', label: 'Điểm thưởng' },
  { value: 'balance', label: 'Số dư (đ)' },
  { value: 'voucher', label: 'Mã giảm giá (tự sinh)' },
  { value: 'product', label: 'Sản phẩm (giao tự động)' },
  { value: 'none', label: 'Chúc may mắn (trượt)' },
];

const empty = {
  label: '', type: 'points', value: 0, voucher_code: '', weight: 10, color: '#00AB55', stock: -1,
  is_active: true, sort_order: 0, image_url: '', segment_index: 0, package_id: '',
  giftcode_type: 'percent', giftcode_value: '', giftcode_min_order: '', giftcode_max_discount: '',
  giftcode_expiry_days: '', giftcode_prefix: 'LUCKY',
};

export default function AdminWheelView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [cfg, setCfg] = useState<any>({ enabled: false, cost_points: 0, free_daily: 0, image_url: '', segments: 0 });
  const [history, setHistory] = useState<any[]>([]);

  const load = () => axiosInstance.get('/api/wheel/admin/prizes').then((r) => setItems(r.data?.items || [])).catch(() => {});
  const loadCfg = () => axiosInstance.get('/api/wheel/admin/config').then((r) => setCfg(r.data || {})).catch(() => {});
  const loadHistory = () => axiosInstance.get('/api/wheel/admin/history', { params: { limit: 100 } }).then((r) => setHistory(r.data?.items || [])).catch(() => {});
  useEffect(() => { load(); loadCfg(); loadHistory(); }, []);

  const saveCfg = async (patch: any) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    try { await axiosInstance.post('/api/wheel/admin/config', next); enqueueSnackbar('Đã lưu cấu hình'); }
    catch (e: any) { enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' }); }
  };

  const uploadWheelImage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axiosInstance.post('/api/banners/admin/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data?.url || r.data?.image_url || (r.data?.id ? `/api/images/${r.data.id}` : '');
      if (url) await saveCfg({ image_url: url });
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Tải ảnh thất bại', { variant: 'error' });
    }
  };

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (p: any) => {
    setForm({
      label: p.label, type: p.type, value: p.value, voucher_code: p.voucher_code || '', weight: p.weight,
      color: p.color, stock: p.stock, is_active: p.is_active, sort_order: p.sort_order,
      image_url: p.image_url || '', segment_index: p.segment_index || 0, package_id: p.package_id || '',
      giftcode_type: p.giftcode_type || 'percent', giftcode_value: p.giftcode_value ?? '',
      giftcode_min_order: p.giftcode_min_order ?? '', giftcode_max_discount: p.giftcode_max_discount ?? '',
      giftcode_expiry_days: p.giftcode_expiry_days ?? '', giftcode_prefix: p.giftcode_prefix || 'LUCKY',
    });
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

  const reset = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Reset toàn bộ vòng quay? Sẽ xoá hết lịch sử quay và đưa số lượt đã trúng về 0.')) return;
    try {
      await axiosInstance.post('/api/wheel/admin/reset');
      enqueueSnackbar('Đã reset vòng quay');
      load(); loadHistory();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Reset thất bại', { variant: 'error' });
    }
  };

  // Tổng trọng số phần thưởng đang bật -> tính % thực tế mỗi ô.
  const totalWeight = items.filter((p) => p.is_active).reduce((s, p) => s + Math.max(1, Number(p.weight) || 1), 0) || 1;
  const pctOf = (p: any) => (p.is_active ? ((Math.max(1, Number(p.weight) || 1) / totalWeight) * 100).toFixed(1) : '0');

  // % ước lượng cho phần thưởng đang tạo/sửa trong dialog.
  const formWeight = Math.max(1, Number(form.weight) || 1);
  const othersWeight = items
    .filter((p) => p.is_active && p.id !== editId)
    .reduce((s, p) => s + Math.max(1, Number(p.weight) || 1), 0);
  const livePct = ((formWeight / (othersWeight + formWeight)) * 100).toFixed(1);

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader
        title="Vòng quay may mắn"
        action={
          <Stack direction="row" spacing={1}>
            <Button color="error" variant="outlined" onClick={reset} startIcon={<Iconify icon="solar:restart-bold" />}>Reset</Button>
            <Button variant="contained" onClick={openNew} startIcon={<Iconify icon="eva:plus-fill" />}>Thêm phần thưởng</Button>
          </Stack>
        }
      />

        <FeatureToggle
          configKey="wheel_enabled"
          label="Vòng quay may mắn"
          description="Hiển thị vòng quay cho khách trên cửa hàng."
          icon="solar:wheel-bold-duotone"
        />

        {/* Cấu hình vòng quay + ảnh tải lên */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Cấu hình vòng quay</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 160, height: 160, borderRadius: '50%', mx: 'auto', mb: 1, border: '4px solid #fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,.2)', bgcolor: 'background.neutral',
                  backgroundImage: cfg.image_url ? `url(${cfg.image_url})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  display: 'grid', placeItems: 'center',
                }}
              >
                {!cfg.image_url && <Iconify icon="solar:gallery-bold" width={36} sx={{ color: 'text.disabled' }} />}
              </Box>
              <Button component="label" size="small" startIcon={<Iconify icon="solar:upload-bold" />}>
                Tải ảnh vòng quay
                <input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadWheelImage(e.target.files[0])} />
              </Button>
            </Box>
            <Stack spacing={2} sx={{ flexGrow: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField type="number" label="Số ô trên ảnh" size="small" fullWidth value={cfg.segments ?? 0}
                  onChange={(e) => setCfg({ ...cfg, segments: Number(e.target.value) })} onBlur={() => saveCfg({ segments: cfg.segments })}
                  helperText="Khớp số ô trên ảnh vòng quay" />
                <TextField type="number" label="Phí/lượt (điểm)" size="small" fullWidth value={cfg.cost_points ?? 0}
                  onChange={(e) => setCfg({ ...cfg, cost_points: Number(e.target.value) })} onBlur={() => saveCfg({ cost_points: cfg.cost_points })} />
                <TextField type="number" label="Lượt free/ngày" size="small" fullWidth value={cfg.free_daily ?? 0}
                  onChange={(e) => setCfg({ ...cfg, free_daily: Number(e.target.value) })} onBlur={() => saveCfg({ free_daily: cfg.free_daily })} />
              </Stack>
              <Alert severity="info">
                Tải ảnh vòng quay, đặt <b>số ô</b> đúng bằng số phần trên ảnh, rồi với mỗi phần thưởng đặt
                <b> vị trí ô</b> (0 = ô trên cùng, tăng theo chiều kim đồng hồ) để khớp với ảnh.
              </Alert>
            </Stack>
          </Stack>
        </Card>

        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nhãn</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell align="right">Giá trị</TableCell>
                <TableCell align="right">Tỉ lệ trúng</TableCell>
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
                  <TableCell align="right">{pctOf(p)}%</TableCell>
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
          </TableContainer>
        </Card>

        {/* Lịch sử lượt quay */}
        <Card sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ p: 3, pb: 1 }}>Lịch sử quay gần đây</Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Người chơi</TableCell>
                  <TableCell>Phần thưởng</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell align="right">Giá trị / Mã</TableCell>
                  <TableCell align="right">Phí (điểm)</TableCell>
                  <TableCell align="right">Thời gian</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>
                      <Typography variant="body2" noWrap>{h.user_name || h.user_email}</Typography>
                      {h.user_name && <Typography variant="caption" color="text.secondary" noWrap>{h.user_email}</Typography>}
                    </TableCell>
                    <TableCell>{h.prize_label}</TableCell>
                    <TableCell><Label variant="soft">{TYPES.find((t) => t.value === h.type)?.label || h.type}</Label></TableCell>
                    <TableCell align="right">{h.type === 'voucher' ? (h.giftcode || '—') : h.value || '—'}</TableCell>
                    <TableCell align="right">{h.cost_points || 0}</TableCell>
                    <TableCell align="right">{new Date(h.created_at).toLocaleString('vi-VN')}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Chưa có lượt quay nào</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editId ? 'Sửa phần thưởng' : 'Thêm phần thưởng'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Nhãn" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <TextField select label="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              {(form.type === 'points' || form.type === 'balance') && (
                <TextField type="number" label="Giá trị (điểm/đ)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              )}
              <Stack direction="row" spacing={2}>
                <TextField
                  type="number" label="Tỉ lệ trúng (%)" value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })} fullWidth
                  helperText={`Hệ thống tự chuẩn hoá tổng về 100%. Thực tế ≈ ${livePct}%`}
                />
                <TextField type="number" label="Kho (-1 = ∞)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} fullWidth />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField type="color" label="Màu" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} sx={{ width: 90 }} />
                <TextField type="number" label="Thứ tự" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} fullWidth />
                <TextField type="number" label="Vị trí ô trên ảnh" value={form.segment_index} onChange={(e) => setForm({ ...form, segment_index: e.target.value })} fullWidth
                  helperText="0 = ô trên cùng" />
              </Stack>

              {form.type === 'product' && (
                <TextField type="number" label="ID gói sản phẩm (package_id)" value={form.package_id}
                  onChange={(e) => setForm({ ...form, package_id: e.target.value })}
                  helperText="Trúng sẽ tự tạo đơn giá 0 + giao gói này. Lấy ID gói ở trang Sản phẩm." />
              )}

              {form.type === 'voucher' && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Giftcode tự sinh khi trúng</Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                      <TextField select size="small" label="Loại" value={form.giftcode_type} onChange={(e) => setForm({ ...form, giftcode_type: e.target.value })} sx={{ minWidth: 130 }}>
                        <MenuItem value="percent">Giảm %</MenuItem>
                        <MenuItem value="amount">Giảm tiền</MenuItem>
                      </TextField>
                      <TextField size="small" type="number" label="Giá trị" fullWidth value={form.giftcode_value} onChange={(e) => setForm({ ...form, giftcode_value: e.target.value })} />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                      <TextField size="small" type="number" label="Đơn tối thiểu" fullWidth value={form.giftcode_min_order} onChange={(e) => setForm({ ...form, giftcode_min_order: e.target.value })} />
                      <TextField size="small" type="number" label="Giảm tối đa" fullWidth value={form.giftcode_max_discount} onChange={(e) => setForm({ ...form, giftcode_max_discount: e.target.value })} />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                      <TextField size="small" type="number" label="Hết hạn sau (ngày)" fullWidth value={form.giftcode_expiry_days} onChange={(e) => setForm({ ...form, giftcode_expiry_days: e.target.value })} />
                      <TextField size="small" label="Tiền tố mã" fullWidth value={form.giftcode_prefix} onChange={(e) => setForm({ ...form, giftcode_prefix: e.target.value })} />
                    </Stack>
                    <TextField size="small" label="Hoặc mã cố định (bỏ trống nếu tự sinh)" value={form.voucher_code} onChange={(e) => setForm({ ...form, voucher_code: e.target.value })} />
                  </Stack>
                </Box>
              )}

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
