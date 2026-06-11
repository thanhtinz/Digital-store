import { useEffect, useState } from 'react';
// @mui
import { Card, Container, Divider, Link, Stack, Typography } from '@mui/material';
// locales
import { useLocales } from '../../../locales';
// utils
import axiosInstance from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';
import { fDateTime } from '../../../utils/formatTime';
// components
import Label from '../../../components/label';

// ----------------------------------------------------------------------

type SmmOrder = {
  id: number;
  service_name?: string;
  link?: string;
  quantity?: number;
  charge?: number;
  status?: string;
  created_at?: string;
};

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
  completed: 'success',
  pending: 'warning',
  in_progress: 'info',
  processing: 'info',
  partial: 'warning',
  canceled: 'error',
  cancelled: 'error',
  failed: 'error',
};

export default function SmmOrdersView() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`smm_orders.${k}`)}`;

  const [orders, setOrders] = useState<SmmOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/smm/orders', { params: { limit: 100 } })
      .then((res) => {
        if (alive) setOrders(res.data?.orders || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Container sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        {t('title')}
      </Typography>

      {loading ? (
        <Typography sx={{ color: 'text.secondary' }}>{t('loading')}</Typography>
      ) : orders.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>{t('empty')}</Card>
      ) : (
        <Stack spacing={2}>
          {orders.map((o) => (
            <Card key={o.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">#{o.id}</Typography>
                <Label variant="soft" color={STATUS_COLOR[o.status || ''] || 'default'}>
                  {o.status}
                </Label>
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {o.service_name}
              </Typography>
              <Link href={o.link} target="_blank" rel="noopener" variant="caption" noWrap sx={{ display: 'block' }}>
                {o.link}
              </Link>
              <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('quantity_short')}: {o.quantity} · {o.created_at ? fDateTime(o.created_at) : ''}
                </Typography>
                <Typography variant="subtitle2">{fCurrency(o.charge || 0)}</Typography>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
