// @mui
import { Box, Card, Grid, Stack, Alert, Button, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useState } from 'react';
// next
import NextLink from 'next/link';
import { useRouter } from 'next/router';
// auth
import { useAuthContext } from '../../../../../auth/useAuthContext';
// locales
import { useLocales } from '../../../../../locales';
// routes
import { PATH_DASHBOARD } from '../../../../../routes/paths';
// @types
import { IProductCheckoutState } from '../../../../../@types/product';
// utils
import axios from '../../../../../utils/axios';
import { fCurrency } from '../../../../../utils/formatNumber';
// components
import Iconify from '../../../../../components/iconify';
import { useSnackbar } from '../../../../../components/snackbar';
//
import CheckoutSummary from '../CheckoutSummary';

// ----------------------------------------------------------------------

type Props = {
  checkout: IProductCheckoutState;
  onNextStep: VoidFunction;
  onBackStep: VoidFunction;
  onReset: VoidFunction;
  onGotoStep: (step: number) => void;
  onApplyShipping?: (value: number) => void;
  onComplete?: (orderCode: string) => void;
};

export default function CheckoutPayment({
  checkout,
  onReset,
  onNextStep,
  onBackStep,
  onGotoStep,
  onComplete,
}: Props) {
  const { total, discount, subtotal } = checkout;
  const { user } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const { push } = useRouter();
  const t = (k: string) => `${translate(`checkout_page.${k}`)}`;
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<'balance' | 'vietqr'>('balance');

  const balance = Number((user as any)?.balance || 0);
  const enough = balance >= total;

  const placeOrder = async () => {
    const items = (checkout.cart || [])
      .map((item: any) => ({
        product_id: item.id,
        package_id: Number(item.packageId),
        quantity: item.quantity || 1,
        custom_fields: item.customFields || undefined,
      }))
      .filter((it: any) => Number.isFinite(it.package_id) && it.package_id > 0);

    if (!items.length) {
      enqueueSnackbar(t('invalid_cart'), { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('/api/orders', {
        items,
        // 'sepay' = chuyển khoản VietQR (đơn tạo ở trạng thái chờ thanh toán)
        payment_method: method === 'balance' ? 'balance' : 'sepay',
        coupon_code: (checkout as any).couponCode || undefined,
      });
      const code = res.data?.order_code || res.data?.orderCode || '';
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('balance:refresh'));

      if (method === 'vietqr') {
        // Đơn chờ thanh toán → sang trang đơn hàng để quét QR chuyển khoản.
        onReset();
        push(PATH_DASHBOARD.orders.view(code));
        return;
      }
      onComplete?.(code);
      onNextStep();
      onReset();
    } catch (error: any) {
      enqueueSnackbar(error?.detail || error?.message || t('place_order_failed'), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const MethodCard = ({
    value,
    icon,
    title,
    desc,
  }: {
    value: 'balance' | 'vietqr';
    icon: string;
    title: string;
    desc: string;
  }) => {
    const selected = method === value;
    return (
      <Box
        onClick={() => setMethod(value)}
        sx={{
          p: 2.5,
          borderRadius: 1.5,
          cursor: 'pointer',
          border: (th) => `solid 2px ${selected ? th.palette.primary.main : th.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          transition: (th) => th.transitions.create('border-color'),
        }}
      >
        <Iconify icon={icon} width={32} sx={{ color: selected ? 'primary.main' : 'text.secondary' }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1">{title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {desc}
          </Typography>
        </Box>
        <Iconify
          icon={selected ? 'eva:radio-button-on-fill' : 'eva:radio-button-off-fill'}
          width={22}
          sx={{ color: selected ? 'primary.main' : 'text.disabled' }}
        />
      </Box>
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('payment_method')}
          </Typography>

          <Stack spacing={1.5}>
            <MethodCard
              value="balance"
              icon="solar:wallet-money-bold"
              title={t('method_balance')}
              desc={`${t('current_balance')}: ${fCurrency(balance)}`}
            />
            <MethodCard
              value="vietqr"
              icon="solar:qr-code-bold"
              title={t('method_vietqr')}
              desc={t('vietqr_desc')}
            />
          </Stack>

          {method === 'balance' && !enough && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
              action={
                <Button component={NextLink} href={PATH_DASHBOARD.wallet.topup} color="inherit" size="small">
                  {t('topup_btn')}
                </Button>
              }
            >
              {t('insufficient_balance')} ({fCurrency(total)}).
            </Alert>
          )}

          <Button
            size="small"
            color="inherit"
            onClick={onBackStep}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{ mt: 3 }}
          >
            {t('back_btn')}
          </Button>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <CheckoutSummary
          enableEdit
          total={total}
          subtotal={subtotal}
          discount={discount}
          onEdit={() => onGotoStep(0)}
        />
        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          loading={submitting}
          disabled={method === 'balance' && !enough}
          onClick={placeOrder}
          startIcon={<Iconify icon="solar:bag-check-bold" />}
        >
          {method === 'vietqr' ? t('create_qr_btn') : t('place_order_btn')}
        </LoadingButton>
      </Grid>
    </Grid>
  );
}
