import { useEffect, useState } from 'react';
// @mui
import {
  Avatar, Box, Button, Card, CircularProgress, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AppLoader from '../../components/app-loader';
import { LoadingButton } from '@mui/lab';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency, fNumber } from '../../utils/formatNumber';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';
import ResponsiveDialog from '../../components/responsive-dialog';

// ----------------------------------------------------------------------

type User = {
  id: number;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  balance: number;
  points: number;
  isActive: boolean;
  role: string;
  createdAt: string;
};

const ROLES = ['user', 'staff', 'admin', 'superadmin'];
const CREATE_EMPTY = { email: '', password: '', display_name: '', role: 'user', balance: '0', points: '0' };

export default function AdminUsersView() {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // dialogs
  const [createForm, setCreateForm] = useState<typeof CREATE_EMPTY | null>(null);
  const [adjust, setAdjust] = useState<{ user: User; kind: 'balance' | 'points' } | null>(null);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (q?: string) => {
    setLoading(true);
    axiosInstance
      .get('/api/admin/users', { params: { limit: 100, search: q || undefined } })
      .then((r) => setUsers(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được người dùng', { variant: 'error' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const changeRole = async (u: User, role: string) => {
    const prev = u.role;
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
    try {
      await axiosInstance.patch(`/api/admin/users/${u.id}/role`, { role });
      enqueueSnackbar('Đã cập nhật vai trò');
    } catch (e: any) {
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: prev } : x)));
      enqueueSnackbar(e?.detail || 'Cập nhật vai trò thất bại', { variant: 'error' });
    }
  };

  const toggleActive = async (u: User) => {
    const next = !u.isActive;
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));
    try {
      await axiosInstance.patch(`/api/admin/users/${u.id}`, { is_active: next });
    } catch (e: any) {
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: !next } : x)));
      enqueueSnackbar(e?.detail || 'Cập nhật thất bại', { variant: 'error' });
    }
  };

  // ── Create ──
  const submitCreate = async () => {
    if (!createForm) return;
    setBusy(true);
    try {
      await axiosInstance.post('/api/admin/users', {
        email: createForm.email,
        password: createForm.password,
        display_name: createForm.display_name,
        role: createForm.role,
        balance: Number(createForm.balance) || 0,
        points: Number(createForm.points) || 0,
      });
      enqueueSnackbar('Đã tạo tài khoản');
      setCreateForm(null);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Tạo thất bại', { variant: 'error' });
    } finally { setBusy(false); }
  };

  // ── Delete ──
  const submitDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await axiosInstance.delete(`/api/admin/users/${toDelete.id}`);
      enqueueSnackbar('Đã xoá tài khoản');
      setUsers((list) => list.filter((x) => x.id !== toDelete.id));
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    } finally { setBusy(false); setToDelete(null); }
  };

  return (
    <Container sx={{ pb: 6 }} maxWidth="lg">
      <AdminPageHeader
        title="Người dùng"
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              size="small" placeholder="Tìm theo email..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(search)}
              InputProps={{ startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} /> }}
            />
            <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setCreateForm(CREATE_EMPTY)}>
              Thêm tài khoản
            </Button>
          </Stack>
        }
      />

      <Card>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><AppLoader /></Stack>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Người dùng</TableCell>
                  <TableCell align="right">Số dư</TableCell>
                  <TableCell align="right">Điểm</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell align="center">Hoạt động</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar src={u.avatarUrl || undefined} sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                          <Iconify icon="solar:user-rounded-bold" />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap>{u.displayName || u.email}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{u.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{fCurrency(u.balance)}</TableCell>
                    <TableCell align="right">{fNumber(u.points || 0)}</TableCell>
                    <TableCell>
                      <TextField
                        select size="small" value={ROLES.includes(u.role) ? u.role : 'user'}
                        onChange={(e) => changeRole(u, e.target.value)} sx={{ minWidth: 110 }}
                      >
                        {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell align="center">
                      <Switch size="small" checked={u.isActive} onChange={() => toggleActive(u)} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Điều chỉnh tiền">
                        <IconButton size="small" onClick={() => setAdjust({ user: u, kind: 'balance' })}>
                          <Iconify icon="solar:wallet-money-bold" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Điều chỉnh điểm">
                        <IconButton size="small" onClick={() => setAdjust({ user: u, kind: 'points' })}>
                          <Iconify icon="solar:star-bold" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Đổi mật khẩu">
                        <IconButton size="small" onClick={() => setPwUser(u)}>
                          <Iconify icon="solar:key-bold" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xoá">
                        <IconButton size="small" color="error" onClick={() => setToDelete(u)}>
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>Không có người dùng</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Tạo tài khoản */}
      <ResponsiveDialog open={!!createForm} onClose={() => setCreateForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>Thêm tài khoản</DialogTitle>
        <DialogContent>
          {createForm && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              <TextField label="Mật khẩu" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} helperText="Tối thiểu 6 ký tự" />
              <TextField label="Tên hiển thị (tuỳ chọn)" value={createForm.display_name} onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })} />
              <TextField select label="Vai trò" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth type="number" label="Số dư ban đầu (đ)" value={createForm.balance} onChange={(e) => setCreateForm({ ...createForm, balance: e.target.value })} />
                <TextField fullWidth type="number" label="Điểm ban đầu" value={createForm.points} onChange={(e) => setCreateForm({ ...createForm, points: e.target.value })} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateForm(null)}>Huỷ</Button>
          <LoadingButton variant="contained" loading={busy} onClick={submitCreate}>Tạo</LoadingButton>
        </DialogActions>
      </ResponsiveDialog>

      {/* Điều chỉnh tiền / điểm */}
      <AdjustDialog
        data={adjust}
        busy={busy}
        onClose={() => setAdjust(null)}
        onDone={(u, kind, value) => {
          setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, [kind]: value } : x)));
          setAdjust(null);
        }}
        setBusy={setBusy}
      />

      {/* Đổi mật khẩu */}
      <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá tài khoản"
        content={`Xoá vĩnh viễn "${toDelete?.email}"? Hành động không thể hoàn tác.`}
        action={<LoadingButton variant="contained" color="error" loading={busy} onClick={submitDelete}>Xoá</LoadingButton>}
      />
    </Container>
  );
}

