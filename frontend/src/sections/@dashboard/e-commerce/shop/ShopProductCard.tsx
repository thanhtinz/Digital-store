import { useState } from 'react';
import { paramCase } from 'change-case';
// next
import NextLink from 'next/link';
// @mui
import { Box, Card, Link, Stack, IconButton } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// auth
import { useAuthContext } from '../../../../auth/useAuthContext';
// locales
import { useLocales } from '../../../../locales';
// utils
import axiosInstance from '../../../../utils/axios';
import { fCurrency } from '../../../../utils/formatNumber';
// @types
import { IProduct } from '../../../../@types/product';
// components
import Iconify from '../../../../components/iconify';
import Label from '../../../../components/label';
import Image from '../../../../components/image';
import { useSnackbar } from '../../../../components/snackbar';

// ----------------------------------------------------------------------

type Props = {
  product: IProduct;
};

export default function ShopProductCard({ product }: Props) {
  const { id, name } = product;

  // Sản phẩm số: ảnh = imageUrl, giá = khoảng giá các gói.
  const p: any = product;
  const packages: any[] = p.packages || [];
  const cover = p.imageUrl || p.cover || '';
  const ratingValue = Number(p.rating) || 0;
  const ratingCount = Number(p.ratingCount) || 0;
  const soldCount = Number(p.soldCount) || 0;

  // Giá hiệu lực mỗi gói (ưu tiên giá flash sale)
  const effPrices = packages
    .map((pk: any) => Number(pk.flashSale?.salePrice ?? pk.price) || 0)
    .filter((n: number) => n > 0);
  const minP = effPrices.length ? Math.min(...effPrices) : 0;
  const maxP = effPrices.length ? Math.max(...effPrices) : 0;

  // Tag giao hàng: tự động (kho/api) hay thủ công
  const isAuto = packages.some(
    (pk: any) => pk.isStockManaged || ['stock', 'api'].includes(String(pk.deliveryType))
  );

  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const ts = (k: string) => `${translate(`shop_page.${k}`)}`;
  const [wishlisted, setWishlisted] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      enqueueSnackbar(ts('login_required_wishlist'), { variant: 'warning' });
      return;
    }
    setWishBusy(true);
    try {
      const r = await axiosInstance.post(`/api/wishlist/${id}`);
      const on = r.data?.wishlisted ?? !wishlisted;
      setWishlisted(on);
      enqueueSnackbar(on ? ts('added_to_wishlist') : ts('removed_from_wishlist'));
    } catch (e: any) {
      enqueueSnackbar(e?.detail || ts('action_failed'), { variant: 'error' });
    } finally {
      setWishBusy(false);
    }
  };

  const linkTo = PATH_DASHBOARD.eCommerce.view(paramCase(name));

  return (
    <Card sx={{ '&:hover': { boxShadow: (theme) => theme.customShadows?.z16 } }}>
      <Box sx={{ position: 'relative', p: 1 }}>
        {packages.length > 0 && (
          <Label
            variant="filled"
            color={isAuto ? 'success' : 'warning'}
            sx={{ top: 16, left: 16, zIndex: 9, position: 'absolute' }}
          >
            {isAuto ? ts('auto_delivery') : ts('manual_delivery')}
          </Label>
        )}
        <IconButton
          onClick={toggleWishlist}
          disabled={wishBusy}
          size="small"
          sx={{
            top: 16,
            right: 16,
            zIndex: 9,
            position: 'absolute',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows?.z8,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <Iconify icon={wishlisted ? 'solar:heart-bold' : 'solar:heart-linear'} sx={{ color: wishlisted ? 'error.main' : 'text.secondary' }} />
        </IconButton>

        <Image alt={name} src={cover} ratio="1/1" sx={{ borderRadius: 1.5 }} />
      </Box>

      <Stack spacing={1} sx={{ p: 2 }}>
        <Link component={NextLink} href={linkTo} color="inherit" variant="subtitle2" noWrap>
          {name}
        </Link>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ typography: 'caption', color: 'text.secondary', minHeight: 18 }}>
          {ratingCount > 0 ? (
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <Iconify icon="solar:star-bold" width={14} sx={{ color: 'warning.main' }} />
              <span>
                {ratingValue} ({ratingCount})
              </span>
            </Stack>
          ) : (
            <span />
          )}

          {soldCount > 0 && <span>{ts('sold_count')} {soldCount}</span>}
        </Stack>

        <Box component="span" sx={{ typography: 'subtitle1', color: packages.length ? 'text.primary' : 'info.main' }}>
          {packages.length === 0
            ? ts('contact_us')
            : minP === maxP
            ? fCurrency(minP)
            : `${fCurrency(minP)} – ${fCurrency(maxP)}`}
        </Box>
      </Stack>
    </Card>
  );
}
