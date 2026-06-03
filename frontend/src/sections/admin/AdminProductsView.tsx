import { useEffect, useState } from 'react';
// @mui
import {
  Avatar,
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
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
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

// ----------------------------------------------------------------------

type Pkg = { price: number };
type Product = {
  id: number;
  name: string;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: number | null;
  category?: { id: number; name: string } | null;
  packages?: Pkg[];
};
type Category = { id: number; name: string };

const EMPTY = {
  id: 0,
  name: '',
  description: '',
  image_url: '',
  category_id: '' as string | number,
  is_featured: false,
  is_active: true,
};

function minPrice(p: Product) {
  const prices = (p.packages || []).map((x) => x.price).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

export default function AdminProductsView() {
  const { enqueueSnackbar } = useSnackbar();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [pkgFor, setPkgFor] = useState<Product | null>(null);

  // Sinh mô tả sản phẩm bằng AI (cần cấu hình AI ở Tích hợp/Cài đặt).
  const aiGenerate = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      enqueueSnackbar('Nhập tên sản phẩm trước', { variant: 'warning' });
      return;
    }
    setAiBusy(true);
    try {
      const r = await axiosInstance.post('/api/admin/ai/generate', {
        field_type: 'product_description',
        context: form.name,
        max_tokens: 400,
      });
      if (r.data?.content) setForm((f) => (f ? { ...f, description: r.data.content.trim() } : f));
      enqueueSnackbar('Đã tạo mô tả bằng AI');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'AI tạo mô tả thất bại', { variant: 'error' });
    } finally {
      setAiBusy(false);
    }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      axiosInstance.get('/api/products', { params: { limit: 300 } }),
      axiosInstance.get('/api/categories'),
    ])
      .then(([p, c]) => {
        setProducts(p.data?.items || []);
        setCategories(Array.isArray(c.data) ? c.data : []);
      })
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được dữ liệu', { variant: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => setForm({ ...EMPTY });
  const openEdit = (p: Product) =>
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || '',
      image_url: p.imageUrl || '',
      category_id: p.categoryId || '',
      is_featured: p.isFeatured,
      is_active: p.isActive,
    });

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      enqueueSnackbar('Vui lòng nhập tên sản phẩm', { variant: 'warning' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      image_url: form.image_url,
      category_id: form.category_id || null,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };
    try {
      if (form.id) await axiosInstance.patch(`/api/products/admin/${form.id}`, payload);
      else await axiosInstance.post('/api/products/admin', payload);
      enqueueSnackbar(form.id ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm');
      setForm(null);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await axiosInstance.delete(`/api/products/admin/${toDelete.id}`);
      enqueueSnackbar('Đã xoá sản phẩm');
      setProducts((list) => list.filter((x) => x.id !== toDelete.id));
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Container sx={{ pb: 6 }} maxWidth="lg">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 3 }}>
        <Typography variant="h4">Sản phẩm</Typography>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={openCreate}>
          Thêm sản phẩm
        </Button>
      </Stack>

      <Card>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Danh mục</TableCell>
                  <TableCell>Giá từ</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar variant="rounded" src={p.imageUrl || undefined} sx={{ bgcolor: 'background.neutral' }}>
                          <Iconify icon="solar:box-bold-duotone" />
                        </Avatar>
                        <Typography variant="subtitle2">{p.name}</Typography>
                        {p.isFeatured && <Label color="warning" variant="soft">Nổi bật</Label>}
                      </Stack>
                    </TableCell>
                    <TableCell>{p.category?.name || '—'}</TableCell>
                    <TableCell>{minPrice(p) ? fCurrency(minPrice(p)) : '—'}</TableCell>
                    <TableCell>
                      <Label color={p.isActive ? 'success' : 'default'} variant="soft">
                        {p.isActive ? 'Đang bán' : 'Ẩn'}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Quản lý gói & giá">
                        <IconButton color="primary" onClick={() => setPkgFor(p)}>
                          <Iconify icon="solar:box-minimalistic-bold" />
                        </IconButton>
                      </Tooltip>
                      <IconButton onClick={() => openEdit(p)}>
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                      <IconButton color="error" onClick={() => setToDelete(p)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!products.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Chưa có sản phẩm
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Dialog tạo/sửa */}
      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Tên sản phẩm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
              <TextField
                select
                label="Danh mục"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <MenuItem value="">— Không —</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Ảnh (URL)"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Mô tả
                  </Typography>
                  <Button
                    size="small"
                    onClick={aiGenerate}
                    disabled={aiBusy}
                    startIcon={<Iconify icon={aiBusy ? 'eos-icons:loading' : 'solar:magic-stick-3-bold'} />}
                  >
                    {aiBusy ? 'Đang tạo…' : 'Tạo bằng AI'}
                  </Button>
                </Stack>
                <TextField
                  multiline
                  minRows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_featured}
                      onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    />
                  }
                  label="Nổi bật"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                  }
                  label="Đang bán"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Sau khi lưu, bấm nút <b>Gói &amp; giá</b> (biểu tượng hộp) ở danh sách để thêm gói/giá và trường nhập.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setForm(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá sản phẩm"
        content={`Xoá "${toDelete?.name}"? Hành động không thể hoàn tác.`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />

      <PackagesDialog product={pkgFor} onClose={() => setPkgFor(null)} onChanged={load} />
    </Container>
  );
}

