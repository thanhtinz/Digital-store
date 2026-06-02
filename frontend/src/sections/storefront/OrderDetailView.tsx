import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
import { useRouter } from 'next/router';
// @mui
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
import { fDateTime } from '../../utils/formatTime';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
//
import { orderStatusColor, orderStatusLabel } from './orderStatus';

// ----------------------------------------------------------------------

type OrderItem = {
  id: number;
  productName?: string;
  packageName?: string;
  quantity?: number;
  lineTotal?: number;
  status?: string;
  deliveryData?: any;
};

type Order = {
  id: number;
  orderCode: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  createdAt: string;
  deliveryData?: any;
  items?: OrderItem[];
};

function deliveryToText(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map((d) => (typeof d === 'string' ? d : JSON.stringify(d))).join('\n');
  return JSON.stringify(data, null, 2);
}

// ----------------------------------------------------------------------

export default function OrderDetailView() {
  const { query, push } = useRouter();
  const code = query.code as string;
  const { enqueueSnackbar } = useSnackbar();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = () => {
    if (!code) return;
    axiosInstance
      .get(`/api/orders/my/${code}`)
      .then((res) => setOrder(res.data))
      .catch(() => enqueueSnackbar('Không tìm thấy đơn hàng', { variant: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    enqueueSnackbar('Đã sao chép');
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>Đang tải…</Typography>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Không tìm thấy đơn hàng.</Typography>
        <Button component={NextLink} href={PATH_DASHBOARD.orders.root} sx={{ mt: 2 }}>
          ← Quay lại danh sách
        </Button>
      </Container>
    );
  }

  const isPending = order.status === 'pending' || order.status === 'pending_payment';
  const isCompleted = order.status === 'completed';
  const orderDelivery = deliveryToText(order.deliveryData);

  return (
    <Container sx={{ pb: 6 }}>
      <Button
        component={NextLink}
        href={PATH_DASHBOARD.orders.root}
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        sx={{ my: 2 }}
        color="inherit"
      >
        Quay lại danh sách
      </Button>

      <Grid container spacing={3}>
        {/* CỘT TRÁI */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, mb: 3, borderTop: (t) => `3px solid ${t.palette.primary.main}` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Chi tiết đơn hàng #{order.orderCode}</Typography>
              <Label variant="soft" color={orderStatusColor(order.status)}>
                {orderStatusLabel(order.status)}
              </Label>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {fDateTime(order.createdAt)}
            </Typography>
          </Card>

          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Sản phẩm trong đơn
            </Typography>
            <Stack spacing={2}>
              {(order.items || []).map((it) => (
                <Stack key={it.id} direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="subtitle2">{it.productName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {it.packageName} · SL: {it.quantity}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2">{fCurrency(it.lineTotal || 0)}</Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Tạm tính
                </Typography>
                <Typography variant="body2">{fCurrency(order.subtotalAmount)}</Typography>
              </Stack>
              {order.discountAmount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Giảm giá
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    -{fCurrency(order.discountAmount)}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Tổng thanh toán</Typography>
                <Typography variant="subtitle1">{fCurrency(order.totalAmount)}</Typography>
              </Stack>
            </Stack>
          </Card>

          {/* Thông tin đã giao */}
          {isCompleted && orderDelivery && (
            <Card sx={{ p: 3, bgcolor: 'success.lighter' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">Thông tin đã giao</Typography>
                <Button size="small" onClick={() => handleCopy(orderDelivery)} startIcon={<Iconify icon="eva:copy-fill" />}>
                  Sao chép
                </Button>
              </Stack>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {orderDelivery}
              </Box>
            </Card>
          )}
        </Grid>

        {/* CỘT PHẢI */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Trạng thái thanh toán
            </Typography>

            {isPending ? (
              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'warning.lighter' }}>
                  <Typography variant="body2" color="warning.darker">
                    Đơn chưa thanh toán. Hoàn tất thanh toán để được giao hàng tự động.
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  component={NextLink}
                  href={PATH_DASHBOARD.eCommerce.checkout}
                >
                  Thanh toán ngay
                </Button>
                <Button fullWidth variant="outlined" onClick={fetchOrder}>
                  Cập nhật trạng thái
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
                <Iconify
                  icon={isCompleted ? 'eva:checkmark-circle-2-fill' : 'eva:info-fill'}
                  width={48}
                  color={isCompleted ? 'success.main' : 'text.disabled'}
                />
                <Typography variant="subtitle1">{orderStatusLabel(order.status)}</Typography>
                <Button onClick={() => push(PATH_DASHBOARD.orders.root)} size="small">
                  Về danh sách đơn
                </Button>
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
