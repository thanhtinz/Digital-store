import { useEffect, useState } from 'react';
// @mui
import {
  Autocomplete, Box, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, Stack, Switch, TextField, Typography, Grid,
} from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import ResponsiveDialog from '../../components/responsive-dialog';
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';

// ----------------------------------------------------------------------

const empty = { name: '', description: '', image_url: '', price: 0, original_price: '', is_active: true, sort_order: 0, items: [] as any[] };

export default function AdminBundlesView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  // picker
  const [pickProduct, setPickProduct] = useState<any>(null);
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [pickPkg, setPickPkg] = useState<any>(null);
  const [pickQty, setPickQty] = useState(1);

  const load = () => axiosInstance.get('/api/admin/bundles').then((r) => setItems(r.data?.items || [])).catch(() => {});
  useEffect(() => {
    load();
    axiosInstance.get('/api/products', { params: { limit: 300 } })
      .then((r) => setProducts(r.data?.products || r.data?.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickProduct) { setPkgs([]); return; }
    axiosInstance.get(`/api/products/admin/${pickProduct.id}/packages`)
      .then((r) => setPkgs(r.data?.items || []))
      .catch(() => setPkgs([]));
    setPickPkg(null);
  }, [pickProduct]);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (b: any) => {
    setForm({
      name: b.name, description: b.description || '', image_url: b.image_url || '',
      price: b.price, original_price: b.original_price ?? '', is_active: b.is_active, sort_order: b.sort_order,
      items: (b.items || []).map((it: any) => ({ package_id: it.package_id, quantity: it.quantity, label: `${it.product_name} - ${it.package_name}` })),
    });
    setEditId(b.id); setOpen(true);
  };

  const addItem = () => {
    if (!pickPkg) return;
    setForm((f: any) => ({
      ...f,
      items: [...f.items, { package_id: pickPkg.id, quantity: pickQty || 1, label: `${pickProduct?.name} - ${pickPkg.name}` }],
    }));
    setPickPkg(null); setPickQty(1);
  };
  const removeItem = (idx: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }));

  const save = async () => {
    try {
      const payload = { ...form, items: form.items.map((it: any) => ({ package_id: it.package_id, quantity: it.quantity })) };
      if (editId) await axiosInstance.patch(`/api/admin/bundles/${editId}`, payload);
      else await axiosInstance.post('/api/admin/bundles', payload);
      enqueueSnackbar('Đã lưu'); setOpen(false); load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    }
  };
  const remove = async (id: number) => { await axiosInstance.delete(`/api/admin/bundles/${id}`).catch(() => {}); load(); };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader
        title="Gói combo"
        action={
          <><Button variant="contained" onClick={openNew} startIcon={<Iconify icon="eva:plus-fill" />}>Thêm combo</Button></>
        }
      />

        <FeatureToggle
          flag="bundles"
          label="Gói combo"
          description="Hiển thị mục combo ở cửa hàng cho khách mua."
          icon="solar:box-bold-duotone"
        />

        <Grid container spacing={2}>
          {items.map((b) => (
            <Grid key={b.id} item xs={12} md={6}>
              <Card sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1">{b.name}</Typography>
                      {!b.is_active && <Label color="default">Tắt</Label>}
                    </Stack>
                    <Typography variant="body2" color="error.main">{fCurrency(b.price)}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.items?.length || 0} sản phẩm</Typography>
                  </Box>
                  <Stack direction="row">
                    <IconButton size="small" onClick={() => openEdit(b)}><Iconify icon="solar:pen-bold" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove(b.id)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>

        <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editId ? 'Sửa combo' : 'Thêm combo'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Tên combo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Mô tả" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <TextField label="Ảnh (URL)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Giá combo" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} fullWidth />
                <TextField type="number" label="Giá gốc (tuỳ chọn)" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} fullWidth />
              </Stack>

              <Divider>Sản phẩm trong combo</Divider>
              <Stack spacing={1}>
                {form.items.map((it: any, idx: number) => (
                  <Stack key={idx} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 1, bgcolor: 'background.neutral' }}>
                    <Typography variant="body2">{it.label || `Gói #${it.package_id}`} × {it.quantity}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeItem(idx)}><Iconify icon="solar:close-circle-bold" /></IconButton>
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Autocomplete
                  sx={{ flex: 2 }} size="small" options={products}
                  getOptionLabel={(o: any) => o.name || ''}
                  value={pickProduct}
                  onChange={(_, v) => setPickProduct(v)}
                  renderInput={(p) => <TextField {...p} label="Sản phẩm" />}
                />
                <Autocomplete
                  sx={{ flex: 2 }} size="small" options={pkgs}
                  getOptionLabel={(o: any) => `${o.name} (${fCurrency(o.price)})`}
                  value={pickPkg}
                  onChange={(_, v) => setPickPkg(v)}
                  renderInput={(p) => <TextField {...p} label="Gói" />}
                />
                <TextField sx={{ width: 80 }} size="small" type="number" label="SL" value={pickQty} onChange={(e) => setPickQty(Number(e.target.value) || 1)} />
                <Button onClick={addItem} variant="outlined" disabled={!pickPkg}>Thêm</Button>
              </Stack>

              <Stack direction="row" alignItems="center">
                <Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <Typography variant="body2">Đang bật</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Huỷ</Button>
            <Button variant="contained" onClick={save} disabled={!form.name || form.items.length === 0}>Lưu</Button>
          </DialogActions>
        </ResponsiveDialog>
      </Container>
    </RoleBasedGuard>
  );
}