// ----------------------------------------------------------------------
// QUẢN LÝ GÓI + GIÁ của 1 sản phẩm

const DELIVERY_TYPES = [
  { value: 'manual', label: 'Thủ công (admin giao)' },
  { value: 'stock', label: 'Kho có sẵn (tự giao)' },
  { value: 'api', label: 'API nhà cung cấp' },
];
const PKG_EMPTY = {
  id: 0,
  name: '',
  price: 0,
  original_price: 0,
  delivery_type: 'manual',
  sort_order: 0,
  is_active: true,
  api_provider_id: '' as string | number,
  external_product_id: '',
  external_plan_id: '',
  auto_markup: false,
  markup_percent: 0,
};

function PackagesDialog({ product, onClose, onChanged }: { product: any; onClose: VoidFunction; onChanged: VoidFunction }) {
  const { enqueueSnackbar } = useSnackbar();
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<typeof PKG_EMPTY | null>(null);
  const [fieldsFor, setFieldsFor] = useState<any>(null);
  const [apiProviders, setApiProviders] = useState<any[]>([]);
  const [remoteProducts, setRemoteProducts] = useState<any[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  // Nạp nguồn topup_game (để map gói giao hàng API).
  useEffect(() => {
    if (product) {
      axiosInstance
        .get('/api/api-providers')
        .then((r) => setApiProviders((r.data || []).filter((p: any) => p.provider_type === 'topup_game' && p.is_active)))
        .catch(() => {});
    }
  }, [product]);

  const loadRemote = async (providerId: number | string) => {
    if (!providerId) return;
    setLoadingRemote(true);
    try {
      const r = await axiosInstance.get(`/api/api-providers/${providerId}/remote-products`);
      setRemoteProducts(r.data || []);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Không tải được sản phẩm nguồn', { variant: 'error' });
    } finally {
      setLoadingRemote(false);
    }
  };

  const load = () => {
    if (!product) return;
    setLoading(true);
    axiosInstance
      .get(`/api/products/admin/${product.id}/packages`)
      .then((r) => setPkgs(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Lỗi tải gói', { variant: 'error' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (product) {
      load();
      setForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      enqueueSnackbar('Nhập tên gói', { variant: 'warning' });
      return;
    }
    const isApi = form.delivery_type === 'api';
    const payload = {
      name: form.name,
      price: Number(form.price) || 0,
      original_price: Number(form.original_price) || null,
      delivery_type: form.delivery_type,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      api_provider_id: isApi && form.api_provider_id ? Number(form.api_provider_id) : null,
      external_product_id: isApi ? form.external_product_id || null : null,
      external_plan_id: isApi ? form.external_plan_id || null : null,
      auto_markup: isApi ? form.auto_markup : false,
      markup_percent: isApi ? Number(form.markup_percent) || null : null,
    };
    try {
      if (form.id) await axiosInstance.patch(`/api/products/admin/packages/${form.id}`, payload);
      else await axiosInstance.post(`/api/products/admin/${product.id}/packages`, payload);
      enqueueSnackbar('Đã lưu gói');
      setForm(null);
      load();
      onChanged();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    }
  };
  const del = async (id: number) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Xoá gói này?')) return;
    try {
      await axiosInstance.delete(`/api/products/admin/packages/${id}`);
      enqueueSnackbar('Đã xoá gói');
      load();
      onChanged();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    }
  };

  return (
    <Dialog open={!!product} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Gói & giá — {product?.name}</DialogTitle>
      <DialogContent>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button size="small" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...PKG_EMPTY })}>
            Thêm gói
          </Button>
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Gói</TableCell>
                <TableCell align="right">Giá</TableCell>
                <TableCell align="right">Giá gốc</TableCell>
                <TableCell>Giao hàng</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pkgs.map((pk) => (
                <TableRow key={pk.id} hover>
                  <TableCell>{pk.name}</TableCell>
                  <TableCell align="right">{fCurrency(pk.price)}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.disabled' }}>
                    {pk.originalPrice ? fCurrency(pk.originalPrice) : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{pk.deliveryType}</TableCell>
                  <TableCell align="center">
                    <Label color={pk.isActive ? 'success' : 'default'}>{pk.isActive ? 'Bật' : 'Tắt'}</Label>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Trường nhập thông tin">
                      <IconButton size="small" onClick={() => setFieldsFor(pk)}>
                        <Iconify icon="solar:list-check-bold" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setForm({
                          id: pk.id,
                          name: pk.name,
                          price: pk.price,
                          original_price: pk.originalPrice || 0,
                          delivery_type: pk.deliveryType || 'manual',
                          sort_order: pk.sortOrder || 0,
                          is_active: pk.isActive,
                          api_provider_id: pk.apiProviderId || '',
                          external_product_id: pk.externalProductId || '',
                          external_plan_id: pk.externalPlanId || '',
                          auto_markup: !!pk.autoMarkup,
                          markup_percent: pk.markupPercent || 0,
                        })
                      }
                    >
                      <Iconify icon="solar:pen-bold" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => del(pk.id)}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!pkgs.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Chưa có gói — thêm gói để sản phẩm có giá bán.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {form && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              {form.id ? 'Sửa gói' : 'Thêm gói'}
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Tên gói" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <TextField select label="Giao hàng" sx={{ minWidth: 200 }} value={form.delivery_type} onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}>
                  {DELIVERY_TYPES.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth type="number" label="Giá bán (VNĐ)" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                <TextField fullWidth type="number" label="Giá gốc (gạch ngang, tuỳ chọn)" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
                <TextField type="number" label="Thứ tự" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </Stack>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                label="Đang bán"
              />

              {form.delivery_type === 'api' && (
                <>
                  <Divider>Map sản phẩm nguồn (tự giao qua API)</Divider>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      select
                      fullWidth
                      label="Nguồn cung cấp"
                      value={form.api_provider_id}
                      onChange={(e) => {
                        setForm({ ...form, api_provider_id: e.target.value, external_product_id: '', external_plan_id: '' });
                        loadRemote(e.target.value);
                      }}
                    >
                      {apiProviders.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}
                        </MenuItem>
                      ))}
                      {!apiProviders.length && <MenuItem disabled value="">Chưa có nguồn topup (thêm ở Tích hợp)</MenuItem>}
                    </TextField>
                    <Button variant="outlined" disabled={!form.api_provider_id || loadingRemote} onClick={() => loadRemote(form.api_provider_id)} sx={{ flexShrink: 0 }}>
                      {loadingRemote ? 'Đang tải…' : 'Tải SP nguồn'}
                    </Button>
                  </Stack>
                  {remoteProducts.length > 0 && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        select
                        fullWidth
                        label="Sản phẩm nguồn"
                        value={form.external_product_id}
                        onChange={(e) => setForm({ ...form, external_product_id: e.target.value, external_plan_id: '' })}
                      >
                        {remoteProducts.map((rp) => (
                          <MenuItem key={rp.id} value={rp.id}>
                            {rp.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        fullWidth
                        label="Gói nguồn"
                        value={form.external_plan_id}
                        disabled={!form.external_product_id}
                        onChange={(e) => {
                          const rp = remoteProducts.find((x) => String(x.id) === String(form.external_product_id));
                          const plan = rp?.plans?.find((pl: any) => String(pl.id) === String(e.target.value));
                          setForm({ ...form, external_plan_id: e.target.value, price: form.price || plan?.price || 0 });
                        }}
                      >
                        {(remoteProducts.find((x) => String(x.id) === String(form.external_product_id))?.plans || []).map((pl: any) => (
                          <MenuItem key={pl.id} value={pl.id}>
                            {pl.name} — {fCurrency(pl.price)} {pl.in_stock ? '' : '(hết hàng)'}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControlLabel
                      control={<Switch checked={form.auto_markup} onChange={(e) => setForm({ ...form, auto_markup: e.target.checked })} />}
                      label="Tự tính giá theo markup"
                    />
                    {form.auto_markup && (
                      <TextField type="number" label="Markup (%)" sx={{ maxWidth: 160 }} value={form.markup_percent} onChange={(e) => setForm({ ...form, markup_percent: Number(e.target.value) })} />
                    )}
                  </Stack>
                </>
              )}

              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={save}>
                  Lưu gói
                </Button>
                <Button color="inherit" onClick={() => setForm(null)}>
                  Huỷ
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>

      <FieldsDialog pkg={fieldsFor} onClose={() => setFieldsFor(null)} />
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// TRƯỜNG NHẬP THÔNG TIN (PackageField) của 1 gói

const FIELD_TYPES = ['text', 'email', 'textarea', 'select', 'number'];
const FIELD_EMPTY = { id: 0, field_name: '', field_type: 'text', is_required: true, options: '', sort_order: 0 };

function FieldsDialog({ pkg, onClose }: { pkg: any; onClose: VoidFunction }) {
  const { enqueueSnackbar } = useSnackbar();
  const [fields, setFields] = useState<any[]>([]);
  const [form, setForm] = useState<typeof FIELD_EMPTY | null>(null);

  const load = () => {
    if (!pkg) return;
    axiosInstance
      .get(`/api/products/admin/packages/${pkg.id}/fields`)
      .then((r) => setFields(r.data || []))
      .catch(() => {});
  };
  useEffect(() => {
    if (pkg) {
      load();
      setForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg]);

  const save = async () => {
    if (!form) return;
    if (!form.field_name.trim()) {
      enqueueSnackbar('Nhập tên trường', { variant: 'warning' });
      return;
    }
    const payload = {
      field_name: form.field_name,
      field_type: form.field_type,
      is_required: form.is_required,
      options: form.options,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (form.id) await axiosInstance.patch(`/api/products/admin/fields/${form.id}`, payload);
      else await axiosInstance.post(`/api/products/admin/packages/${pkg.id}/fields`, payload);
      enqueueSnackbar('Đã lưu trường');
      setForm(null);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    }
  };
  const del = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/products/admin/fields/${id}`);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    }
  };

  // Nhập trường từ nguồn topup (nếu gói đã map sản phẩm nguồn).
  const importFromSource = async () => {
    if (!pkg?.apiProviderId || !pkg?.externalProductId) {
      enqueueSnackbar('Gói chưa map sản phẩm nguồn', { variant: 'warning' });
      return;
    }
    try {
      const r = await axiosInstance.get(`/api/api-providers/${pkg.apiProviderId}/remote-products/${pkg.externalProductId}/form-fields`);
      const remote = r.data || [];
      if (!remote.length) {
        enqueueSnackbar('Nguồn không có trường nhập', { variant: 'info' });
        return;
      }
      await Promise.all(
        remote.map((f: any, i: number) =>
          axiosInstance.post(`/api/products/admin/packages/${pkg.id}/fields`, {
            field_name: f.label || f.key,
            field_type: f.type || 'text',
            is_required: f.required !== false,
            options: Array.isArray(f.options) ? f.options.join(',') : '',
            sort_order: i,
          })
        )
      );
      enqueueSnackbar(`Đã nhập ${remote.length} trường từ nguồn`);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Nhập trường thất bại', { variant: 'error' });
    }
  };

  return (
    <Dialog open={!!pkg} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Trường nhập — {pkg?.name}</DialogTitle>
      <DialogContent>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Khách sẽ phải nhập các trường này khi mua (vd: email tài khoản, ID game…).
        </Typography>
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ my: 1 }}>
          {pkg?.apiProviderId && pkg?.externalProductId && (
            <Button size="small" color="inherit" startIcon={<Iconify icon="solar:download-bold" />} onClick={importFromSource}>
              Nhập từ nguồn
            </Button>
          )}
          <Button size="small" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...FIELD_EMPTY })}>
            Thêm trường
          </Button>
        </Stack>
        <Table size="small">
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.id} hover>
                <TableCell>{f.field_name}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{f.field_type}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{f.is_required ? 'Bắt buộc' : 'Tuỳ chọn'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setForm({ id: f.id, field_name: f.field_name, field_type: f.field_type, is_required: f.is_required, options: f.options || '', sort_order: f.sort_order || 0 })}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => del(f.id)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!fields.length && (
              <TableRow>
                <TableCell align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Chưa có trường nhập
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {form && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              <TextField label="Tên trường (nhãn)" value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField select fullWidth label="Loại" value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })}>
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel
                  control={<Switch checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />}
                  label="Bắt buộc"
                />
              </Stack>
              {form.field_type === 'select' && (
                <TextField label="Tuỳ chọn (cách nhau bởi dấu phẩy)" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
              )}
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={save}>
                  Lưu trường
                </Button>
                <Button color="inherit" onClick={() => setForm(null)}>
                  Huỷ
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
