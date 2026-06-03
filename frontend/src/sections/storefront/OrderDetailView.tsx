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
// locales
import { useLocales } from '../../locales';
// redux
import { useDispatch } from '../../redux/store';
import { addToCart, resetCart, gotoStep } from '../../redux/slices/product';
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
import { orderStatusColor, orderStatusKey } from './orderStatus';

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

// Timeline trạng thái đơn (hàng số): Đặt hàng → Thanh toán → Hoàn tất.
function OrderTimeline({ status }: { status: string }) {
  const failed = ['cancelled', 'expired', 'failed'].includes(status);
  const steps = ['Đặt hàng', 'Thanh toán', 'Hoàn tất'];
  const activeIndex = status === 'completed' ? 2 : status === 'paid' ? 1 : 0;

  if (failed) {
    return (
      <Card sx={{ p: 2.5, mb: 3, bgcolor: 'error.lighter' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:close-circle-bold" width={22} sx={{ color: 'error.main' }} />
          <Typography variant="subtitle2" color="error.darker">
            Đơn đã huỷ / thất bại
          </Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2.5, mb: 3 }}>
      <Stack direction="row" alignItems="center">
        {steps.map((label, i) => {
          const done = i <= activeIndex;
          return (
            <Stack key={label} direction="row" alignItems="center" sx={{ flex: i < steps.length - 1 ? 1 : 'unset' }}>
              <Stack alignItems="center" spacing={0.5}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: done ? 'common.white' : 'text.disabled',
                    bgcolor: done ? 'primary.main' : 'background.neutral',
                  }}
                >
                  <Iconify icon={done ? 'eva:checkmark-fill' : 'eva:radio-button-off-fill'} width={16} />
                </Box>
                <Typography variant="caption" sx={{ color: done ? 'text.primary' : 'text.disabled', whiteSpace: 'nowrap' }}>
                  {label}
                </Typography>
              </Stack>
              {i < steps.length - 1 && (
                <Box sx={{ flex: 1, height: 2, mx: 1, mb: 2.5, bgcolor: i < activeIndex ? 'primary.main' : 'divider' }} />
              )}
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}

export default function OrderDetailView() {
  const { query, push } = useRouter();
  const code = query.code as string;
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`order_detail.${k}`)}`;
  const statusLabel = (status?: string) => {
    const key = orderStatusKey(status);
    return key ? `${translate(`orders_page.${key}`)}` : status || '—';
  };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const dispatch = useDispatch();

  const fetchOrder = () => {
    if (!code) return;
    axiosInstance
      .get(`/api/orders/my/${code}`)
      .then((res) => setOrder(res.data))
      .catch(() => enqueueSnackbar(t('not_found_snackbar'), { variant: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    enqueueSnackbar(t('copied'));
  };

  // Huỷ đơn đang chờ (hoàn tiền vào số dư nếu đã trừ).
  const handleCancel = async () => {
    if (!order) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Huỷ đơn ${order.orderCode}?`)) return;
    setActing(true);
    try {
      await axiosInstance.post(`/api/orders/my/${order.orderCode}/cancel`);
      enqueueSnackbar('Đã huỷ đơn');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('balance:refresh'));
      fetchOrder();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Huỷ đơn thất bại', { variant: 'error' });
    } finally {
      setActing(false);
    }
  };

  // Mua lại: nạp các gói của đơn vào giỏ rồi sang thanh toán.
  const handleReorder = () => {
    if (!order) return;
    const src =
      order.items && order.items.length
        ? order.items
        : [{ id: order.id, packageId: (order as any).packageId, productName: (order as any).productName, packageName: (order as any).packageName, unitPrice: order.totalAmount, quantity: (order as any).quantity || 1 } as any];
    const cover = (order as any).productImg || '';
    dispatch(resetCart());
    src.forEach((it: any) => {
      if (!it.packageId) return;
      dispatch(
        addToCart({
          id: String(it.packageId),
          name: it.productName || order.orderCode,
          cover,
          available: 999,
          price: Number(it.unitPrice) || 0,
          colors: [],
          size: it.packageName || '',
          quantity: it.quantity || 1,
          packageId: String(it.packageId),
          subtotal: (Number(it.unitPrice) || 0) * (it.quantity || 1),
        } as any)
      );
    });
    dispatch(gotoStep(0));
    push(PATH_DASHBOARD.eCommerce.checkout);
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>{t('loading')}</Typography>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>{t('not_found')}</Typography>
        <Button component={NextLink} href={PATH_DASHBOARD.orders.root} sx={{ mt: 2 }}>
          ← {t('back_to_list')}
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
        {t('back_to_list')}
      </Button>

      <Grid container spacing={3}>
        {/* CỘT TRÁI */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, mb: 3, borderTop: (t) => `3px solid ${t.palette.primary.main}` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
                {t('order_title')} #{order.orderCode}
              </Typography>
              <Label variant="soft" color={orderStatusColor(order.status)}>
                {statusLabel(order.status)}
              </Label>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {fDateTime(order.createdAt)}
            </Typography>
          </Card>

          <OrderTimeline status={order.status} />

          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {t('products_in_order')}
            </Typography>
            <Stack spacing={2}>
              {(order.items || []).map((it) => (
                <Stack key={it.id} direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="subtitle2">{it.productName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {it.packageName} · {t('quantity_short')}: {it.quantity}
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
                  {t('subtotal')}
                </Typography>
                <Typography variant="body2">{fCurrency(order.subtotalAmount)}</Typography>
              </Stack>
              {order.discountAmount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('discount')}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    -{fCurrency(order.discountAmount)}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">{t('total_payment')}</Typography>
                <Typography variant="subtitle1">{fCurrency(order.totalAmount)}</Typography>
              </Stack>
            </Stack>
          </Card>

          {/* Thông tin đã giao */}
          {isCompleted && orderDelivery && (
            <Card sx={{ p: 3, bgcolor: 'success.lighter' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">{t('delivered_info')}</Typography>
                <Button size="small" onClick={() => handleCopy(orderDelivery)} startIcon={<Iconify icon="eva:copy-fill" />}>
                  {t('copy')}
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
              {t('payment_status')}
            </Typography>

            {isPending ? (
              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'warning.lighter' }}>
                  <Typography variant="body2" color="warning.darker">
                    {t('pending_note')}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  component={NextLink}
                  href={PATH_DASHBOARD.eCommerce.checkout}
                >
                  {t('pay_now')}
                </Button>
                <Button fullWidth variant="outlined" onClick={fetchOrder}>
                  {t('refresh_status')}
                </Button>
                <Button fullWidth color="error" variant="text" disabled={acting} onClick={handleCancel}>
                  Huỷ đơn
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                <Iconify
                  icon={isCompleted ? 'eva:checkmark-circle-2-fill' : 'eva:info-fill'}
                  width={48}
                  color={isCompleted ? 'success.main' : 'text.disabled'}
                />
                <Typography variant="subtitle1">{statusLabel(order.status)}</Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Iconify icon="solar:cart-plus-bold" />}
                  onClick={handleReorder}
                >
                  Mua lại
                </Button>
                <Button onClick={() => push(PATH_DASHBOARD.orders.root)} size="small" color="inherit">
                  {t('back_to_orders')}
                </Button>
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
