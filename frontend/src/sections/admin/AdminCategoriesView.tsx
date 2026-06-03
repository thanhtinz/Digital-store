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
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

type Category = {
  id: number;
  name: string;
  slug: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY = { id: 0, name: '', icon_url: '', sort_order: 0, is_active: true };

export default function AdminCategoriesView() {
  const { enqueueSnackbar } = useSnackbar();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const load = () => {
    setLoading(true);
    axiosInstance
      .get('/api/categories')
      .then((r) => setCats(Array.isArray(r.data) ? r.data : []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được danh mục', { variant: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      enqueueSnackbar('Vui lòng nhập tên danh mục', { variant: 'warning' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      icon_url: form.icon_url,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    try {
      if (form.id) await axiosInstance.patch(`/api/categories/${form.id}`, payload);
      else await axiosInstance.post('/api/categories', payload);
      enqueueSnackbar(form.id ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
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
      await axiosInstance.delete(`/api/categories/${toDelete.id}`);
      enqueueSnackbar('Đã xoá danh mục');
      setCats((list) => list.filter((x) => x.id !== toDelete.id));
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Container sx={{ pb: 6 }} maxWidth="lg">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 3 }}>
        <Typography variant="h4">Danh mục</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="eva:plus-fill" />}
          onClick={() => setForm({ ...EMPTY })}
        >
          Thêm danh mục
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
                  <TableCell>Danh mục</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Thứ tự</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cats.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar variant="rounded" src={c.iconUrl || undefined} sx={{ bgcolor: 'background.neutral' }}>
                          <Iconify icon="solar:folder-bold-duotone" />
                        </Avatar>
                        <Typography variant="subtitle2">{c.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{c.slug}</TableCell>
                    <TableCell>{c.sortOrder}</TableCell>
                    <TableCell>
                      <Label color={c.isActive ? 'success' : 'default'} variant="soft">
                        {c.isActive ? 'Hiện' : 'Ẩn'}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() =>
                          setForm({
                            id: c.id,
                            name: c.name,
                            icon_url: c.iconUrl || '',
                            sort_order: c.sortOrder || 0,
                            is_active: c.isActive,
                          })
                        }
                      >
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                      <IconButton color="error" onClick={() => setToDelete(c)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!cats.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Chưa có danh mục
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Tên danh mục"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
              <TextField
                label="Icon (URL)"
                value={form.icon_url}
                onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
              />
              <TextField
                label="Thứ tự"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label="Hiển thị"
              />
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
        title="Xoá danh mục"
        content={`Xoá "${toDelete?.name}"?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Container>
  );
}
