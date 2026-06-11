import { useEffect, useState } from 'react';
// @mui
import {
  Box, Button, Card, Container, Divider, Stack, Tab, Tabs, TextField, Typography, IconButton,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// utils
import axiosInstance from '../../utils/axios';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';

// ----------------------------------------------------------------------

export default function AdminQuestionsView() {
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = () => {
    axiosInstance
      .get('/api/admin/questions', { params: { filter } })
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const answer = async (id: number) => {
    const text = (drafts[id] || '').trim();
    if (!text) return;
    setSaving(id);
    try {
      await axiosInstance.post(`/api/admin/questions/${id}/answer`, { answer: text });
      enqueueSnackbar('Đã trả lời');
      setDrafts((d) => ({ ...d, [id]: '' }));
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const toggleVisible = async (id: number, is_visible: boolean) => {
    await axiosInstance.patch(`/api/admin/questions/${id}`, { is_visible }).catch(() => {});
    load();
  };

  const remove = async (id: number) => {
    await axiosInstance.delete(`/api/admin/questions/${id}`).catch(() => {});
    load();
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Hỏi & Đáp sản phẩm" />

        <FeatureToggle
          flag="product_qa"
          label="Hỏi & Đáp sản phẩm"
          description="Cho phép khách đặt câu hỏi ở trang sản phẩm."
          icon="solar:chat-round-question-bold-duotone"
        />

        <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 3 }}>
          <Tab value="all" label="Tất cả" />
          <Tab value="unanswered" label="Chưa trả lời" />
        </Tabs>

        <Stack spacing={2}>
          {items.length === 0 && (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Không có câu hỏi.</Typography>
            </Card>
          )}
          {items.map((q) => (
            <Card key={q.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle2">{q.user_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      · {q.product_name} · {new Date(q.created_at).toLocaleDateString('vi-VN')}
                    </Typography>
                    {!q.is_visible && <Label color="default">Đã ẩn</Label>}
                    {q.answer ? <Label color="success">Đã trả lời</Label> : <Label color="warning">Chờ</Label>}
                  </Stack>
                  <Typography variant="body2">{q.question}</Typography>
                </Box>
                <Stack direction="row">
                  <IconButton size="small" onClick={() => toggleVisible(q.id, !q.is_visible)}>
                    <Iconify icon={q.is_visible ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(q.id)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Stack>
              </Stack>

              {q.answer && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                  <Typography variant="caption" color="primary.main">{q.answered_by || 'Shop'}</Typography>
                  <Typography variant="body2">{q.answer}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1.5}>
                <TextField
                  fullWidth size="small" multiline
                  placeholder={q.answer ? 'Cập nhật câu trả lời...' : 'Nhập câu trả lời...'}
                  value={drafts[q.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                />
                <LoadingButton variant="contained" loading={saving === q.id} onClick={() => answer(q.id)} sx={{ flexShrink: 0 }}>
                  {q.answer ? 'Cập nhật' : 'Trả lời'}
                </LoadingButton>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Container>
    </RoleBasedGuard>
  );
}
