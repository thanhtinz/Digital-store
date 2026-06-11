// next
import NextLink from 'next/link';
// @mui
import { Box, Button, Divider, Typography, Stack, DialogProps } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// locales
import { useLocales } from '../../../../locales';
// components
import Iconify from '../../../../components/iconify';
import { DialogAnimate } from '../../../../components/animate';
// assets
import { OrderCompleteIllustration } from '../../../../assets/illustrations';

// ----------------------------------------------------------------------

interface Props extends DialogProps {
  orderCode?: string;
  onReset: VoidFunction;
  onDownloadPDF: VoidFunction;
}

export default function CheckoutOrderComplete({ open, orderCode, onReset }: Props) {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`checkout_page.${k}`)}`;
  return (
    <DialogAnimate
      fullScreen
      open={open}
      PaperProps={{
        sx: {
          maxWidth: { md: 'calc(100% - 48px)' },
          maxHeight: { md: 'calc(100% - 48px)' },
        },
      }}
    >
      <Stack spacing={4} sx={{ m: 'auto', maxWidth: 480, textAlign: 'center', px: { xs: 2, sm: 0 } }}>
        <Typography variant="h4">{t('success_title')}</Typography>

        <OrderCompleteIllustration sx={{ height: 240 }} />

        <Typography sx={{ color: 'text.secondary' }}>
          {t('thanks')}
          {orderCode && (
            <>
              <br />
              {t('your_order_code')}{' '}
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 'fontWeightBold' }}>
                {orderCode}
              </Box>
            </>
          )}
          <br />
          <br />
          {t('success_message')}
        </Typography>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack spacing={2} direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="center">
          <Button
            size="large"
            color="inherit"
            variant="outlined"
            onClick={onReset}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            {t('continue_shopping')}
          </Button>

          {orderCode && (
            <Button
              size="large"
              variant="contained"
              component={NextLink}
              href={PATH_DASHBOARD.orders.view(orderCode)}
              startIcon={<Iconify icon="solar:bag-check-bold" />}
            >
              {t('view_order')}
            </Button>
          )}
        </Stack>
      </Stack>
    </DialogAnimate>
  );
}
