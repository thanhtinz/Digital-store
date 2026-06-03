import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Button, Container, Stack, Typography } from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// locales
import { useLocales } from '../../locales';
// utils
import axiosInstance from '../../utils/axios';
// @types
import { IProduct } from '../../@types/product';
// components
import Iconify from '../../components/iconify';
import EmptyContent from '../../components/empty-content';
import { useSnackbar } from '../../components/snackbar';
// sections
import ShopProductList from '../@dashboard/e-commerce/shop/ShopProductList';

// ----------------------------------------------------------------------

export default function WishlistView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`wishlist_page.${k}`)}`;

  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    axiosInstance
      .get('/api/wishlist')
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : []))
      .catch((e) => enqueueSnackbar(e?.detail || t('load_failed'), { variant: 'error' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <Container sx={{ pt: { xs: 3, md: 5 }, pb: 8 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
        <Iconify icon="solar:heart-bold" width={28} sx={{ color: 'error.main' }} />
        <Typography variant="h4">{t('title')}</Typography>
        {!loading && products.length > 0 && (
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
            ({products.length})
          </Typography>
        )}
      </Stack>

      {!isAuthenticated ? (
        <EmptyContent title={t('login_required')} img="/assets/illustrations/illustration_empty_cart.svg" />
      ) : loading ? (
        <ShopProductList products={[]} loading />
      ) : products.length ? (
        <ShopProductList products={products} loading={false} />
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <EmptyContent
            title={t('empty_title')}
            description={t('empty_desc')}
            img="/assets/illustrations/illustration_empty_cart.svg"
          />
          <Button
            component={NextLink}
            href={PATH_DASHBOARD.eCommerce.shop}
            variant="contained"
            startIcon={<Iconify icon="solar:bag-smile-bold" />}
            sx={{ mt: 3 }}
          >
            {t('browse')}
          </Button>
        </Box>
      )}
    </Container>
  );
}
