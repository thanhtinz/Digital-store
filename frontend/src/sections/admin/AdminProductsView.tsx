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
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
                Giá & gói sản phẩm quản lý ở phần Gói (sẽ bổ sung sau).
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
    </Container>
  );
}
