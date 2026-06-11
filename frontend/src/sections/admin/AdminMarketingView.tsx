import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
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
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import AdminBannerForm from './AdminBannerForm';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'banners', label: 'Banner', icon: 'solar:gallery-wide-bold' },
  { value: 'flash', label: 'Flash sale', icon: 'solar:bolt-bold' },
  { value: 'gift', label: 'Mã giảm giá', icon: 'solar:ticket-bold' },
  { value: 'announce', label: 'Thông báo', icon: 'solar:bell-bold' },
];

export default function AdminMarketingView() {
  const [tab, setTab] = useState('banners');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <AdminPageHeader title="Marketing" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} icon={<Iconify icon={t.icon} />} iconPosition="start" />
        ))}
      </Tabs>
      {tab === 'banners' && <BannersTab />}
      {tab === 'flash' && <FlashTab />}
      {tab === 'gift' && <GiftTab />}
      {tab === 'announce' && <AnnounceTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------

function useSnack() {
  const { enqueueSnackbar } = useSnackbar();
  return {
    ok: (m: string) => enqueueSnackbar(m),
    err: (e: any, fb = 'Có lỗi xảy ra') => enqueueSnackbar(e?.detail || e?.message || fb, { variant: 'error' }),
  };
}
const Loading = () => (
  <Stack alignItems="center" sx={{ py: 8 }}>
    <CircularProgress />
  </Stack>
);

// ----------------------------------------------------------------------
// BANNERS

export function BannersTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // editing: 'new' = tạo mới, object = đang sửa, null = danh sách
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/banners/all').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/banners/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  // Trang form đầy đủ (tạo/sửa) — thay popup cũ.
  if (editing !== null) {
    return (
      <AdminBannerForm
        current={editing === 'new' ? null : editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setEditing('new')}>
          Thêm banner
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ảnh</TableCell>
              <TableCell>Tiêu đề</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Thứ tự</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>
                  <Image src={b.imageUrl} alt={b.title} sx={{ width: 80, height: 44, borderRadius: 1 }} />
                </TableCell>
                <TableCell>{b.title}</TableCell>
                <TableCell>
                  <Label variant="soft">{b.bannerType}</Label>
                </TableCell>
                <TableCell>{b.sortOrder}</TableCell>
                <TableCell>
                  <Label color={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Hiện' : 'Ẩn'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setEditing(b)}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton color="error" onClick={() => setToDelete(b)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có banner
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá banner"
        content={`Xoá "${toDelete?.title}"?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// FLASH SALES

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function FlashTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  const now = new Date();
  const in7 = new Date(Date.now() + 7 * 86400000);
  const [productId, setProductId] = useState<number | ''>('');
  const [packageId, setPackageId] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState('');
  const [qty, setQty] = useState('0');
  const [startsAt, setStartsAt] = useState(toLocalInput(now));
  const [endsAt, setEndsAt] = useState(toLocalInput(in7));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axiosInstance.get('/api/admin/flash-sales'),
      axiosInstance.get('/api/products', { params: { active: 'all', limit: 200 } }),
    ])
      .then(([f, p]) => {
        setRows(f.data || []);
        setProducts(p.data?.items || []);
      })
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const packages = products.find((p) => p.id === productId)?.packages || [];

  const create = async () => {
    if (!packageId || !salePrice) {
      err({}, 'Chọn gói và nhập giá sale');
      return;
    }
    try {
      await axiosInstance.post('/api/admin/flash-sales', {
        package_id: packageId,
        sale_price: Number(salePrice),
        quantity_limit: Number(qty) || 0,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      });
      ok('Đã tạo flash sale');
      setOpen(false);
      setProductId('');
      setPackageId('');
      setSalePrice('');
      load();
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/admin/flash-sales/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setOpen(true)}>
          Tạo flash sale
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sản phẩm / Gói</TableCell>
              <TableCell align="right">Giá gốc</TableCell>
              <TableCell align="right">Giá sale</TableCell>
              <TableCell align="center">Đã bán/Giới hạn</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Typography variant="body2">{s.package?.product?.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    {s.package?.name}
                  </Typography>
                </TableCell>
                <TableCell align="right">{fCurrency(s.package?.price)}</TableCell>
                <TableCell align="right" sx={{ color: 'error.main' }}>
                  {fCurrency(s.salePrice)}
                </TableCell>
                <TableCell align="center">
                  {s.quantitySold || 0}/{s.quantityLimit || '∞'}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {new Date(s.startsAt).toLocaleString('vi-VN')}
                  <br />→ {new Date(s.endsAt).toLocaleString('vi-VN')}
                </TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => setToDelete(s)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có flash sale
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo flash sale</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField select label="Sản phẩm" value={productId} onChange={(e) => { setProductId(Number(e.target.value)); setPackageId(''); }}>
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Gói" value={packageId} disabled={!productId} onChange={(e) => setPackageId(Number(e.target.value))}>
              {packages.map((pk: any) => (
                <MenuItem key={pk.id} value={pk.id}>
                  {pk.name} — {fCurrency(pk.price)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Giá sale (VNĐ)" type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            <TextField label="Giới hạn số lượng (0 = không giới hạn)" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            <TextField label="Bắt đầu" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Kết thúc" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOpen(false)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={create}>
            Tạo
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá flash sale"
        content="Xoá flash sale này?"
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// GIFT CODES

const GIFT_EMPTY = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  min_order: '',
  max_discount: '',
  usage_limit: '0',
  per_user_limit: '1',
  expires_at: '',
  is_public: false,
  is_active: true,
  description: '',
  scope_type: 'all',
  scope_ids: [] as number[],
  payment_scope: 'all',
  allowed_rank_ids: [] as number[],
};

export function GiftTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof GIFT_EMPTY | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  // Dữ liệu cho bộ chọn phạm vi.
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/admin/gift-codes').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);
  useEffect(() => {
    axiosInstance.get('/api/products', { params: { limit: 300 } }).then((r) => setProducts(r.data?.products || r.data?.items || [])).catch(() => {});
    axiosInstance.get('/api/categories').then((r) => setCategories(Array.isArray(r.data) ? r.data : r.data?.items || [])).catch(() => {});
    axiosInstance.get('/api/admin/ranks').then((r) => setRanks(r.data?.items || [])).catch(() => {});
  }, []);

  const create = async () => {
    if (!form) return;
    if (!form.code.trim() || !form.discount_value) {
      err({}, 'Nhập mã và giá trị giảm');
      return;
    }
    try {
      await axiosInstance.post('/api/admin/gift-codes', {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order: Number(form.min_order) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: Number(form.usage_limit) || 0,
        per_user_limit: Number(form.per_user_limit) || 1,
        expires_at: form.expires_at || null,
        is_public: form.is_public,
        is_active: form.is_active,
        description: form.description,
        scope_type: form.scope_type,
        scope_ids: form.scope_type === 'all' ? [] : form.scope_ids,
        payment_scope: form.payment_scope,
        allowed_rank_ids: form.allowed_rank_ids,
      });
      ok('Đã tạo mã');
      setForm(null);
      load();
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/admin/gift-codes/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...GIFT_EMPTY })}>
          Tạo mã giảm giá
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã</TableCell>
              <TableCell>Giảm</TableCell>
              <TableCell align="right">Đơn tối thiểu</TableCell>
              <TableCell align="center">Lượt dùng</TableCell>
              <TableCell align="center">Công khai</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{g.code}</TableCell>
                <TableCell>{g.discountType === 'percent' ? `${g.discountValue}%` : fCurrency(g.discountValue)}</TableCell>
                <TableCell align="right">{fCurrency(g.minOrder)}</TableCell>
                <TableCell align="center">
                  {g.usageCount || 0}/{g.usageLimit || '∞'}
                </TableCell>
                <TableCell align="center">{g.isPublic ? '✓' : '—'}</TableCell>
                <TableCell align="center">
                  <Label color={g.isActive ? 'success' : 'default'}>{g.isActive ? 'Bật' : 'Tắt'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => setToDelete(g)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có mã giảm giá
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo mã giảm giá</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Mã (VD: SALE10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField select label="Loại" sx={{ width: 140 }} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                  <MenuItem value="percent">Phần trăm %</MenuItem>
                  <MenuItem value="fixed">Số tiền</MenuItem>
                </TextField>
                <TextField fullWidth label={form.discount_type === 'percent' ? 'Giảm (%)' : 'Giảm (VNĐ)'} type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Đơn tối thiểu" type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
                <TextField fullWidth label="Giảm tối đa" type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Tổng lượt (0=∞)" type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
                <TextField fullWidth label="Lượt/người" type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} />
              </Stack>
              <TextField label="Hết hạn" type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField label="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              {/* Phạm vi áp dụng */}
              <Stack direction="row" spacing={2}>
                <TextField select fullWidth label="Áp dụng cho" value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_ids: [] })}>
                  <MenuItem value="all">Tất cả sản phẩm/dịch vụ</MenuItem>
                  <MenuItem value="product">Sản phẩm chỉ định</MenuItem>
                  <MenuItem value="category">Theo danh mục</MenuItem>
                </TextField>
                <TextField select fullWidth label="Cơ chế thanh toán" value={form.payment_scope} onChange={(e) => setForm({ ...form, payment_scope: e.target.value })}>
                  <MenuItem value="all">Mọi hình thức</MenuItem>
                  <MenuItem value="wallet">Số dư ví</MenuItem>
                  <MenuItem value="sepay">Chuyển khoản VietQR</MenuItem>
                </TextField>
              </Stack>

              {form.scope_type === 'product' && (
                <Autocomplete
                  multiple size="small" options={products}
                  getOptionLabel={(o: any) => o.name || ''}
                  value={products.filter((p: any) => form.scope_ids.includes(Number(p.id)))}
                  onChange={(_, v) => setForm({ ...form, scope_ids: v.map((x: any) => Number(x.id)) })}
                  renderInput={(p) => <TextField {...p} label="Chọn sản phẩm" />}
                />
              )}
              {form.scope_type === 'category' && (
                <Autocomplete
                  multiple size="small" options={categories}
                  getOptionLabel={(o: any) => o.name || ''}
                  value={categories.filter((c: any) => form.scope_ids.includes(Number(c.id)))}
                  onChange={(_, v) => setForm({ ...form, scope_ids: v.map((x: any) => Number(x.id)) })}
                  renderInput={(p) => <TextField {...p} label="Chọn danh mục" />}
                />
              )}

              {ranks.length > 0 && (
                <Autocomplete
                  multiple size="small" options={ranks}
                  getOptionLabel={(o: any) => o.name || ''}
                  value={ranks.filter((r: any) => form.allowed_rank_ids.includes(Number(r.id)))}
                  onChange={(_, v) => setForm({ ...form, allowed_rank_ids: v.map((x: any) => Number(x.id)) })}
                  renderInput={(p) => <TextField {...p} label="Hạng được nhận (trống = mọi hạng)" />}
                />
              )}

              <Stack direction="row" spacing={2}>
                <FormControlLabel control={<Checkbox checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />} label="Công khai" />
                <FormControlLabel control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Kích hoạt" />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setForm(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={create}>
            Tạo
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá mã giảm giá"
        content={`Xoá mã "${toDelete?.code}"?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// ANNOUNCEMENTS

const ANNOUNCE_TYPES = ['info', 'success', 'warning', 'error'];
const ANNOUNCE_EMPTY = { id: 0, title: '', content: '', type: 'info', sort_order: 0, is_active: true };

export function AnnounceTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof ANNOUNCE_EMPTY | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [bc, setBc] = useState<{ title: string; body: string } | null>(null);
  const [sending, setSending] = useState(false);

  const broadcast = async () => {
    if (!bc?.title.trim()) {
      err({}, 'Nhập tiêu đề');
      return;
    }
    setSending(true);
    try {
      const r = await axiosInstance.post('/api/admin/notifications/broadcast', { title: bc.title, body: bc.body, type: 'system' });
      ok(`Đã gửi tới ${r.data?.sent ?? 0} người dùng`);
      setBc(null);
    } catch (e) {
      err(e);
    } finally {
      setSending(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/announcements/admin/all').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      err({}, 'Nhập tiêu đề');
      return;
    }
    const payload = { title: form.title, content: form.content, type: form.type, sort_order: Number(form.sort_order) || 0, is_active: form.is_active };
    try {
      if (form.id) await axiosInstance.patch(`/api/admin/announcements/${form.id}`, payload);
      else await axiosInstance.post('/api/admin/announcements', payload);
      ok('Đã lưu thông báo');
      setForm(null);
      load();
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/admin/announcements/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2 }}>
        <Button color="inherit" startIcon={<Iconify icon="solar:bell-bing-bold" />} onClick={() => setBc({ title: '', body: '' })}>
          Gửi chuông tới tất cả
        </Button>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...ANNOUNCE_EMPTY })}>
          Thêm thông báo
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tiêu đề</TableCell>
              <TableCell>Nội dung</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Thứ tự</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.title}</TableCell>
                <TableCell sx={{ maxWidth: 280, color: 'text.secondary', fontSize: 13 }}>
                  <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</Box>
                </TableCell>
                <TableCell>
                  <Label variant="soft" color={(a.type === 'error' && 'error') || (a.type === 'warning' && 'warning') || (a.type === 'success' && 'success') || 'info'}>
                    {a.type}
                  </Label>
                </TableCell>
                <TableCell>{a.sortOrder}</TableCell>
                <TableCell>
                  <Label color={a.isActive ? 'success' : 'default'}>{a.isActive ? 'Hiện' : 'Ẩn'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setForm({ id: a.id, title: a.title, content: a.content || '', type: a.type, sort_order: a.sortOrder, is_active: a.isActive })}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton color="error" onClick={() => setToDelete(a)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có thông báo
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Sửa thông báo' : 'Thêm thông báo'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField label="Nội dung" multiline rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <TextField select label="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ANNOUNCE_TYPES.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Thứ tự" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              <FormControlLabel control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Hiển thị" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setForm(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={save}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!bc} onClose={() => setBc(null)} fullWidth maxWidth="sm">
        <DialogTitle>Gửi thông báo chuông tới tất cả người dùng</DialogTitle>
        <DialogContent>
          {bc && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tiêu đề" value={bc.title} onChange={(e) => setBc({ ...bc, title: e.target.value })} autoFocus />
              <TextField label="Nội dung" multiline rows={3} value={bc.body} onChange={(e) => setBc({ ...bc, body: e.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setBc(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={broadcast} disabled={sending} startIcon={<Iconify icon="solar:plain-bold" />}>
            Gửi
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá thông báo"
        content={`Xoá "${toDelete?.title}"?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Card>
  );
}
