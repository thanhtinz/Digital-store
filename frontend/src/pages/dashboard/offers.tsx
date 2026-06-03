import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
// @mui
import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// @types
import { IProduct } from '../../@types/product';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
// sections
import { ShopProductList } from '../../sections/@dashboard/e-commerce/shop';

// ----------------------------------------------------------------------

OffersPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

type Coupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  description?: string;
  expires_at?: string;
};

export default function OffersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      axiosInstance.get('/api/products', { params: { featured: true, limit: 24 } }),
      axiosInstance.get('/api/gift-codes/public').catch(() => ({ data: [] })),
    ])
      .then(([p, c]) => {
        if (!alive) return;
        setProducts(p.data?.products || p.data?.items || []);
        setCoupons(Array.isArray(c.data) ? c.data : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    enqueueSnackbar(`Đã sao chép mã ${code}`);
  };

  return (
    <>
      <Head>
        <title> Ưu đãi | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          Ưu đãi & Khuyến mãi
        </Typography>

        {coupons.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Mã giảm giá
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                mb: 5,
              }}
            >
              {coupons.map((c) => (
                <CouponCard key={c.code} coupon={c} onCopy={copy} />
              ))}
            </Box>
            <Divider sx={{ mb: 4 }} />
          </>
        )}

        <Typography variant="h6" sx={{ mb: 2 }}>
          Sản phẩm nổi bật
        </Typography>
        <ShopProductList products={products} loading={loading} />
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

function CouponCard({ coupon, onCopy }: { coupon: Coupon; onCopy: (code: string) => void }) {
  const value =
    coupon.discount_type === 'percent' ? `Giảm ${coupon.discount_value}%` : `Giảm ${fCurrency(coupon.discount_value)}`;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      }}
    >
      {/* Hai khuyết tròn kiểu vé */}
      <Box sx={{ position: 'absolute', top: '50%', left: -10, width: 20, height: 20, borderRadius: '50%', bgcolor: 'background.default', transform: 'translateY(-50%)' }} />
      <Box sx={{ position: 'absolute', top: '50%', right: -10, width: 20, height: 20, borderRadius: '50%', bgcolor: 'background.default', transform: 'translateY(-50%)' }} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:ticket-bold" />
        <Typography variant="h5">{value}</Typography>
      </Stack>

      {coupon.description && (
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
          {coupon.description}
        </Typography>
      )}
      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
        {coupon.min_order > 0 ? `Đơn tối thiểu ${fCurrency(coupon.min_order)}` : 'Áp dụng mọi đơn hàng'}
        {coupon.max_discount ? ` · Giảm tối đa ${fCurrency(coupon.max_discount)}` : ''}
      </Typography>
      {coupon.expires_at && (
        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
          HSD: {new Date(coupon.expires_at).toLocaleDateString('vi-VN')}
        </Typography>
      )}

      <Button
        fullWidth
        size="small"
        variant="contained"
        color="inherit"
        onClick={() => onCopy(coupon.code)}
        startIcon={<Iconify icon="solar:copy-bold" />}
        sx={{ mt: 1.5, color: 'primary.dark', bgcolor: (theme) => alpha(theme.palette.common.white, 0.92), '&:hover': { bgcolor: 'common.white' } }}
      >
        {coupon.code}
      </Button>
    </Box>
  );
}
