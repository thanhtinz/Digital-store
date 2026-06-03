import { useEffect, useState } from 'react';
// @mui
import {
  Card,
  CircularProgress,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
import { fDateTime } from '../../utils/formatTime';
// components
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
                  </TableRow>
                ))}
                {!orders.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Không có đơn hàng
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
