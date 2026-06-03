// next
import NextLink from 'next/link';
// @mui
import { Box, Button, Divider, Typography, Stack, DialogProps } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
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
        <Typography variant="h4">Đặt hàng thành công! 🎉</Typography>

        <OrderCompleteIllustration sx={{ height: 240 }} />

        <Typography sx={{ color: 'text.secondary' }}>
          Cảm ơn bạn đã đặt hàng.
          {orderCode && (
            <>
              <br />
              Mã đơn của bạn là{' '}
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 'fontWeightBold' }}>
                {orderCode}
              </Box>
            </>
          )}
          <br />
          <br />
          Sản phẩm giao tự động sẽ có ngay trong chi tiết đơn hàng. Bạn cũng sẽ nhận thông báo khi đơn được xử lý.
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
            Tiếp tục mua sắm
          </Button>

          {orderCode && (
            <Button
              size="large"
              variant="contained"
              component={NextLink}
              href={PATH_DASHBOARD.orders.view(orderCode)}
              startIcon={<Iconify icon="solar:bag-check-bold" />}
            >
              Xem đơn hàng
            </Button>
          )}
        </Stack>
      </Stack>
    </DialogAnimate>
  );
}
