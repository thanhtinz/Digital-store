import { useEffect, useState } from 'react';
// @mui
import {
  Button,
  Card,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';
import ImageUploadField from './ImageUploadField';

// ----------------------------------------------------------------------

const Loading = () => (
  <Stack alignItems="center" sx={{ py: 8 }}>
    <CircularProgress />
  </Stack>
);

export default function AdminRewardsView() {
  const [tab, setTab] = useState('config');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <AdminPageHeader title="Điểm thưởng & Đổi thưởng" />

        <FeatureToggle
          configKey="loyalty_enabled"
          label="Điểm thưởng"
          description="Tích điểm, điểm danh, đổi thưởng cho khách."
          icon="solar:gift-bold-duotone"
        />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="config" label="Cấu hình điểm" icon={<Iconify icon="solar:settings-bold" />} iconPosition="start" />
        <Tab value="checkin" label="Điểm danh" icon={<Iconify icon="solar:calendar-mark-bold" />} iconPosition="start" />
        <Tab value="rewards" label="Đổi thưởng" icon={<Iconify icon="solar:gift-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'config' && <ConfigTab />}
      {tab === 'checkin' && <CheckinTab />}
      {tab === 'rewards' && <RewardsTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// TAB 1: Cấu hình tích/đổi điểm

function ConfigTab() {
  const { enqueueSnackbar } = useSnackbar();
  const [v, setV] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/api/admin/settings').then((r) => setV(r.data || {})).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.patch('/api/admin/settings', {
        loyalty_enabled: v.loyalty_enabled === '1' ? '1' : '0',
        loyalty_earn_per: v.loyalty_earn_per || '1000',
        loyalty_redeem_value: v.loyalty_redeem_value || '100',
        loyalty_min_redeem: v.loyalty_min_redeem || '100',
        loyalty_max_percent: v.loyalty_max_percent || '50',
      });
      enqueueSnackbar('Đã lưu cấu hình điểm thưởng');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card sx={{ p: 3, maxWidth: 560 }}>
      <Stack spacing={2.5}>
        <FormControlLabel
          control={<Switch checked={v.loyalty_enabled === '1'} onChange={(e) => set('loyalty_enabled', e.target.checked ? '1' : '0')} />}
          label="Bật hệ thống điểm thưởng"
        />
        <TextField
          type="number"
          label="Số tiền để được 1 điểm (đồng)"
          helperText="Ví dụ 1000 = mua 1.000đ được 1 điểm"
          value={v.loyalty_earn_per ?? '1000'}
          onChange={(e) => set('loyalty_earn_per', e.target.value)}
        />
        <TextField
          type="number"
          label="1 điểm đổi được bao nhiêu đồng"
          helperText="Ví dụ 100 = 1 điểm giảm 100đ"
          value={v.loyalty_redeem_value ?? '100'}
          onChange={(e) => set('loyalty_redeem_value', e.target.value)}
        />
        <TextField
          type="number"
          label="Số điểm tối thiểu mỗi lần đổi"
          value={v.loyalty_min_redeem ?? '100'}
          onChange={(e) => set('loyalty_min_redeem', e.target.value)}
        />
        <TextField
          type="number"
          label="% tối đa của đơn được trả bằng điểm"
          value={v.loyalty_max_percent ?? '50'}
          onChange={(e) => set('loyalty_max_percent', e.target.value)}
        />
        <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
          Lưu cấu hình
        </Button>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------
// TAB 2: Điểm danh (bật + mốc ngày → điểm)

type Milestone = { day: number; points: number };

function CheckinTab() {
  const { enqueueSnackbar } = useSnackbar();
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/admin/settings')
      .then((r) => {
        const d = r.data || {};
        setEnabled(d.checkin_enabled === '1');
        let ms: Milestone[] = [];
        try {
          ms = d.checkin_rewards ? JSON.parse(d.checkin_rewards) : [];
        } catch {
          ms = [];
        }
        if (!ms.length) ms = [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, points: day === 7 ? 10 : day }));
        setRows(ms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setRow = (i: number, key: keyof Milestone, val: number) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addRow = () => setRows((p) => [...p, { day: p.length + 1, points: 1 }]);
  const delRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const clean = rows
        .map((r) => ({ day: Number(r.day) || 0, points: Math.max(0, Number(r.points) || 0) }))
        .filter((r) => r.day > 0)
        .sort((a, b) => a.day - b.day);
      await axiosInstance.patch('/api/admin/settings', {
        checkin_enabled: enabled ? '1' : '0',
        checkin_rewards: JSON.stringify(clean),
      });
      enqueueSnackbar('Đã lưu cấu hình điểm danh');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card sx={{ p: 3, maxWidth: 560 }}>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
        label="Bật điểm danh hằng ngày"
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 2 }}>
        Mốc theo ngày của chuỗi điểm danh (lặp vòng khi vượt số mốc). Ví dụ ngày 7 thưởng nhiều hơn.
      </Typography>

      <Stack spacing={1.5}>
        {rows.map((r, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="center">
            <TextField
              type="number"
              label="Ngày"
              size="small"
              sx={{ width: 100 }}
              value={r.day}
              onChange={(e) => setRow(i, 'day', Number(e.target.value))}
            />
            <TextField
              type="number"
              label="Điểm"
              size="small"
              sx={{ width: 120 }}
              value={r.points}
              onChange={(e) => setRow(i, 'points', Number(e.target.value))}
            />
            <IconButton color="error" onClick={() => delRow(i)}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button size="small" startIcon={<Iconify icon="eva:plus-fill" />} onClick={addRow} sx={{ mt: 1.5 }}>
        Thêm mốc
      </Button>

      <Divider sx={{ my: 2 }} />
      <Button variant="contained" onClick={save} disabled={saving}>
        Lưu cấu hình điểm danh
      </Button>
    </Card>
  );
}

// ----------------------------------------------------------------------
// TAB 3: Đổi thưởng (CRUD phần thưởng)

const REWARD_EMPTY = {
  id: 0,
  name: '',
  description: '',
  image_url: '',
  package_id: '' as string | number,
  points_cost: 0,
  stock: '' as string | number,
  per_user_limit: 0,
  ends_at: '',
  is_active: true,
};

function RewardsTab() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof REWARD_EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  const load = () => {
    setLoading(true);
    axiosInstance
      .get('/api/loyalty/admin/rewards')
      .then((r) => setRows(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Lỗi tải', { variant: 'error' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      enqueueSnackbar('Nhập tên phần thưởng', { variant: 'warning' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      image_url: form.image_url,
      package_id: form.package_id || null,
      points_cost: Number(form.points_cost) || 0,
      stock: form.stock === '' ? -1 : Number(form.stock),
      per_user_limit: Number(form.per_user_limit) || 0,
      ends_at: form.ends_at || null,
      is_active: form.is_active,
    };
    try {
      if (form.id) await axiosInstance.patch(`/api/loyalty/admin/rewards/${form.id}`, payload);
      else await axiosInstance.post('/api/loyalty/admin/rewards', payload);
      enqueueSnackbar('Đã lưu phần thưởng');
      setForm(null);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/loyalty/admin/rewards/${toDelete.id}`);
      enqueueSnackbar('Đã xoá');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...REWARD_EMPTY })}>
          Thêm phần thưởng
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>Phần thưởng</TableCell>
            <TableCell align="right">Điểm</TableCell>
            <TableCell align="center">Kho</TableCell>
            <TableCell align="center">Đã đổi</TableCell>
            <TableCell align="center">Trạng thái</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell>{r.name}</TableCell>
              <TableCell align="right">{r.pointsCost}</TableCell>
              <TableCell align="center">{r.stock < 0 ? '∞' : r.stock}</TableCell>
              <TableCell align="center">{r.redeemedCount}</TableCell>
              <TableCell align="center">
                <Label color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Bật' : 'Tắt'}</Label>
              </TableCell>
              <TableCell align="right">
                <IconButton
                  onClick={() =>
                    setForm({
                      id: r.id,
                      name: r.name,
                      description: r.description || '',
                      image_url: r.imageUrl || '',
                      package_id: r.packageId || '',
                      points_cost: r.pointsCost,
                      stock: r.stock < 0 ? '' : r.stock,
                      per_user_limit: r.perUserLimit || 0,
                      ends_at: r.endsAt ? String(r.endsAt).slice(0, 16) : '',
                      is_active: r.isActive,
                    })
                  }
                >
                  <Iconify icon="solar:pen-bold" />
                </IconButton>
                <IconButton color="error" onClick={() => setToDelete(r)}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                Chưa có phần thưởng
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Sửa phần thưởng' : 'Thêm phần thưởng'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tên phần thưởng" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              <TextField label="Mô tả" multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <ImageUploadField label="Ảnh phần thưởng" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth type="number" label="Điểm cần đổi" value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: Number(e.target.value) })} />
                <TextField fullWidth type="number" label="Số lượng (để trống = không giới hạn)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth type="number" label="Giới hạn mỗi người (0 = không)" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
                <TextField fullWidth type="number" label="ID gói tự giao (tùy chọn)" helperText="Lấy từ Sản phẩm → Gói" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} />
              </Stack>
              <TextField
                type="datetime-local"
                label="Kết thúc sự kiện (tùy chọn)"
                InputLabelProps={{ shrink: true }}
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
              <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Đang mở" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setForm(null)}>Huỷ</Button>
          <Button variant="contained" onClick={save} disabled={saving}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá phần thưởng"
        content={`Xoá "${toDelete?.name}"?`}
        action={<Button variant="contained" color="error" onClick={remove}>Xoá</Button>}
      />
    </Card>
  );
}
