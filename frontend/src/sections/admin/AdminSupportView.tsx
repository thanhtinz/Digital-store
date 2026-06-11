import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Rating,
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
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';

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

export default function AdminSupportView() {
  const [tab, setTab] = useState('tickets');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <AdminPageHeader title="Hỗ trợ & Đánh giá" />

        <FeatureToggle
          flag="support"
          label="Hỗ trợ / Ticket"
          description="Cho phép khách tạo ticket hỗ trợ."
          icon="solar:headphones-round-bold-duotone"
        />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="tickets" label="Ticket hỗ trợ" icon={<Iconify icon="solar:chat-round-dots-bold" />} iconPosition="start" />
        <Tab value="reviews" label="Đánh giá" icon={<Iconify icon="solar:star-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'tickets' && <TicketsTab />}
      {tab === 'reviews' && <ReviewsTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// TICKETS

const TICKET_STATUS = ['open', 'answered', 'pending', 'resolved', 'closed'];
const ticketColor = (s: string): any =>
  ({ open: 'warning', answered: 'info', pending: 'default', resolved: 'success', closed: 'default' }[s] || 'default');

export function TicketsTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/admin/tickets', { params: { ...(status ? { status } : {}), limit: 50 } })
      .then((r) => setRows(r.data?.items || []))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => load(), [load]);

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      await axiosInstance.post(`/api/admin/tickets/${active.id}/reply`, { message: reply.trim() });
      ok('Đã gửi trả lời');
      setReply('');
      const r = await axiosInstance.get('/api/admin/tickets', { params: { limit: 50 } });
      const items = r.data?.items || [];
      setRows(items);
      setActive(items.find((t: any) => t.id === active.id) || null);
    } catch (e) {
      err(e);
    } finally {
      setSending(false);
    }
  };
  const changeStatus = async (id: number, st: string) => {
    try {
      await axiosInstance.patch(`/api/admin/tickets/${id}`, { status: st });
      ok('Đã cập nhật trạng thái');
      load();
      if (active?.id === id) setActive({ ...active, status: st });
    } catch (e) {
      err(e);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" sx={{ p: 2 }}>
        <TextField select size="small" label="Trạng thái" sx={{ minWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="">Tất cả</MenuItem>
          {TICKET_STATUS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã</TableCell>
              <TableCell>Khách</TableCell>
              <TableCell>Chủ đề</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontSize: 13 }}>{t.ticketNumber}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{t.userEmail || t.userName}</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" noWrap>
                    {t.subject}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Label color={ticketColor(t.status)}>{t.status}</Label>
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => { setActive(t); setReply(''); }}>
                    Xem
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có ticket
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        {active && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <span>{active.subject}</span>
                <TextField select size="small" value={active.status} onChange={(e) => changeStatus(active.id, e.target.value)} sx={{ minWidth: 130 }}>
                  {TICKET_STATUS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {active.userEmail} · {active.ticketNumber}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {active.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.5}>
                {(active.messages || []).map((m: any) => (
                  <Box
                    key={m.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      maxWidth: '85%',
                      alignSelf: m.senderType === 'admin' ? 'flex-end' : 'flex-start',
                      bgcolor: m.senderType === 'admin' ? 'primary.lighter' : 'background.neutral',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {m.senderName} · {m.senderType}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {m.message}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ display: 'block', p: 2 }}>
              <Stack direction="row" spacing={1.5}>
                <TextField fullWidth size="small" placeholder="Nhập trả lời…" value={reply} onChange={(e) => setReply(e.target.value)} multiline maxRows={4} />
                <Button variant="contained" disabled={sending || !reply.trim()} onClick={sendReply} startIcon={<Iconify icon="solar:plain-bold" />}>
                  Gửi
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Card>
  );
}

// ----------------------------------------------------------------------
// REVIEWS

export function ReviewsTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState('');
  const [toDelete, setToDelete] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/admin/reviews', { params: { ...(visible ? { visible } : {}), limit: 100 } })
      .then((r) => setRows(r.data?.items || []))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  useEffect(() => load(), [load]);

  const toggle = async (rv: any) => {
    try {
      await axiosInstance.patch(`/api/admin/reviews/${rv.id}`, { is_visible: !rv.is_visible });
      setRows((rs) => rs.map((x) => (x.id === rv.id ? { ...x, is_visible: !x.is_visible } : x)));
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/admin/reviews/${toDelete.id}`);
      ok('Đã xoá đánh giá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };
  const openReply = (rv: any) => {
    setReplyTo(rv);
    setReplyText(rv.admin_reply || '');
  };
  const saveReply = async () => {
    if (!replyTo) return;
    setSavingReply(true);
    try {
      const r = await axiosInstance.patch(`/api/admin/reviews/${replyTo.id}`, { admin_reply: replyText });
      setRows((rs) =>
        rs.map((x) =>
          x.id === replyTo.id
            ? { ...x, admin_reply: r.data?.admin_reply ?? null, admin_reply_at: r.data?.admin_reply_at ?? null }
            : x
        )
      );
      ok(replyText.trim() ? 'Đã lưu phản hồi' : 'Đã gỡ phản hồi');
      setReplyTo(null);
    } catch (e) {
      err(e);
    } finally {
      setSavingReply(false);
    }
  };

  return (
    <Card>
      <Stack direction="row" sx={{ p: 2 }}>
        <TextField select size="small" label="Hiển thị" sx={{ minWidth: 180 }} value={visible} onChange={(e) => setVisible(e.target.value)}>
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="true">Đang hiện</MenuItem>
          <MenuItem value="false">Đang ẩn</MenuItem>
        </TextField>
      </Stack>
      {loading ? (
        <Loading />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sản phẩm</TableCell>
                <TableCell>Người dùng</TableCell>
                <TableCell>Đánh giá</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>Nội dung</TableCell>
                <TableCell align="center">Hiện</TableCell>
                <TableCell align="center">Trả lời</TableCell>
                <TableCell align="right">Xoá</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((rv) => (
                <TableRow key={rv.id} hover>
                  <TableCell sx={{ fontSize: 13, maxWidth: 180 }}>
                    <Typography variant="body2" noWrap>
                      {rv.product_name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{rv.user_name}</TableCell>
                  <TableCell>
                    <Rating value={rv.rating} readOnly size="small" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, color: 'text.secondary', fontSize: 13 }}>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rv.comment || '—'}</Box>
                  </TableCell>
                  <TableCell align="center">
                    <Switch checked={rv.is_visible} onChange={() => toggle(rv)} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color={rv.admin_reply ? 'primary' : 'default'} onClick={() => openReply(rv)}>
                      <Iconify icon={rv.admin_reply ? 'solar:chat-round-check-bold' : 'solar:chat-round-line-linear'} />
                    </IconButton>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="error" onClick={() => setToDelete(rv)}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Chưa có đánh giá
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá đánh giá"
        content="Xoá đánh giá này?"
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />

      <Dialog open={!!replyTo} onClose={() => setReplyTo(null)} fullWidth maxWidth="sm">
        <DialogTitle>Phản hồi đánh giá</DialogTitle>
        <DialogContent dividers>
          {replyTo && (
            <Stack spacing={1.5}>
              <Box sx={{ p: 1.5, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Rating value={replyTo.rating} readOnly size="small" />
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {replyTo.comment || '—'}
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Phản hồi của cửa hàng"
                placeholder="Nhập phản hồi công khai cho khách… (để trống để gỡ)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setReplyTo(null)}>
            Huỷ
          </Button>
          <Button variant="contained" disabled={savingReply} onClick={saveReply}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

