import { useEffect, useState } from 'react';
// @mui
import { Box, Card, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency, fShortenNumber } from '../../utils/formatNumber';
// locales
import { useLocales } from '../../locales';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------
// Thẻ điểm thưởng (loyalty) cho trang tài khoản. Ẩn nếu tính năng tắt.
// ----------------------------------------------------------------------

export default function LoyaltyCard() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`account_page.${k}`)}`;
  const [data, setData] = useState<{ points: number; value: number; enabled: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/loyalty/me')
      .then((r) => {
        if (!alive) return;
        setData({
          points: Number(r.data?.points) || 0,
          value: Number(r.data?.value) || 0,
          enabled: !!r.data?.config?.enabled,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data || !data.enabled) return null;

  return (
    <Card
      sx={{
        p: 3,
        mt: 3,
        color: 'common.white',
        background: (th) =>
          `linear-gradient(135deg, ${th.palette.warning.main} 0%, ${th.palette.warning.dark} 100%)`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: 0.95 }}>
        <Iconify icon="solar:star-bold-duotone" width={22} />
        <Typography variant="body2">{t('points_title')}</Typography>
      </Stack>

      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1 }}>
        <Typography variant="h3">{fShortenNumber(data.points)}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {t('points_unit')}
        </Typography>
      </Stack>

      <Box sx={{ mt: 0.5, opacity: 0.95 }}>
        <Typography variant="body2">≈ {fCurrency(data.value)}</Typography>
      </Box>

      <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.85 }}>
        {t('points_hint')}
      </Typography>
    </Card>
  );
}
