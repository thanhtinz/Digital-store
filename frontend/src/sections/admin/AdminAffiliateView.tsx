import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { fCurrency } from '../../utils/formatNumber';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
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

export default function AdminAffiliateView() {
  const [tab, setTab] = useState('partners');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <AdminPageHeader title="Giới thiệu bạn bè (Affiliate)" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="partners" label="Cộng tác viên" icon={<Iconify icon="solar:users-group-rounded-bold" />} iconPosition="start" />
        <Tab value="withdrawals" label="Duyệt rút tiền" icon={<Iconify icon="solar:wallet-money-bold" />} iconPosition="start" />
        <Tab value="config" label="Cấu hình" icon={<Iconify icon="solar:settings-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'partners' && <PartnersTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'config' && <ConfigTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// CỘNG TÁC VIÊN

function PartnersTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refsFor, setRefsFor] = useState<any>(null);
  const [refs, setRefs] = useState<any[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/affiliate/admin/list').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const update = async (aid: number, data: any) => {
    try {
      await axiosInstance.put(`/api/affiliate/admin/${aid}`, data);
      ok('Đã cập nhật');
      load();
    } catch (e) {
      err(e);
    }
  };
  const openRefs = async (aff: any) => {
    setRefsFor(aff);
    try {
      const r = await axiosInstance.get(`/api/affiliate/admin/${aff.id}/referrals`);
      setRefs(r.data || []);
    } catch (e) {
      err(e);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Mã giới thiệu</TableCell>
              <TableCell align="right">Tỷ lệ (%)</TableCell>
              <TableCell align="right">Tổng HH</TableCell>
              <TableCell align="right">Đã rút</TableCell>
              <TableCell align="center">Kích hoạt</TableCell>
              <TableCell align="right">Đơn GT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell sx={{ fontSize: 13 }}>{a.email}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{a.ref_code}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    defaultValue={a.commission_rate}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== a.commission_rate) update(a.id, { commission_rate: v });
                    }}
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell align="right">{fCurrency(a.total_earnings)}</TableCell>
                <TableCell align="right">{fCurrency(a.total_paid)}</TableCell>
                <TableCell align="center">
                  <Switch checked={a.is_active} onChange={(e) => update(a.id, { is_active: e.target.checked })} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openRefs(a)} title="Lịch sử giới thiệu">
                    <Iconify icon="solar:list-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có cộng tác viên
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!refsFor} onClose={() => setRefsFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Lịch sử giới thiệu — {refsFor?.email}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Đơn</TableCell>
                <TableCell align="right">Giá trị</TableCell>
                <TableCell align="right">Hoa hồng</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.order_id}</TableCell>
                  <TableCell align="right">{fCurrency(r.order_amount)}</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    +{fCurrency(r.commission)}
                  </TableCell>
                  <TableCell align="center">
                    <Label color={(r.status === 'approved' || r.status === 'paid') ? 'success' : r.status === 'pending' ? 'warning' : 'default'}>
                      {r.status}
                    </Label>
                  </TableCell>
                </TableRow>
              ))}
              {!refs.length && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Chưa có giới thiệu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ----------------------------------------------------------------------
// DUYỆT RÚT TIỀN

function WithdrawalsTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/balance/admin/withdrawals', { params: { status } })
      .then((r) => setRows(r.data?.items || []))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => load(), [load]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    try {
      await axiosInstance.post(`/api/balance/admin/withdrawals/${id}/${action}`);
      ok(action === 'approve' ? 'Đã duyệt' : 'Đã từ chối');
      load();
    } catch (e) {
      err(e);
    }
  };

  return (
    <Card>
      <Stack direction="row" sx={{ p: 2 }}>
        <TextField select size="small" label="Trạng thái" sx={{ minWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="pending">Chờ duyệt</MenuItem>
          <MenuItem value="completed">Đã duyệt</MenuItem>
          <MenuItem value="failed">Từ chối</MenuItem>
        </TextField>
      </Stack>
      {loading ? (
        <Loading />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Người dùng</TableCell>
                <TableCell align="right">Số tiền</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w.id} hover>
                  <TableCell>{w.user_email}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {fCurrency(w.amount)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{w.created_at ? new Date(w.created_at).toLocaleString('vi-VN') : '-'}</TableCell>
                  <TableCell align="center">
                    <Label color={(w.status === 'completed' && 'success') || (w.status === 'failed' && 'error') || 'warning'}>{w.status}</Label>
                  </TableCell>
                  <TableCell align="right">
                    {w.status === 'pending' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton color="success" title="Duyệt" onClick={() => act(w.id, 'approve')}>
                          <Iconify icon="solar:check-circle-bold" />
                        </IconButton>
                        <IconButton color="error" title="Từ chối" onClick={() => act(w.id, 'reject')}>
                          <Iconify icon="solar:close-circle-bold" />
                        </IconButton>
                      </Stack>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Không có yêu cầu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------
// CẤU HÌNH

function ConfigTab() {
  const { ok, err } = useSnack();
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/admin/settings')
      .then((r) => setRate(r.data?.affiliate_commission_rate || ''))
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.patch('/api/admin/settings', { affiliate_commission_rate: String(rate || '') });
      ok('Đã lưu cấu hình');
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card sx={{ maxWidth: 480 }}>
      <CardHeader title="Cấu hình giới thiệu" subheader="Áp dụng cho cộng tác viên đăng ký mới" />
      <CardContent>
        <Stack spacing={2.5}>
          <TextField
            type="number"
            label="Tỷ lệ hoa hồng mặc định (%)"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            helperText="Phần trăm hoa hồng trên mỗi đơn của người được giới thiệu"
          />
          <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
            Lưu
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
