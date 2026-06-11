import { useEffect, useState } from 'react';
// @mui
import {
  Avatar,
  Box,
  Card,
  CircularProgress,
  Container,
  IconButton,
  MenuItem,
  Stack,
  Tooltip,
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
import { fDate } from '../../utils/formatTime';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import AdminPageHeader from './AdminPageHeader';

// ----------------------------------------------------------------------

type User = {
  id: number;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  balance: number;
  isActive: boolean;
  role: string;
  createdAt: string;
};

const ROLES = ['user', 'staff', 'admin', 'superadmin'];

export default function AdminUsersView() {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = (q?: string) => {
    setLoading(true);
    axiosInstance
      .get('/api/admin/users', { params: { limit: 100, search: q || undefined } })
      .then((r) => setUsers(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được người dùng', { variant: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPassword = async (u: User) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Đặt lại mật khẩu cho ${u.email}?`)) return;
    try {
      const r = await axiosInstance.post(`/api/admin/users/${u.id}/reset-password`);
      const pw = r.data?.new_password;
      const sent = r.data?.email_sent ? ' (đã gửi email)' : '';
      enqueueSnackbar(pw ? `Mật khẩu mới: ${pw}${sent}` : 'Đã đặt lại mật khẩu', { variant: 'success', autoHideDuration: 10000 });
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Đặt lại mật khẩu thất bại', { variant: 'error' });
    }
  };

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

  return (
    <Container sx={{ pb: 6 }} maxWidth="lg">
      <AdminPageHeader
        title="Người dùng"
        action={
          <TextField
            size="small"
            placeholder="Tìm theo email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(search)}
            InputProps={{
              startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />,
            }}
          />
        }
      />

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
                  <TableCell>Người dùng</TableCell>
                  <TableCell>Số dư</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell align="right">Vai trò</TableCell>
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
                          <Typography variant="subtitle2" noWrap>
                            {u.displayName || u.email}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                            {u.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{fCurrency(u.balance)}</TableCell>
                    <TableCell>
                      <Label color={u.isActive ? 'success' : 'default'} variant="soft">
                        {u.isActive ? 'Hoạt động' : 'Khoá'}
                      </Label>
                    </TableCell>
                    <TableCell>{fDate(u.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <Tooltip title="Đặt lại mật khẩu">
                          <IconButton size="small" onClick={() => resetPassword(u)}>
                            <Iconify icon="solar:key-bold" />
                          </IconButton>
                        </Tooltip>
                        <TextField
                          select
                          size="small"
                          value={ROLES.includes(u.role) ? u.role : 'user'}
                          onChange={(e) => changeRole(u, e.target.value)}
                          sx={{ minWidth: 110 }}
                        >
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>
                              {r}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Không có người dùng
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Container>
  );
}
