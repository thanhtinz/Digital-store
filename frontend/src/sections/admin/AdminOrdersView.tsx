import { useEffect, useState } from 'react';
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
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
import { fDateTime } from '../../utils/formatTime';
// components
import Iconify from '../../components/iconify';
import Label from '../../components/label';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

type Order = {
  id: number;
  order_code?: string;
  orderCode?: string;
  status: string;
  total_amount?: number;
  totalAmount?: number;
  created_at?: string;
  createdAt?: string;
  user_email?: string;
};

const STATUS_COLOR: Record<string, any> = {
  completed: 'success',
  paid: 'success',
  pending: 'warning',
  processing: 'info',
  cancelled: 'error',
  failed: 'error',
  refunded: 'default',
};

export default function AdminOrdersView() {
  const { enqueueSnackbar } = useSnackbar();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Dialog xem/cấp lại license mã nguồn của 1 đơn.
  const [licOrder, setLicOrder] = useState<Order | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [licLoading, setLicLoading] = useState(false);

  const openLicenses = (o: Order) => {
    setLicOrder(o);
    setLicLoading(true);
    setLicenses([]);
    axiosInstance
      .get('/api/admin/source/licenses', { params: { orderId: o.id } })
      .then((r) => setLicenses(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Lỗi tải license', { variant: 'error' }))
      .finally(() => setLicLoading(false));
  };

  const resend = async (licenseId: number) => {
    try {
      const r = await axiosInstance.post(`/api/admin/source/licenses/${licenseId}/resend`);
      enqueueSnackbar(`Đã cấp lại — license mới: ${r.data?.license_key}`);
      if (licOrder) openLicenses(licOrder);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Cấp lại thất bại', { variant: 'error' });
    }
  };

  useEffect(() => {
    axiosInstance
      .get('/api/orders/admin/all', { params: { limit: 100 } })
      .then((r) => setOrders(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được đơn hàng', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [enqueueSnackbar]);

  const code = (o: Order) => o.order_code || o.orderCode || `#${o.id}`;
  const total = (o: Order) => o.total_amount ?? o.totalAmount ?? 0;
  const date = (o: Order) => o.created_at || o.createdAt || '';

  return (
    <Container sx={{ pb: 6 }} maxWidth="lg">
      <Typography variant="h4" sx={{ my: 3 }}>
        Đơn hàng
      </Typography>

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
                  <TableCell>Mã đơn</TableCell>
                  <TableCell>Khách hàng</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thời gian</TableCell>
                  <TableCell align="center">License</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{code(o)}</Typography>
                    </TableCell>
                    <TableCell>{o.user_email || '—'}</TableCell>
                    <TableCell>{fCurrency(total(o))}</TableCell>
                    <TableCell>
                      <Label color={STATUS_COLOR[o.status] || 'default'} variant="soft">
                        {o.status}
                      </Label>
                    </TableCell>
                    <TableCell>{date(o) ? fDateTime(date(o)) : '—'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="License mã nguồn">
                        <IconButton size="small" onClick={() => openLicenses(o)}>
                          <Iconify icon="solar:key-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!orders.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Không có đơn hàng
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={!!licOrder} onClose={() => setLicOrder(null)} fullWidth maxWidth="sm">
        <DialogTitle>License mã nguồn — đơn {licOrder ? code(licOrder) : ''}</DialogTitle>
        <DialogContent dividers>
          {licLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : licenses.length ? (
            <Stack spacing={1.5}>
              {licenses.map((l) => (
                <Box
                  key={l.id}
                  sx={{ p: 1.5, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{l.product_name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      <code>{l.license_key}</code>
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {l.status === 'active' ? 'Đang hiệu lực' : 'Đã thu hồi'} · còn {l.remaining_downloads} lượt tải
                    </Typography>
                  </Box>
                  <Button size="small" variant="soft" onClick={() => resend(l.id)} startIcon={<Iconify icon="solar:refresh-bold" />}>
                    Cấp lại
                  </Button>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
              Đơn này không có sản phẩm mã nguồn.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setLicOrder(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
