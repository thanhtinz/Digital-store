import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
import NextLink from 'next/link';
// @mui
import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Container,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// locales
import { useLocales } from '../../locales';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import EmptyContent from '../../components/empty-content';

// ----------------------------------------------------------------------

FlashSalePage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

type FlashSale = {
  id: number;
  product_name?: string;
  product_slug?: string;
  product_image?: string;
  package_name?: string;
  sale_price?: number;
  original_price?: number;
  quantity_limit?: number;
  quantity_sold?: number;
  starts_at?: string;
  ends_at?: string;
};

export default function FlashSalePage() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`flash_sale_page.${k}`)}`;
  const [active, setActive] = useState<FlashSale[]>([]);
  const [upcoming, setUpcoming] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      axiosInstance.get('/api/flash-sales/active'),
      axiosInstance.get('/api/flash-sales/upcoming'),
    ])
      .then(([a, u]) => {
        if (!alive) return;
        if (a.status === 'fulfilled' && Array.isArray(a.value.data)) setActive(a.value.data);
        if (u.status === 'fulfilled' && Array.isArray(u.value.data)) setUpcoming(u.value.data);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const isEmpty = !loading && active.length === 0 && upcoming.length === 0;

  return (
    <>
      <Head>
        <title> Flash Sale | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          {t('title')}
        </Typography>

        {isEmpty ? (
          <EmptyContent
            title={t('empty')}
            img="/assets/illustrations/illustration_empty_content.svg"
          />
        ) : (
          <Stack spacing={5}>
            {(loading || active.length > 0) && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('happening')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: 'repeat(1,1fr)', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                  }}
                >
                  {active.map((f) => (
                    <FlashCard key={f.id} sale={f} />
                  ))}
                </Box>
              </Box>
            )}

            {upcoming.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('upcoming')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: 'repeat(1,1fr)', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                  }}
                >
                  {upcoming.map((f) => (
                    <FlashCard key={f.id} sale={f} upcoming />
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

function FlashCard({ sale, upcoming }: { sale: FlashSale; upcoming?: boolean }) {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`flash_sale_page.${k}`)}`;
  const target = upcoming ? sale.starts_at : sale.ends_at;
  const countdown = useCountdown(target);

  const limit = Number(sale.quantity_limit) || 0;
  const sold = Number(sale.quantity_sold) || 0;
  const soldPct = limit > 0 ? Math.min(100, Math.round((sold / limit) * 100)) : 0;
  const off =
    sale.original_price && sale.sale_price && sale.original_price > sale.sale_price
      ? Math.round((1 - sale.sale_price / sale.original_price) * 100)
      : 0;

  const href = sale.product_slug ? PATH_DASHBOARD.eCommerce.view(sale.product_slug) : undefined;

  const card = (
    <Card
      sx={{
        p: 0,
        overflow: 'hidden',
        height: 1,
        transition: (theme) => theme.transitions.create('box-shadow'),
        ...(href && { '&:hover': { boxShadow: (theme) => theme.customShadows?.z16 } }),
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Image src={sale.product_image || ''} alt={sale.product_name} ratio="16/9" />
        {off > 0 && (
          <Chip
            label={`-${off}%`}
            color="error"
            size="small"
            sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700 }}
          />
        )}
        {/* Đếm ngược */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            color: 'common.white',
            bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
          }}
        >
          <Iconify icon="solar:alarm-bold" width={16} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {countdown}
          </Typography>
        </Stack>
      </Box>

      <Stack spacing={1} sx={{ p: 2 }}>
        <Typography variant="subtitle2" noWrap title={sale.product_name}>
          {sale.product_name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {sale.package_name}
        </Typography>

        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h6" color="error.main">
            {fCurrency(sale.sale_price || 0)}
          </Typography>
          {!!sale.original_price && sale.original_price > (sale.sale_price || 0) && (
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', textDecoration: 'line-through' }}
            >
              {fCurrency(sale.original_price)}
            </Typography>
          )}
        </Stack>

        {!upcoming && limit > 0 && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={soldPct}
              color="error"
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('sold')} {sold}/{limit}
            </Typography>
          </Box>
        )}

        {upcoming && (
          <Chip
            size="small"
            variant="soft"
            color="warning"
            label={t('starts_soon')}
            sx={{ alignSelf: 'flex-start' }}
          />
        )}
      </Stack>
    </Card>
  );

  if (!href) return card;
  return (
    <Link component={NextLink} href={href} underline="none" color="inherit" sx={{ height: 1 }}>
      {card}
    </Link>
  );
}

// ----------------------------------------------------------------------

// Đếm ngược tới mốc thời gian (ISO). Trả chuỗi dạng "1d 02:03:04" hoặc "00:05:00".
function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return '--:--:--';
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return '00:00:00';
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days > 0 ? `${days}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
}
