import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
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
import ImageUploadField from './ImageUploadField';
import Editor from '../../components/editor';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'providers', label: 'Nhà cung cấp', icon: 'solar:server-bold' },
  { value: 'catalog', label: 'Nền tảng & Chuyên mục', icon: 'solar:folder-bold' },
  { value: 'services', label: 'Dịch vụ', icon: 'solar:box-bold' },
  { value: 'import', label: 'Import từ nguồn', icon: 'solar:cloud-download-bold' },
  { value: 'orders', label: 'Đơn SMM', icon: 'solar:cart-large-bold' },
];

export default function AdminSmmView() {
  const [tab, setTab] = useState('providers');

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        SMM Panel
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} icon={<Iconify icon={t.icon} />} iconPosition="start" />
        ))}
      </Tabs>

      {tab === 'providers' && <ProvidersTab />}
      {tab === 'catalog' && <CatalogTab />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'import' && <ImportTab />}
      {tab === 'orders' && <OrdersTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// Helpers

function useSnack() {
  const { enqueueSnackbar } = useSnackbar();
  const ok = (m: string) => enqueueSnackbar(m);
  const err = (e: any, fb = 'Có lỗi xảy ra') =>
    enqueueSnackbar(e?.detail || e?.message || fb, { variant: 'error' });
  return { ok, err };
}

function Loading() {
  return (
    <Stack alignItems="center" sx={{ py: 8 }}>
      <CircularProgress />
    </Stack>
  );
}

// ----------------------------------------------------------------------
// PROVIDERS

const PROVIDER_EMPTY = {
  id: 0,
  name: '',
  base_url: '',
  api_key: '',
  is_active: true,
  exchange_rate: 1,
  price_markup: 0,
  currency: 'USD',
  filter_html: true,
  sync_categories: true,
  sync_services: true,
  sync_prices: true,
  sync_descriptions: true,
  sync_advanced: false,
};

function ProvidersTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof PROVIDER_EMPTY | null>(null);
  const [ptab, setPtab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  const openForm = (f: typeof PROVIDER_EMPTY) => {
    setPtab(0);
    setForm(f);
  };

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/smm/providers')
      .then((r) => setRows(r.data || []))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const openEdit = (p: any) => {
    const s = p.settings || {};
    openForm({
      id: p.id,
      name: p.name,
      base_url: p.baseUrl || '',
      api_key: '',
      is_active: p.isActive,
      exchange_rate: Number(s.exchange_rate) || 1,
      price_markup: Number(s.price_markup) || 0,
      currency: s.currency || 'USD',
      filter_html: s.filter_html !== false,
      sync_categories: s.sync_categories !== false,
      sync_services: s.sync_services !== false,
      sync_prices: s.sync_prices !== false,
      sync_descriptions: s.sync_descriptions !== false,
      sync_advanced: !!s.sync_advanced,
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.base_url.trim()) {
      err({}, 'Nhập tên và Base URL');
      return;
    }
    setSaving(true);
    const settings = {
      exchange_rate: Number(form.exchange_rate) || 1,
      price_markup: Number(form.price_markup) || 0,
      currency: form.currency || 'USD',
      filter_html: form.filter_html,
      sync_categories: form.sync_categories,
      sync_services: form.sync_services,
      sync_prices: form.sync_prices,
      sync_descriptions: form.sync_descriptions,
      sync_advanced: form.sync_advanced,
    };
    const payload = {
      name: form.name,
      base_url: form.base_url,
      ...(form.api_key ? { api_key: form.api_key } : {}),
      is_active: form.is_active,
      settings,
    };
    try {
      if (form.id) await axiosInstance.put(`/api/smm/providers/${form.id}`, payload);
      else await axiosInstance.post('/api/smm/providers', payload);
      ok('Đã lưu nhà cung cấp');
      setForm(null);
      load();
    } catch (e) {
      err(e, 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/smm/providers/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  const checkBalance = async (p: any) => {
    try {
      const r = await axiosInstance.get(`/api/smm/providers/${p.id}/balance`);
      ok(`Số dư ${p.name}: ${r.data?.balance ?? r.data?.amount ?? JSON.stringify(r.data)}`);
    } catch (e) {
      err(e, 'Không lấy được số dư');
    }
  };

  if (loading) return <Loading />;

  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => openForm({ ...PROVIDER_EMPTY })}>
          Thêm nhà cung cấp
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Base URL</TableCell>
              <TableCell>Markup</TableCell>
              <TableCell>Tỷ giá</TableCell>
              <TableCell>Thống kê</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.name}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{p.baseUrl}</TableCell>
                <TableCell>{Number((p.settings || {}).price_markup) || 0}%</TableCell>
                <TableCell>{Number((p.settings || {}).exchange_rate) || 1}</TableCell>
                <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                  {(p.stats?.services || 0)} DV · {(p.stats?.orders || 0)} đơn
                  <br />
                  <span style={{ color: '#637381' }}>DT: {fCurrency(p.stats?.revenue || 0)}</span>
                </TableCell>
                <TableCell>
                  <Label color={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Bật' : 'Tắt'}</Label>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Số dư">
                    <IconButton onClick={() => checkBalance(p)}>
                      <Iconify icon="solar:wallet-bold" />
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
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có nhà cung cấp
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</DialogTitle>
        {form && (
          <Tabs value={ptab} onChange={(_, v) => setPtab(v)} variant="fullWidth" sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Thông tin" />
            <Tab label="Giá" />
            <Tab label="Đồng bộ" />
          </Tabs>
        )}
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              {ptab === 0 && (
                <>
                  <TextField label="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <TextField label="Base URL (API)" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
                  <TextField
                    label={form.id ? 'API key (để trống nếu giữ nguyên)' : 'API key'}
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                    label="Kích hoạt"
                  />
                </>
              )}

              {ptab === 1 && (
                <>
                  <TextField
                    label="Tỷ giá (nhân giá gốc → VNĐ)"
                    type="number"
                    value={form.exchange_rate}
                    onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) })}
                  />
                  <TextField label="Tiền tệ nguồn" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} helperText="VD: USD" />
                  <TextField
                    label="Markup giá bán (%)"
                    type="number"
                    helperText="Đổi markup sẽ tự tính lại giá bán toàn bộ dịch vụ của nguồn"
                    value={form.price_markup}
                    onChange={(e) => setForm({ ...form, price_markup: Number(e.target.value) })}
                  />
                </>
              )}

              {ptab === 2 && (
                <>
                  <FormControlLabel
                    control={<Checkbox checked={form.sync_categories} onChange={(e) => setForm({ ...form, sync_categories: e.target.checked })} />}
                    label="Cho phép đồng bộ Chuyên mục"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={form.sync_services} onChange={(e) => setForm({ ...form, sync_services: e.target.checked })} />}
                    label="Cho phép đồng bộ Dịch vụ"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={form.sync_prices} onChange={(e) => setForm({ ...form, sync_prices: e.target.checked })} />}
                    label="Đồng bộ Giá khi cập nhật"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={form.sync_descriptions} onChange={(e) => setForm({ ...form, sync_descriptions: e.target.checked })} />}
                    label="Đồng bộ Mô tả khi cập nhật"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={form.sync_advanced} onChange={(e) => setForm({ ...form, sync_advanced: e.target.checked })} />}
                    label="Đồng bộ nâng cao (refill/hủy/loại dịch vụ)"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={form.filter_html} onChange={(e) => setForm({ ...form, filter_html: e.target.checked })} />}
                    label="Lọc thẻ HTML trong tên/mô tả"
                  />
                </>
              )}
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
        title="Xoá nhà cung cấp"
        content={`Xoá "${toDelete?.name}"?`}
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
// CATALOG (platforms + categories)

