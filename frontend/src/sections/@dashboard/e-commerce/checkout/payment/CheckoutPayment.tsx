// @mui
import { Box, Card, Grid, Stack, Alert, Button, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useState } from 'react';
// next
import NextLink from 'next/link';
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
  const t = (k: string) => `${translate(`checkout_page.${k}`)}`;
  const [submitting, setSubmitting] = useState(false);

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
        payment_method: 'balance',
        coupon_code: (checkout as any).couponCode || undefined,
      });
      const code = res.data?.order_code || res.data?.orderCode || '';
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('balance:refresh'));
      onComplete?.(code);
      onNextStep();
      onReset();
    } catch (error: any) {
      enqueueSnackbar(error?.detail || error?.message || t('place_order_failed'), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('payment_method')}
          </Typography>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              border: (t) => `solid 2px ${t.palette.primary.main}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Iconify icon="solar:wallet-money-bold" width={32} sx={{ color: 'primary.main' }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1">{t('account_balance')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('current_balance')}: <b>{fCurrency(balance)}</b>
              </Typography>
            </Box>
          </Box>

          {!enough && (
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
          disabled={!enough}
          onClick={placeOrder}
          startIcon={<Iconify icon="solar:bag-check-bold" />}
        >
          {t('place_order_btn')}
        </LoadingButton>
      </Grid>
    </Grid>
  );
}
