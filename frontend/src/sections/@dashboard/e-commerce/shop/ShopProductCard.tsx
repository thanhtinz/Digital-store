import { useState } from 'react';
import { paramCase } from 'change-case';
// next
import NextLink from 'next/link';
// @mui
import { Box, Card, Link, Stack, Fab, IconButton, Rating } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// auth
import { useAuthContext } from '../../../../auth/useAuthContext';
// utils
import axiosInstance from '../../../../utils/axios';
import { fCurrency } from '../../../../utils/formatNumber';
// redux
import { useDispatch } from '../../../../redux/store';
import { addToCart } from '../../../../redux/slices/product';
// @types
import { IProduct } from '../../../../@types/product';
// components
import Iconify from '../../../../components/iconify';
import Label from '../../../../components/label';
import Image from '../../../../components/image';
import { useSnackbar } from '../../../../components/snackbar';
import { ColorPreview } from '../../../../components/color-utils';

// ----------------------------------------------------------------------

type Props = {
  product: IProduct;
};

export default function ShopProductCard({ product }: Props) {
  const { id, name, status } = product;

  // Sản phẩm số: ảnh = imageUrl, giá = gói rẻ nhất, gói mặc định để thêm vào giỏ.
  const p: any = product;
  const packages: any[] = p.packages || [];
  const cheapest = packages
    .filter((pk) => pk.price > 0)
    .sort((a, b) => a.price - b.price)[0] || packages[0];
  const cover = p.imageUrl || p.cover || '';
  const ratingValue = Number(p.rating) || 0;
  const ratingCount = Number(p.ratingCount) || 0;
  const price = cheapest?.price ?? p.price ?? 0;
  const priceSale = cheapest?.originalPrice && cheapest.originalPrice > price ? cheapest.originalPrice : 0;
  const colors: string[] = p.colors || [];

  const dispatch = useDispatch();
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      enqueueSnackbar('Vui lòng đăng nhập để dùng Yêu thích', { variant: 'warning' });
      return;
    }
    setWishBusy(true);
    try {
      const r = await axiosInstance.post(`/api/wishlist/${id}`);
      const on = r.data?.wishlisted ?? !wishlisted;
      setWishlisted(on);
      enqueueSnackbar(on ? 'Đã thêm vào Yêu thích' : 'Đã bỏ khỏi Yêu thích');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Thao tác thất bại', { variant: 'error' });
    } finally {
      setWishBusy(false);
    }
  };

  const linkTo = PATH_DASHBOARD.eCommerce.view(paramCase(name));

  const handleAddCart = async () => {
    if (!cheapest) return;
    const newProduct = {
      id,
      name,
      cover,
      available: cheapest?.stockQuantity ?? 999,
      price,
      colors: colors.length ? [colors[0]] : [],
      size: '',
      quantity: 1,
      // BẮT BUỘC để đồng bộ giỏ lên backend (/api/cart/sync cần package_id).
      packageId: String(cheapest.id),
      subtotal: price,
    };
    try {
      dispatch(addToCart(newProduct));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Card
      sx={{
        '&:hover .add-cart-btn': {
          opacity: 1,
        },
      }}
    >
      <Box sx={{ position: 'relative', p: 1 }}>
        <IconButton
          onClick={toggleWishlist}
          disabled={wishBusy}
          sx={{
            top: 16,
            left: 16,
            zIndex: 9,
            position: 'absolute',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows?.z8,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <Iconify icon={wishlisted ? 'solar:heart-bold' : 'solar:heart-linear'} sx={{ color: wishlisted ? 'error.main' : 'text.secondary' }} />
        </IconButton>
        {status && (
          <Label
            variant="filled"
            color={(status === 'sale' && 'error') || 'info'}
            sx={{
              top: 16,
              right: 16,
              zIndex: 9,
              position: 'absolute',
              textTransform: 'uppercase',
            }}
          >
            {status}
          </Label>
        )}

        <Fab
          color="warning"
          size="medium"
          className="add-cart-btn"
          onClick={handleAddCart}
          sx={{
            right: 16,
            bottom: 16,
            zIndex: 9,
            opacity: 0,
            position: 'absolute',
            transition: (theme) =>
              theme.transitions.create('all', {
                easing: theme.transitions.easing.easeInOut,
                duration: theme.transitions.duration.shorter,
              }),
          }}
        >
          <Iconify icon="ic:round-add-shopping-cart" />
        </Fab>

        <Image alt={name} src={cover} ratio="1/1" sx={{ borderRadius: 1.5 }} />
      </Box>

      <Stack spacing={2} sx={{ p: 3 }}>
        <Link component={NextLink} href={linkTo} color="inherit" variant="subtitle2" noWrap>
          {name}
        </Link>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Rating value={ratingValue} precision={0.1} readOnly size="small" />
          <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
            {ratingCount > 0 ? `(${ratingCount})` : 'Chưa có đánh giá'}
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <ColorPreview colors={colors} />

          <Stack direction="row" spacing={0.5} sx={{ typography: 'subtitle1' }}>
            {priceSale && (
              <Box component="span" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                {fCurrency(priceSale)}
              </Box>
            )}

            <Box component="span">{fCurrency(price)}</Box>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
