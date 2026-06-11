import { useEffect, useState } from 'react';
// @mui
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
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
  Typography,
} from '@mui/material';
import AppLoader from '../../components/app-loader';
// utils
import axiosInstance from '../../utils/axios';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import AdminCategoryForm from './AdminCategoryForm';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';

// ----------------------------------------------------------------------

type Category = {
  id: number;
  name: string;
  slug: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: number | null;
  productType?: string;
};

// Loại danh mục (khớp storefront): tài khoản premium, nạp game, giftcard.
const PRODUCT_TYPES = [
  { value: 'premium', label: 'Tài khoản Premium' },
  { value: 'game', label: 'Nạp game (Topup)' },
  { value: 'giftcard', label: 'Giftcard' },
  { value: 'source', label: 'Mã nguồn / Theme' },
];
const typeLabel = (t?: string) => PRODUCT_TYPES.find((x) => x.value === t)?.label || t || 'premium';
const typeColor = (t?: string): any =>
  ({ premium: 'info', game: 'warning', giftcard: 'success', source: 'secondary' }[t || 'premium'] || 'default');

type EditState = { current: Category | null; presetParentId?: number; presetProductType?: string };

export default function AdminCategoriesView() {
  const { enqueueSnackbar } = useSnackbar();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [typeFilter, setTypeFilter] = useState('all'); // lọc theo loại sản phẩm

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

  // Danh mục gốc (cấp 1) + map con theo parentId, áp dụng lọc theo loại.
  const matchType = (c: Category) => typeFilter === 'all' || (c.productType || 'premium') === typeFilter;
  const roots = cats.filter((c) => !c.parentId && matchType(c));
  const childrenOf = (id: number) => cats.filter((c) => c.parentId === id);

  const openCreate = (parentId?: number, productType?: string) =>
    setEditing({ current: null, presetParentId: parentId, presetProductType: productType });
  const openEdit = (c: Category) => setEditing({ current: c });

  // Bật/tắt nhanh danh mục ngay tại danh sách.
  const toggleActive = async (c: Category) => {
    const next = !c.isActive;
    setCats((list) => list.map((x) => (x.id === c.id ? { ...x, isActive: next } : x)));
    try {
      await axiosInstance.patch(`/api/categories/${c.id}`, { is_active: next });
    } catch (e: any) {
      setCats((list) => list.map((x) => (x.id === c.id ? { ...x, isActive: !next } : x)));
      enqueueSnackbar(e?.detail || 'Cập nhật thất bại', { variant: 'error' });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await axiosInstance.delete(`/api/categories/${toDelete.id}`);
      enqueueSnackbar('Đã xoá danh mục');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  const renderRow = (c: Category, child = false) => (
    <TableRow key={c.id} hover>
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pl: child ? 4 : 0 }}>
          {child && <Iconify icon="solar:arrow-right-down-bold" sx={{ color: 'text.disabled' }} />}
          <Avatar variant="rounded" src={c.iconUrl || undefined} sx={{ bgcolor: 'background.neutral' }}>
            <Iconify icon={child ? 'solar:folder-2-bold-duotone' : 'solar:folder-bold-duotone'} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">{c.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {c.slug}
            </Typography>
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        <Label color={typeColor(c.productType)} variant="soft">
          {typeLabel(c.productType)}
        </Label>
      </TableCell>
      <TableCell>{c.sortOrder}</TableCell>
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch size="small" checked={c.isActive} onChange={() => toggleActive(c)} />
          <Label color={c.isActive ? 'success' : 'default'} variant="soft">
            {c.isActive ? 'Hiện' : 'Ẩn'}
          </Label>
        </Stack>
      </TableCell>
      <TableCell align="right">
        {!child && (
          <IconButton title="Thêm danh mục con" onClick={() => openCreate(c.id, c.productType)}>
            <Iconify icon="solar:add-folder-bold" />
          </IconButton>
        )}
        <IconButton onClick={() => openEdit(c)}>
          <Iconify icon="solar:pen-bold" />
        </IconButton>
        <IconButton color="error" onClick={() => setToDelete(c)}>
          <Iconify icon="solar:trash-bin-trash-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  // Trang form đầy đủ (tạo/sửa) — thay popup cũ.
  if (editing) {
    return (
      <Container sx={{ pb: 6 }} maxWidth="lg">
        <AdminCategoryForm
          current={editing.current}
          roots={roots}
          presetParentId={editing.presetParentId}
          presetProductType={editing.presetProductType}
          onBack={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      </Container>
    );
  }

  return (
    <Container sx={{ pb: 6 }} maxWidth="lg">
      <AdminPageHeader
        title="Danh mục"
        action={
          <><Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => openCreate()}>
          Thêm danh mục
        </Button></>
        }
      />

      <Tabs
        value={typeFilter}
        onChange={(_e, v) => setTypeFilter(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab value="all" label="Tất cả" />
        {PRODUCT_TYPES.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      <Card>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}>
            <AppLoader />
          </Stack>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Danh mục</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Thứ tự</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roots.map((c) => [renderRow(c), ...childrenOf(c.id).map((ch) => renderRow(ch, true))])}
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

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá danh mục"
        content={`Xoá "${toDelete?.name}"? Danh mục con (nếu có) sẽ trở thành danh mục gốc.`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Container>
  );
}
