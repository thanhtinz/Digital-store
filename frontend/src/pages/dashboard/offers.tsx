import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
// @mui
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// locales
import { useLocales } from '../../locales';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Iconify from '../../components/iconify';
import EmptyContent from '../../components/empty-content';
import { useSnackbar } from '../../components/snackbar';

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
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`offers_page.${k}`)}`;
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/gift-codes/public')
      .then((c) => {
        if (alive) setCoupons(Array.isArray(c.data) ? c.data : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    enqueueSnackbar(`${t('copied')} ${code}`);
  };

  return (
    <>
      <Head>
        <title> Ưu đãi | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          {t('title')}
        </Typography>

        {!loading && coupons.length === 0 ? (
          <EmptyContent title={t('empty')} img="/assets/illustrations/illustration_empty_content.svg" />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
            }}
          >
            {coupons.map((c) => (
              <CouponCard key={c.code} coupon={c} onCopy={copy} />
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

function CouponCard({ coupon, onCopy }: { coupon: Coupon; onCopy: (code: string) => void }) {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`offers_page.${k}`)}`;
  const value =
    coupon.discount_type === 'percent'
      ? `${t('discount_pct')} ${coupon.discount_value}%`
      : `${t('discount_fixed')} ${fCurrency(coupon.discount_value)}`;

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
        {coupon.min_order > 0 ? `${t('min_order')} ${fCurrency(coupon.min_order)}` : t('apply_all')}
        {coupon.max_discount ? ` · ${t('max_discount')} ${fCurrency(coupon.max_discount)}` : ''}
      </Typography>
      {coupon.expires_at && (
        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
          {t('expires')}: {new Date(coupon.expires_at).toLocaleDateString('vi-VN')}
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