function CatalogTab() {
  const { ok, err } = useSnack();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platName, setPlatName] = useState('');
  const [platIcon, setPlatIcon] = useState('');
  const [catForm, setCatForm] = useState<{ platformId: number; name: string } | null>(null);
  const [editPlat, setEditPlat] = useState<{ id: number; name: string; icon_url: string } | null>(null);
  const [editCat, setEditCat] = useState<{ id: number; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: 'platform' | 'category'; id: number; name: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([axiosInstance.get('/api/smm/platforms'), axiosInstance.get('/api/smm/categories/all')])
      .then(([p, c]) => {
        setPlatforms(p.data || []);
        setCats(c.data || []);
      })
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const addPlatform = async () => {
    if (!platName.trim()) return;
    try {
      await axiosInstance.post('/api/smm/platforms', { name: platName, icon_url: platIcon || null });
      setPlatName('');
      setPlatIcon('');
      ok('Đã thêm nền tảng');
      load();
    } catch (e) {
      err(e);
    }
  };

  const addCategory = async () => {
    if (!catForm?.name.trim()) return;
    try {
      await axiosInstance.post(`/api/smm/platforms/${catForm.platformId}/categories`, { name: catForm.name });
      setCatForm(null);
      ok('Đã thêm chuyên mục');
      load();
    } catch (e) {
      err(e);
    }
  };

  const savePlat = async () => {
    if (!editPlat?.name.trim()) return;
    try {
      await axiosInstance.put(`/api/smm/platforms/${editPlat.id}`, {
        name: editPlat.name,
        icon_url: editPlat.icon_url || null,
      });
      setEditPlat(null);
      ok('Đã lưu nền tảng');
      load();
    } catch (e) {
      err(e);
    }
  };

  const saveCat = async () => {
    if (!editCat?.name.trim()) return;
    try {
      await axiosInstance.put(`/api/smm/categories/${editCat.id}`, { name: editCat.name });
      setEditCat(null);
      ok('Đã lưu chuyên mục');
      load();
    } catch (e) {
      err(e);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      const url = toDelete.kind === 'platform' ? `/api/smm/platforms/${toDelete.id}` : `/api/smm/categories/${toDelete.id}`;
      await axiosInstance.delete(url);
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
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
          <Box sx={{ width: { xs: '100%', sm: 140 } }}>
            <ImageUploadField label="Icon nền tảng" value={platIcon} onChange={setPlatIcon} height={72} />
          </Box>
          <TextField
            size="small"
            label="Tên nền tảng mới"
            value={platName}
            onChange={(e) => setPlatName(e.target.value)}
          />
          <Button variant="contained" onClick={addPlatform} startIcon={<Iconify icon="eva:plus-fill" />}>
            Thêm nền tảng
          </Button>
        </Stack>
      </Card>

      {platforms.map((pl) => {
        const list = cats.filter((c) => c.platformId === pl.id);
        return (
          <Card key={pl.id} sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                {pl.iconUrl ? (
                  <Box
                    component="img"
                    src={pl.iconUrl}
                    alt={pl.name}
                    sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'background.neutral',
                      color: 'text.disabled',
                    }}
                  >
                    <Iconify icon="solar:share-bold" width={18} />
                  </Box>
                )}
                <Typography variant="h6">{pl.name}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setCatForm({ platformId: pl.id, name: '' })}>
                  Chuyên mục
                </Button>
                <IconButton onClick={() => setEditPlat({ id: pl.id, name: pl.name, icon_url: pl.iconUrl || '' })}>
                  <Iconify icon="solar:pen-bold" />
                </IconButton>
                <IconButton color="error" onClick={() => setToDelete({ kind: 'platform', id: pl.id, name: pl.name })}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Stack>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {list.map((c) => (
                <Stack
                  key={c.id}
                  direction="row"
                  alignItems="center"
                  spacing={0.25}
                  sx={{ pl: 1.5, pr: 0.25, py: 0.25, borderRadius: 1, bgcolor: 'background.neutral' }}
                >
                  <Typography variant="body2" sx={{ mr: 0.5 }}>
                    {c.name}
                  </Typography>
                  <Tooltip title="Sửa chuyên mục">
                    <IconButton size="small" onClick={() => setEditCat({ id: c.id, name: c.name })}>
                      <Iconify icon="solar:pen-bold" width={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xoá">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setToDelete({ kind: 'category', id: c.id, name: c.name })}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
              {!list.length && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Chưa có chuyên mục
                </Typography>
              )}
            </Stack>
          </Card>
        );
      })}
      {!platforms.length && (
        <Typography align="center" sx={{ color: 'text.secondary', py: 4 }}>
          Chưa có nền tảng nào
        </Typography>
      )}

      <Dialog open={!!catForm} onClose={() => setCatForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>Thêm chuyên mục</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tên chuyên mục"
            sx={{ mt: 1 }}
            value={catForm?.name || ''}
            onChange={(e) => catForm && setCatForm({ ...catForm, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCatForm(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={addCategory}>
            Thêm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sửa nền tảng */}
      <Dialog open={!!editPlat} onClose={() => setEditPlat(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa nền tảng</DialogTitle>
        {editPlat && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <ImageUploadField
                label="Icon nền tảng"
                value={editPlat.icon_url}
                onChange={(url) => setEditPlat({ ...editPlat, icon_url: url })}
                height={96}
              />
              <TextField
                fullWidth
                label="Tên nền tảng"
                value={editPlat.name}
                onChange={(e) => setEditPlat({ ...editPlat, name: e.target.value })}
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button color="inherit" onClick={() => setEditPlat(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={savePlat}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sửa chuyên mục */}
      <Dialog open={!!editCat} onClose={() => setEditCat(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa chuyên mục</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tên chuyên mục"
            sx={{ mt: 1 }}
            value={editCat?.name || ''}
            onChange={(e) => editCat && setEditCat({ ...editCat, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setEditCat(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={saveCat}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xác nhận xoá"
        content={`Xoá "${toDelete?.name}"?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Stack>
  );
}

// ----------------------------------------------------------------------
// SERVICES

function ServicesTab() {
  const { ok, err } = useSnack();
  const [data, setData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const SVC_EMPTY = {
    categoryId: '' as any,
    name: '',
    description: '',
    rate: 0,
    cost_rate: 0,
    min_quantity: 1,
    max_quantity: 10000,
    delivery_type: 'manual',
    api_provider_id: '' as any,
    external_service_id: '',
    service_type: 'Default',
    can_refill: false,
    can_cancel: false,
    drip_feed: false,
    avg_time_minutes: '' as any,
    sort_order: 0,
  };
  const [svcForm, setSvcForm] = useState<typeof SVC_EMPTY | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [remoteSvcs, setRemoteSvcs] = useState<any[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const limit = 50;

  useEffect(() => {
    axiosInstance.get('/api/smm/providers').then((r) => setProviders(r.data || [])).catch(() => {});
  }, []);

  const loadRemoteSvcs = async (pid: any) => {
    if (!pid) { setRemoteSvcs([]); return; }
    setLoadingRemote(true);
    try {
      const r = await axiosInstance.get(`/api/smm/providers/${pid}/remote-services`);
      setRemoteSvcs(r.data?.services || []);
    } catch (e) {
      err(e);
    } finally {
      setLoadingRemote(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/smm/services/all', { params: { page, limit } })
      .then((r) => setData(r.data))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  useEffect(() => load(), [load]);
  useEffect(() => {
    axiosInstance.get('/api/smm/categories/all').then((r) => setCats(r.data || [])).catch(() => {});
  }, []);

  const saveSvc = async () => {
    if (!svcForm?.categoryId || !svcForm.name.trim()) return;
    try {
      await axiosInstance.post(`/api/smm/categories/${svcForm.categoryId}/services`, {
        name: svcForm.name,
        description: svcForm.description || null,
        rate: Number(svcForm.rate) || 0,
        cost_rate: Number(svcForm.cost_rate) || 0,
        min_quantity: Number(svcForm.min_quantity) || 1,
        max_quantity: Number(svcForm.max_quantity) || 10000,
        delivery_type: svcForm.delivery_type,
        api_provider_id:
          svcForm.delivery_type === 'api' && svcForm.api_provider_id ? Number(svcForm.api_provider_id) : null,
        external_service_id: svcForm.delivery_type === 'api' ? svcForm.external_service_id || null : null,
        service_type: svcForm.service_type || 'Default',
        can_refill: svcForm.can_refill,
        can_cancel: svcForm.can_cancel,
        drip_feed: svcForm.drip_feed,
        avg_time_minutes: Number(svcForm.avg_time_minutes) || null,
        sort_order: Number(svcForm.sort_order) || 0,
      });
      ok('Đã thêm dịch vụ');
      setSvcForm(null);
      load();
    } catch (e) {
      err(e);
    }
  };

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOnPage = data.items.map((s) => s.id);
  const allChecked = allOnPage.length > 0 && allOnPage.every((id) => selected.includes(id));

  const bulkDelete = async () => {
    try {
      const r = await axiosInstance.post('/api/smm/services/bulk-delete', { ids: selected });
      ok(`Đã xoá ${r.data?.deleted ?? selected.length} dịch vụ`);
      setSelected([]);
      load();
    } catch (e) {
      err(e);
    }
  };
  const roundPrices = async () => {
    try {
      const r = await axiosInstance.post('/api/smm/services/round-prices', { ids: selected, unit: 1000 });
      ok(`Đã làm tròn ${r.data?.updated ?? 0}/${r.data?.total ?? 0} giá`);
      load();
    } catch (e) {
      err(e);
    }
  };
  const toggleActive = async (s: any) => {
    try {
      await axiosInstance.patch(`/api/smm/services/${s.id}/active`, { is_active: !s.isActive });
      load();
    } catch (e) {
      err(e);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / limit));

  return (
    <>
    <Card>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {data.total} dịch vụ • đã chọn {selected.length}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setSvcForm({ ...SVC_EMPTY })}>
            Thêm dịch vụ
          </Button>
          <Button disabled={!selected.length} startIcon={<Iconify icon="solar:tag-price-bold" />} onClick={roundPrices}>
            Làm tròn giá (1k)
          </Button>
          <Button color="error" disabled={!selected.length} startIcon={<Iconify icon="solar:trash-bin-trash-bold" />} onClick={bulkDelete}>
            Xoá đã chọn
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Loading />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allChecked}
                    onChange={(e) =>
                      setSelected(e.target.checked ? Array.from(new Set([...selected, ...allOnPage])) : selected.filter((id) => !allOnPage.includes(id)))
                    }
                  />
                </TableCell>
                <TableCell>Dịch vụ</TableCell>
                <TableCell>Nền tảng / Chuyên mục</TableCell>
                <TableCell align="right">Giá vốn</TableCell>
                <TableCell align="right">Giá bán</TableCell>
                <TableCell align="center">Min/Max</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((s) => (
                <TableRow key={s.id} hover selected={selected.includes(s.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" noWrap title={s.name}>
                      {s.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      #{s.id} {s.externalServiceId ? `· ext ${s.externalServiceId}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    {s.category?.platform?.name} / {s.category?.name}
                  </TableCell>
                  <TableCell align="right">{fCurrency(s.costRate)}</TableCell>
                  <TableCell align="right">{fCurrency(s.rate)}</TableCell>
                  <TableCell align="center" sx={{ fontSize: 13 }}>
                    {s.minQuantity}/{s.maxQuantity}
                  </TableCell>
                  <TableCell align="center">
                    <Label color={s.isActive ? 'success' : 'default'} onClick={() => toggleActive(s)} sx={{ cursor: 'pointer' }}>
                      {s.isActive ? 'Bật' : 'Tắt'}
                    </Label>
                  </TableCell>
                </TableRow>
              ))}
              {!data.items.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Chưa có dịch vụ. Dùng tab “Import từ nguồn”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pages > 1 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ p: 2 }}>
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Typography variant="body2">
            {page}/{pages}
          </Typography>
          <Button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </Stack>
      )}
    </Card>

    <Dialog open={!!svcForm} onClose={() => setSvcForm(null)} fullWidth maxWidth="sm">
      <DialogTitle>Thêm dịch vụ thủ công</DialogTitle>
      {svcForm && (
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              label="Chuyên mục"
              value={svcForm.categoryId}
              onChange={(e) => setSvcForm({ ...svcForm, categoryId: e.target.value })}
            >
              {cats.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>
                  {(c.platformName || c.platform?.name) ? `${c.platformName || c.platform?.name} / ` : ''}
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Tên dịch vụ"
              value={svcForm.name}
              onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
            />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                Mô tả (tuỳ chọn)
              </Typography>
              <Editor
                simple
                id="svc-desc"
                value={svcForm.description}
                onChange={(v) => setSvcForm({ ...svcForm, description: v })}
              />
            </Box>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Giá bán / 1 đơn vị (VNĐ)"
                value={svcForm.rate}
                onChange={(e) => setSvcForm({ ...svcForm, rate: Number(e.target.value) })}
              />
              <TextField
                select
                sx={{ minWidth: 140 }}
                label="Giao hàng"
                value={svcForm.delivery_type}
                onChange={(e) => setSvcForm({ ...svcForm, delivery_type: e.target.value })}
              >
                <MenuItem value="manual">Thủ công</MenuItem>
                <MenuItem value="api">API</MenuItem>
              </TextField>
            </Stack>

            {svcForm.delivery_type === 'api' && (
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Đấu nối API nhà cung cấp
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Nguồn (provider)"
                    value={svcForm.api_provider_id}
                    onChange={(e) => {
                      setSvcForm({ ...svcForm, api_provider_id: e.target.value, external_service_id: '' });
                      loadRemoteSvcs(e.target.value);
                    }}
                  >
                    {providers.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label={loadingRemote ? 'Đang tải dịch vụ nguồn...' : 'Chọn dịch vụ nguồn'}
                    value={remoteSvcs.some((s) => String(s.service) === String(svcForm.external_service_id)) ? svcForm.external_service_id : ''}
                    disabled={!svcForm.api_provider_id || loadingRemote || !remoteSvcs.length}
                    onChange={(e) => {
                      const picked = remoteSvcs.find((s) => String(s.service) === String(e.target.value));
                      setSvcForm({
                        ...svcForm,
                        external_service_id: String(e.target.value),
                        ...(picked
                          ? {
                              name: svcForm.name || picked.name || '',
                              rate: svcForm.rate || Number(picked.rate_local) || svcForm.rate,
                              min_quantity: Number(picked.min) || svcForm.min_quantity,
                              max_quantity: Number(picked.max) || svcForm.max_quantity,
                            }
                          : {}),
                      });
                    }}
                  >
                    {remoteSvcs.slice(0, 500).map((s) => (
                      <MenuItem key={s.service} value={String(s.service)}>
                        #{s.service} — {s.name} ({fCurrency(s.rate_local || 0)})
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    label="Hoặc nhập ID dịch vụ nguồn"
                    value={svcForm.external_service_id}
                    onChange={(e) => setSvcForm({ ...svcForm, external_service_id: e.target.value })}
                    helperText="Dùng khi không tải được danh sách hoặc muốn nhập tay"
                  />
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Số lượng tối thiểu"
                value={svcForm.min_quantity}
                onChange={(e) => setSvcForm({ ...svcForm, min_quantity: Number(e.target.value) })}
              />
              <TextField
                fullWidth
                type="number"
                label="Số lượng tối đa"
                value={svcForm.max_quantity}
                onChange={(e) => setSvcForm({ ...svcForm, max_quantity: Number(e.target.value) })}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Giá vốn / 1 đơn vị (VNĐ)"
                value={svcForm.cost_rate}
                onChange={(e) => setSvcForm({ ...svcForm, cost_rate: Number(e.target.value) })}
              />
              <TextField
                select
                fullWidth
                label="Loại dịch vụ"
                value={svcForm.service_type}
                onChange={(e) => setSvcForm({ ...svcForm, service_type: e.target.value })}
              >
                {['Default', 'Package', 'Custom Comments', 'Mentions Hashtag', 'SEO', 'Subscriptions'].map((tpe) => (
                  <MenuItem key={tpe} value={tpe}>
                    {tpe}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Thời gian giao TB (phút)"
                value={svcForm.avg_time_minutes}
                onChange={(e) => setSvcForm({ ...svcForm, avg_time_minutes: e.target.value })}
              />
              <TextField
                fullWidth
                type="number"
                label="Thứ tự"
                value={svcForm.sort_order}
                onChange={(e) => setSvcForm({ ...svcForm, sort_order: Number(e.target.value) })}
              />
            </Stack>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <FormControlLabel
                control={<Switch checked={svcForm.can_refill} onChange={(e) => setSvcForm({ ...svcForm, can_refill: e.target.checked })} />}
                label="Bảo hành (refill)"
              />
              <FormControlLabel
                control={<Switch checked={svcForm.can_cancel} onChange={(e) => setSvcForm({ ...svcForm, can_cancel: e.target.checked })} />}
                label="Cho huỷ"
              />
              <FormControlLabel
                control={<Switch checked={svcForm.drip_feed} onChange={(e) => setSvcForm({ ...svcForm, drip_feed: e.target.checked })} />}
                label="Drip-feed"
              />
            </Stack>
          </Stack>
        </DialogContent>
      )}
      <DialogActions>
        <Button color="inherit" onClick={() => setSvcForm(null)}>
          Huỷ
        </Button>
        <Button variant="contained" disabled={!svcForm?.categoryId || !svcForm?.name.trim()} onClick={saveSvc}>
          Lưu dịch vụ
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

// ----------------------------------------------------------------------
// IMPORT

function ImportTab() {
  const { ok, err } = useSnack();
  const [providers, setProviders] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<number | ''>('');
  const [platformId, setPlatformId] = useState<number | ''>('');
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [targetCat, setTargetCat] = useState<number | ''>('');
  const [remoteCats, setRemoteCats] = useState<any[]>([]);
  const [remoteServices, setRemoteServices] = useState<any[]>([]);
  const [selectedSvc, setSelectedSvc] = useState<number[]>([]);
  const [svcFilter, setSvcFilter] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/api/smm/providers'),
      axiosInstance.get('/api/smm/platforms'),
      axiosInstance.get('/api/smm/categories/all'),
    ])
      .then(([p, pl, c]) => {
        setProviders((p.data || []).filter((x: any) => x.isActive));
        setPlatforms(pl.data || []);
        setCats(c.data || []);
      })
      .catch(err);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRemote = async () => {
    if (!providerId) return;
    setBusy(true);
    try {
      const [rc, rs] = await Promise.all([
        axiosInstance.get(`/api/smm/providers/${providerId}/remote-categories`, { params: { platform_id: platformId || 0 } }),
        axiosInstance.get(`/api/smm/providers/${providerId}/remote-services`),
      ]);
      setRemoteCats(rc.data?.categories || []);
      setRemoteServices(rs.data?.services || []);
      setSelectedSvc([]);
      ok(`Đã tải ${rs.data?.total ?? 0} dịch vụ từ nguồn`);
    } catch (e) {
      err(e, 'Không tải được dữ liệu nguồn');
    } finally {
      setBusy(false);
    }
  };

  const syncCategories = async () => {
    if (!providerId || !platformId) {
      err({}, 'Chọn nguồn và nền tảng đích');
      return;
    }
    setBusy(true);
    try {
      const r = await axiosInstance.post('/api/smm/categories/sync', {
        provider_id: providerId,
        platform_id: platformId,
        category_names: [],
      });
      ok(`Tạo ${r.data?.created ?? 0} chuyên mục (đã có ${r.data?.existed ?? 0})`);
      const c = await axiosInstance.get('/api/smm/categories/all');
      setCats(c.data || []);
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const importSelected = async () => {
    if (!providerId || !targetCat || !selectedSvc.length) {
      err({}, 'Chọn nguồn, chuyên mục đích và ít nhất 1 dịch vụ');
      return;
    }
    setBusy(true);
    try {
      const r = await axiosInstance.post('/api/smm/services/sync-selected', {
        provider_id: providerId,
        target_category_id: targetCat,
        external_service_ids: selectedSvc,
      });
      ok(`Import: tạo ${r.data?.created ?? 0}, cập nhật ${r.data?.updated ?? 0}`);
      setSelectedSvc([]);
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const syncAll = async () => {
    if (!providerId || !platformId) {
      err({}, 'Chọn nguồn và nền tảng đích');
      return;
    }
    setBusy(true);
    try {
      const r = await axiosInstance.post('/api/smm/services/sync', {
        provider_id: providerId,
        platform_id: platformId,
      });
      ok(`Đồng bộ toàn bộ: tạo ${r.data?.created ?? 0}, cập nhật ${r.data?.updated ?? 0}, bỏ qua ${r.data?.skipped ?? 0}`);
      const c = await axiosInstance.get('/api/smm/categories/all');
      setCats(c.data || []);
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const filtered = remoteServices.filter(
    (s) =>
      !svcFilter ||
      String(s.name || '').toLowerCase().includes(svcFilter.toLowerCase()) ||
      String(s.category || '').toLowerCase().includes(svcFilter.toLowerCase())
  );
  const targetCats = cats.filter((c) => !platformId || c.platformId === platformId);

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField select fullWidth label="Nguồn (provider)" value={providerId} onChange={(e) => setProviderId(Number(e.target.value))}>
            {providers.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Nền tảng đích" value={platformId} onChange={(e) => setPlatformId(Number(e.target.value))}>
            {platforms.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" disabled={!providerId || busy} onClick={loadRemote} startIcon={<Iconify icon="solar:refresh-bold" />} sx={{ flexShrink: 0 }}>
            Tải từ nguồn
          </Button>
        </Stack>
      </Card>

      {remoteCats.length > 0 && (
        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6">Chuyên mục từ nguồn ({remoteCats.length})</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={!platformId || busy} onClick={syncCategories} startIcon={<Iconify icon="solar:download-bold" />}>
                Tạo chuyên mục còn thiếu
              </Button>
              <Button variant="contained" color="warning" disabled={!platformId || busy} onClick={syncAll} startIcon={<Iconify icon="solar:refresh-circle-bold" />}>
                Đồng bộ toàn bộ
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {remoteCats.map((c) => (
              <Chip
                key={c.slug}
                label={`${c.name} (${c.count})`}
                color={c.exists ? 'success' : 'default'}
                variant={c.exists ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Stack>
        </Card>
      )}

      {remoteServices.length > 0 && (
        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
            <TextField select label="Chuyên mục đích" sx={{ minWidth: 220 }} value={targetCat} onChange={(e) => setTargetCat(Number(e.target.value))}>
              {targetCats.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.platform?.name ? `${c.platform.name} / ` : ''}
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="Lọc dịch vụ" value={svcFilter} onChange={(e) => setSvcFilter(e.target.value)} sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Đã chọn {selectedSvc.length}
            </Typography>
            <Button variant="contained" disabled={!targetCat || !selectedSvc.length || busy} onClick={importSelected} startIcon={<Iconify icon="solar:cloud-download-bold" />}>
              Import {selectedSvc.length || ''}
            </Button>
          </Stack>

          <Box sx={{ maxHeight: 460, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((s) => selectedSvc.includes(Number(s.service)))}
                      onChange={(e) => {
                        const ids = filtered.map((s) => Number(s.service));
                        setSelectedSvc(e.target.checked ? Array.from(new Set([...selectedSvc, ...ids])) : selectedSvc.filter((id) => !ids.includes(id)));
                      }}
                    />
                  </TableCell>
                  <TableCell>Dịch vụ (nguồn)</TableCell>
                  <TableCell>Chuyên mục</TableCell>
                  <TableCell align="right">Giá gốc</TableCell>
                  <TableCell align="right">Giá bán</TableCell>
                  <TableCell align="center">Min/Max</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(0, 500).map((s) => {
                  const id = Number(s.service);
                  return (
                    <TableRow key={id} hover selected={selectedSvc.includes(id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedSvc.includes(id)}
                          onChange={() =>
                            setSelectedSvc((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography variant="body2" noWrap title={s.name}>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          ext #{id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{s.category}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{s.rate}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {s.rate_local != null ? fCurrency(s.rate_local) : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 13 }}>
                        {s.min}/{s.max}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          {filtered.length > 500 && (
            <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1, display: 'block' }}>
              Hiển thị 500/{filtered.length} — lọc bớt để thấy phần còn lại.
            </Typography>
          )}
        </Card>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------
// ORDERS

const ORDER_STATUS = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'canceled', 'failed'];

function OrdersTab() {
  const { ok, err } = useSnack();
  const [data, setData] = useState<{ orders: any[]; total: number; stats?: any }>({ orders: [], total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/smm/admin/orders', { params: { page, limit, ...(status ? { status } : {}) } })
      .then((r) => setData(r.data))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);
  useEffect(() => load(), [load]);

  const checkAll = async () => {
    setChecking(true);
    try {
      const r = await axiosInstance.post('/api/smm/admin/orders/check-all');
      ok(`Đã kiểm tra ${r.data?.checked ?? 0}, cập nhật ${r.data?.updated ?? 0}`);
      load();
    } catch (e) {
      err(e);
    } finally {
      setChecking(false);
    }
  };
  const updateStatus = async (oid: number, st: string) => {
    try {
      await axiosInstance.put(`/api/smm/admin/orders/${oid}/status`, { status: st });
      ok('Đã cập nhật');
      load();
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/smm/admin/orders/${toDelete.id}`);
      ok('Đã xoá đơn');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / limit));

  return (
    <Card>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
        <TextField select size="small" label="Trạng thái" sx={{ minWidth: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <MenuItem value="">Tất cả</MenuItem>
          {ORDER_STATUS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" disabled={checking} onClick={checkAll} startIcon={<Iconify icon="solar:refresh-bold" />}>
          Đồng bộ tất cả
        </Button>
      </Stack>

      {data.stats && (
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" variant="soft" label={`Tổng: ${data.stats.total}`} />
          <Chip size="small" variant="soft" color="warning" label={`Chờ: ${data.stats.pending}`} />
          <Chip size="small" variant="soft" color="info" label={`Đang chạy: ${data.stats.in_progress}`} />
          <Chip size="small" variant="soft" color="success" label={`Hoàn thành: ${data.stats.completed}`} />
          <Chip size="small" variant="soft" color="info" label={`Một phần: ${data.stats.partial}`} />
          <Chip size="small" variant="soft" color="error" label={`Huỷ/Lỗi: ${data.stats.canceled}`} />
          <Chip size="small" variant="soft" color="secondary" label={`Lịch: ${data.stats.scheduled}`} />
          <Chip size="small" variant="soft" color="success" label={`Doanh thu: ${fCurrency(data.stats.revenue)}`} />
        </Box>
      )}

      {loading ? (
        <Loading />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mã</TableCell>
                <TableCell>Khách</TableCell>
                <TableCell>Dịch vụ</TableCell>
                <TableCell align="right">SL</TableCell>
                <TableCell align="right">Tiền</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.orders.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontSize: 13 }}>{o.order_code}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{o.user_email}</TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={o.service_name}>
                      {o.service_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {o.quantity}
                    {o.remains != null && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        còn {o.remains}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{fCurrency(o.charge)}</TableCell>
                  <TableCell>
                    <TextField select size="small" variant="standard" value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} sx={{ minWidth: 120 }}>
                      {ORDER_STATUS.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="error" onClick={() => setToDelete(o)}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!data.orders.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Chưa có đơn
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pages > 1 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ p: 2 }}>
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Typography variant="body2">
            {page}/{pages}
          </Typography>
          <Button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </Stack>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá đơn SMM"
        content={`Xoá đơn ${toDelete?.order_code}?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Card>
  );
}
