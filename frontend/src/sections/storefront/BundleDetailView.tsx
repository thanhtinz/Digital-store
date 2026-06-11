import { useEffect, useState } from 'react';
// next
import { useRouter } from 'next/router';
// @mui
import { Box, Card, Container, Divider, Grid, Stack, Typography, LinearProgress } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// redux
import { useDispatch } from '../../redux/store';
import { addToCart, gotoStep } from '../../redux/slices/product';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

export default function BundleDetailView() {
  const { query, push } = useRouter();
  const slug = (query.slug as string) || '';
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    axiosInstance
      .get(`/api/bundles/${slug}`)
      .then((r) => setBundle(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const addBundleToCart = () => {
    if (!bundle?.items?.length) return;
    setAdding(true);
    try {
      // Phân bổ giá combo theo tỉ trọng từng gói để tổng giỏ = giá combo.
      const itemsTotal = bundle.items_total || bundle.items.reduce((s: number, it: any) => s + it.price * it.quantity, 0);
      bundle.items.forEach((it: any) => {
        const ratio = itemsTotal > 0 ? (it.price * it.quantity) / itemsTotal : 1 / bundle.items.length;
        const allocated = Math.round((bundle.price * ratio) / it.quantity);
        dispatch(
          addToCart({
            id: `pkg-${it.package_id}`,
            name: `${it.product_name || it.package_name}${it.package_name ? ` - ${it.package_name}` : ''}`,
            cover: it.image_url || '',
            available: 999,
            price: allocated,
            quantity: it.quantity || 1,
            packageId: String(it.package_id),
            packageName: it.package_name,
            subtotal: allocated * (it.quantity || 1),
          } as any)
        );
      });
      dispatch(gotoStep(0));
      enqueueSnackbar('Đã thêm combo vào giỏ hàng');
      push(PATH_DASHBOARD.eCommerce.checkout);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <Container sx={{ py: 5 }}><LinearProgress /></Container>;
  if (!bundle) return <Container sx={{ py: 5 }}><Typography>Không tìm thấy combo.</Typography></Container>;

  const save = (bundle.original_price || bundle.items_total) - bundle.price;

  return (
    <Container sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>{bundle.name}</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <Image alt={bundle.name} src={bundle.image_url || bundle.items?.[0]?.image_url || '/assets/placeholder.svg'} ratio="16/9" />
          </Card>
          <Card sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Combo gồm</Typography>
            <Divider sx={{ mb: 1 }} />
            <Stack divider={<Divider />}>
              {bundle.items.map((it: any) => (
                <Stack key={it.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                    <Image alt={it.product_name} src={it.image_url || '/assets/placeholder.svg'} ratio="1/1" />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">{it.product_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {it.package_name} × {it.quantity}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{fCurrency(it.price * it.quantity)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
          {bundle.description && (
            <Card sx={{ p: 3, mt: 3 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{bundle.description}</Typography>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, position: 'sticky', top: 24 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="h4" color="error.main">{fCurrency(bundle.price)}</Typography>
                {save > 0 && (
                  <Typography variant="body1" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                    {fCurrency(bundle.original_price || bundle.items_total)}
                  </Typography>
                )}
              </Stack>
              {save > 0 && (
                <Typography variant="body2" color="success.main">
                  Tiết kiệm {fCurrency(save)} so với mua lẻ
                </Typography>
              )}
              <LoadingButton
                variant="contained"
                size="large"
                loading={adding}
                onClick={addBundleToCart}
                startIcon={<Iconify icon="solar:cart-plus-bold" />}
              >
                Mua combo
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
