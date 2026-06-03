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
import { useSnackbar } from '../../components/snackbar';

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
      <Typography variant="h4" sx={{ my: 3 }}>
        Blog
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="posts" label="Bài viết" icon={<Iconify icon="solar:document-text-bold" />} iconPosition="start" />
        <Tab value="cats" label="Chuyên mục" icon={<Iconify icon="solar:folder-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'posts' ? <PostsTab /> : <CatsTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// POSTS

const POST_EMPTY = {
  id: 0,
  title: '',
  excerpt: '',
  content: '',
  category_id: '' as string | number,
  thumbnail_url: '',
  meta_title: '',
  meta_description: '',
  is_published: false,
};

function PostsTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof POST_EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
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

  const openEdit = async (id: number) => {
    try {
      const r = await axiosInstance.get(`/api/admin/blog/posts/id/${id}`);
      const p = r.data;
      setForm({
        id: p.id,
        title: p.title || '',
        excerpt: p.excerpt || '',
        content: p.content || '',
        category_id: p.categoryId || '',
        thumbnail_url: p.thumbnailUrl || '',
        meta_title: p.metaTitle || '',
        meta_description: p.metaDescription || '',
        is_published: p.isPublished,
      });
    } catch (e) {
      err(e);
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      err({}, 'Nhập tiêu đề');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      category_id: form.category_id ? Number(form.category_id) : null,
      thumbnail_url: form.thumbnail_url,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      is_published: form.is_published,
    };
    try {
      if (form.id) await axiosInstance.patch(`/api/admin/blog/posts/${form.id}`, payload);
      else await axiosInstance.post('/api/admin/blog/posts', payload);
      ok('Đã lưu bài viết');
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
      await axiosInstance.delete(`/api/admin/blog/posts/${toDelete.id}`);
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
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...POST_EMPTY })}>
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
                  <IconButton onClick={() => openEdit(p.id)}>
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

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Sửa bài viết' : 'Viết bài'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField select label="Chuyên mục" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <MenuItem value="">— Không —</MenuItem>
                {cats.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Ảnh đại diện (URL)" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
              {form.thumbnail_url && <Image src={form.thumbnail_url} sx={{ borderRadius: 1, height: 140 }} />}
              <TextField label="Tóm tắt" multiline rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              <TextField label="Nội dung" multiline rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <TextField label="Meta title (SEO)" value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} />
              <TextField label="Meta description (SEO)" multiline rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
              <FormControlLabel control={<Switch checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />} label="Đăng công khai" />
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