// ----------------------------------------------------------------------

function AdjustDialog({
  data, busy, setBusy, onClose, onDone,
}: {
  data: { user: User; kind: 'balance' | 'points' } | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onClose: VoidFunction;
  onDone: (u: User, kind: 'balance' | 'points', value: number) => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'adjust' | 'set'>('adjust');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (data) { setMode('adjust'); setAmount(''); setNote(''); }
  }, [data]);

  if (!data) return null;
  const isMoney = data.kind === 'balance';
  const cur = isMoney ? data.user.balance : data.user.points;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await axiosInstance.post(`/api/admin/users/${data.user.id}/${data.kind}`, {
        mode, amount: Number(amount), note,
      });
      const value = isMoney ? r.data?.balance : r.data?.points;
      enqueueSnackbar('Đã cập nhật');
      onDone(data.user, data.kind, Number(value));
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    } finally { setBusy(false); }
  };

  return (
    <ResponsiveDialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isMoney ? 'Điều chỉnh số dư' : 'Điều chỉnh điểm'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {data.user.email} · hiện tại: <b>{isMoney ? fCurrency(cur) : `${fNumber(cur)} điểm`}</b>
          </Typography>
          <TextField select label="Kiểu" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <MenuItem value="adjust">Cộng / trừ (số âm để trừ)</MenuItem>
            <MenuItem value="set">Đặt giá trị tuyệt đối</MenuItem>
          </TextField>
          <TextField type="number" label={mode === 'set' ? 'Giá trị mới' : 'Số cộng/trừ'} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField label="Ghi chú (tuỳ chọn)" value={note} onChange={(e) => setNote(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Huỷ</Button>
        <LoadingButton variant="contained" loading={busy} disabled={amount === ''} onClick={submit}>Lưu</LoadingButton>
      </DialogActions>
    </ResponsiveDialog>
  );
}

function PasswordDialog({ user, onClose }: { user: User | null; onClose: VoidFunction }) {
  const { enqueueSnackbar } = useSnackbar();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPw(''); }, [user]);
  if (!user) return null;

  const run = async (custom: boolean) => {
    setBusy(true);
    try {
      const r = await axiosInstance.post(`/api/admin/users/${user.id}/reset-password`, custom ? { password: pw } : {});
      if (custom) {
        enqueueSnackbar('Đã đổi mật khẩu', { variant: 'success' });
      } else {
        const sent = r.data?.email_sent ? ' (đã gửi email)' : '';
        enqueueSnackbar(`Mật khẩu mới: ${r.data?.new_password}${sent}`, { variant: 'success', autoHideDuration: 10000 });
      }
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thất bại', { variant: 'error' });
    } finally { setBusy(false); }
  };

  return (
    <ResponsiveDialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Đổi mật khẩu — {user.email}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField label="Mật khẩu mới" value={pw} onChange={(e) => setPw(e.target.value)} helperText="Tối thiểu 6 ký tự" />
          <Button variant="text" onClick={() => run(false)} disabled={busy} startIcon={<Iconify icon="solar:refresh-bold" />}>
            Hoặc sinh mật khẩu ngẫu nhiên & gửi email
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Huỷ</Button>
        <LoadingButton variant="contained" loading={busy} disabled={pw.length < 6} onClick={() => run(true)}>Đặt mật khẩu</LoadingButton>
      </DialogActions>
    </ResponsiveDialog>
  );
}
