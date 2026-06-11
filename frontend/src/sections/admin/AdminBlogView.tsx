import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Button,
  Card,
  Chip,
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
// components
import Label from '../../components/label';
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import ImageUploadField from './ImageUploadField';
import AdminBlogPostForm from './AdminBlogPostForm';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';

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

export default function AdminBlogView() {
  const [tab, setTab] = useState('posts');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <AdminPageHeader title="Blog" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="posts" label="Bài viết" icon={<Iconify icon="solar:document-text-bold" />} iconPosition="start" />
        <Tab value="cats" label="Chuyên mục" icon={<Iconify icon="solar:folder-bold" />} iconPosition="start" />
        <Tab value="pages" label="Trang nội dung" icon={<Iconify icon="solar:file-text-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'posts' && <PostsTab />}
      {tab === 'cats' && <CatsTab />}
      {tab === 'pages' && <PagesTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// POSTS

function PostsTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // editing: 'new' = viết mới, number = id bài đang sửa, null = danh sách
  const [editing, setEditing] = useState<'new' | number | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([axiosInstance.get('/api/admin/blog/posts/all'), axiosInstance.get('/api/blog/categories')])
      .then(([p, c]) => {
        setRows(p.data?.items || []);
        setCats(c.data || []);
      })
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/admin/blog/posts/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  // Trang form đầy đủ (viết/sửa bài) — thay popup cũ.
  if (editing !== null) {
    return (
      <AdminBlogPostForm
        postId={editing === 'new' ? null : editing}
        categories={cats}
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
          Viết bài
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ảnh</TableCell>
              <TableCell>Tiêu đề</TableCell>
              <TableCell>Chuyên mục</TableCell>
              <TableCell align="center">Lượt xem</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Image src={p.thumbnailUrl} sx={{ width: 64, height: 40, borderRadius: 1 }} />
                </TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" noWrap>
                    {p.title}
                  </Typography>
                </TableCell>
                <TableCell>{p.category?.name || '—'}</TableCell>
                <TableCell align="center">{p.viewCount || 0}</TableCell>
                <TableCell align="center">
                  <Label color={p.isPublished ? 'success' : 'default'}>{p.isPublished ? 'Đã đăng' : 'Nháp'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setEditing(p.id)}>
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
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có bài viết
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá bài viết"
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
// SUPPORT PAGES (Điều khoản / Chính sách / FAQ…)

const PAGE_TYPES = ['terms', 'privacy', 'faq', 'about', 'refund', 'shipping', 'guide'];
const PAGE_EMPTY = { id: 0, title: '', page_type: 'terms', content: '', sort_order: 0, is_published: true };

function PagesTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof PAGE_EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/support/pages').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      err({}, 'Nhập tiêu đề');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      content: form.content,
      page_type: form.page_type,
      sort_order: Number(form.sort_order) || 0,
      is_published: form.is_published,
    };
    try {
      if (form.id) await axiosInstance.put(`/api/support/pages/${form.id}`, payload);
      else await axiosInstance.post('/api/support/pages', payload);
      ok('Đã lưu trang');
      setForm(null);
      load();
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/support/pages/${toDelete.id}`);
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
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...PAGE_EMPTY })}>
          Thêm trang
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tiêu đề</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.title}</TableCell>
                <TableCell>
                  <Label variant="soft">{p.pageType || '—'}</Label>
                </TableCell>
                <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{p.slug}</TableCell>
                <TableCell align="center">
                  <Label color={p.isPublished ? 'success' : 'default'}>{p.isPublished ? 'Hiện' : 'Ẩn'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setForm({ id: p.id, title: p.title, page_type: p.pageType || 'terms', content: p.content || '', sort_order: p.sortOrder || 0, is_published: p.isPublished })}>
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
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có trang nội dung
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Sửa trang' : 'Thêm trang'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField select label="Loại trang" value={form.page_type} onChange={(e) => setForm({ ...form, page_type: e.target.value })}>
                {PAGE_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Nội dung (HTML/Markdown)" multiline rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <TextField label="Thứ tự" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              <FormControlLabel control={<Switch checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />} label="Hiển thị" />
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
        title="Xoá trang"
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
// CATEGORIES

function CatsTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [toDelete, setToDelete] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/blog/categories').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await axiosInstance.post('/api/blog/admin/categories', { name });
      setName('');
      ok('Đã thêm chuyên mục');
      load();
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/blog/admin/categories/${toDelete.id}`);
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
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <TextField size="small" label="Tên chuyên mục mới" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="contained" onClick={add} startIcon={<Iconify icon="eva:plus-fill" />}>
          Thêm
        </Button>
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {rows.map((c) => (
          <Chip key={c.id} label={c.name} onDelete={() => setToDelete(c)} variant="soft" />
        ))}
        {!rows.length && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Chưa có chuyên mục
          </Typography>
        )}
      </Stack>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá chuyên mục"
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
