import { useEffect, useMemo, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
// locales
import { useLocales } from '../../locales';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
import { fDateTime } from '../../utils/formatTime';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Label from '../../components/label';
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
//
import {
  ORDER_FILTER_TABS,
  matchOrderFilter,
  orderStatusColor,
  orderStatusKey,
} from './orderStatus';

// ----------------------------------------------------------------------

type OrderItem = {
  productName?: string;
  packageName?: string;
  quantity?: number;
};

type Order = {
  id: number;
  orderCode: string;
  status: string;
  totalAmount: number;
  productName?: string;
  productImg?: string;
  createdAt: string;
  items?: OrderItem[];
};

// ----------------------------------------------------------------------

export default function OrdersView() {
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`orders_page.${k}`)}`;

  const summaryLabel = (o: Order): string => {
    if (o.items && o.items.length) {
      const first = o.items[0];
      const extra =
        o.items.length > 1 ? ` +${o.items.length - 1} ${t('more_products')}` : '';
      return `${first.productName || ''}${first.packageName ? ` - ${first.packageName}` : ''}${extra}`;
    }
    return o.productName || t('order');
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/orders/my', { params: { limit: 100 } })
      .then((res) => {
        if (alive) setOrders(res.data?.items || []);
      })
      .catch(() => enqueueSnackbar(t('load_failed'), { variant: 'error' }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [enqueueSnackbar]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    ORDER_FILTER_TABS.forEach((tabItem) => {
      map[tabItem.value] = orders.filter((o) =>
        matchOrderFilter(o.status, tabItem.value)
      ).length;
    });
    return map;
  }, [orders]);

  const filtered = orders.filter((o) => matchOrderFilter(o.status, tab));

  return (
    <Container sx={{ pb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1, mt: 2 }}>
        <Iconify icon="solar:bill-list-bold-duotone" width={32} />
        <Typography variant="h4">{t('title')}</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t('total_prefix')} {orders.length} {t('total_suffix')}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {ORDER_FILTER_TABS.map((tabItem) => (
          <Tab
            key={tabItem.value}
            value={tabItem.value}
            label={`${t(tabItem.labelKey)} (${counts[tabItem.value] || 0})`}
          />
        ))}
      </Tabs>

      {loading ? (
        <Typography sx={{ color: 'text.secondary' }}>{t('loading')}</Typography>
      ) : filtered.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary' }}>{t('empty')}</Typography>
          <Button
            component={NextLink}
            href={PATH_DASHBOARD.eCommerce.shop}
            variant="contained"
            sx={{ mt: 2 }}
          >
            {t('shop_now')}
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filtered.map((o) => (
            <Card key={o.id} sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1">#{o.orderCode}</Typography>
                <Label variant="soft" color={orderStatusColor(o.status)}>
                  {orderStatusKey(o.status) ? t(orderStatusKey(o.status)) : o.status || '—'}
                </Label>
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {summaryLabel(o)}
              </Typography>

              <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {fDateTime(o.createdAt)}
                </Typography>
                <Typography variant="subtitle2">
                  {t('total_label')}: {fCurrency(o.totalAmount)}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
                {o.productImg ? (
                  <Image
                    src={o.productImg}
                    alt={o.orderCode}
                    sx={{ width: 56, height: 56, borderRadius: 1 }}
                  />
                ) : (
                  <Box />
                )}
                <Button
                  component={NextLink}
                  href={PATH_DASHBOARD.orders.view(o.orderCode)}
                  size="small"
                  variant="outlined"
                  endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                >
                  {t('view_detail')}
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
