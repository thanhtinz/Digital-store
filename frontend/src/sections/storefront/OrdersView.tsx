import { useEffect, useMemo, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import {
  Avatar,
  Button,
  Card,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
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
import Scrollbar from '../../components/scrollbar';
import EmptyContent from '../../components/empty-content';
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';
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
  quantity?: number;
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

  const totalQty = (o: Order): number =>
    o.items && o.items.length
      ? o.items.reduce((s, it) => s + (it.quantity || 1), 0)
      : o.quantity || 1;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

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

  const filtered = orders
    .filter((o) => matchOrderFilter(o.status, tab))
    .filter((o) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        o.orderCode.toLowerCase().includes(q) ||
        summaryLabel(o).toLowerCase().includes(q)
      );
    });

  return (
    <Container sx={{ pb: 6 }}>
      <CustomBreadcrumbs
        heading={t('title')}
        links={[{ name: t('bc_home'), href: '/' }, { name: t('title') }]}
        sx={{ mt: 2 }}
      />

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, bgcolor: 'background.neutral' }}
        >
          {ORDER_FILTER_TABS.map((tabItem) => (
            <Tab
              key={tabItem.value}
              value={tabItem.value}
              label={`${t(tabItem.labelKey)} (${counts[tabItem.value] || 0})`}
            />
          ))}
        </Tabs>

        <Stack sx={{ p: 2.5 }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_ph')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 360 }}
          />
        </Stack>

        {loading ? (
          <Typography sx={{ color: 'text.secondary', p: 3 }}>{t('loading')}</Typography>
        ) : filtered.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 2 }}>
            <EmptyContent title={t('empty')} sx={{ py: 4 }} />
            <Button
              component={NextLink}
              href={PATH_DASHBOARD.eCommerce.shop}
              variant="contained"
              sx={{ mb: 4 }}
            >
              {t('shop_now')}
            </Button>
          </Stack>
        ) : (
          <TableContainer sx={{ overflow: 'unset' }}>
            <Scrollbar>
              <Table sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('col_product')}</TableCell>
                    <TableCell>{t('col_date')}</TableCell>
                    <TableCell align="center">{t('col_qty')}</TableCell>
                    <TableCell align="right">{t('col_total')}</TableCell>
                    <TableCell align="center">{t('col_status')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          {o.productImg ? (
                            <Image
                              src={o.productImg}
                              alt={o.orderCode}
                              sx={{ width: 48, height: 48, borderRadius: 1, flexShrink: 0 }}
                            />
                          ) : (
                            <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'background.neutral' }}>
                              <Iconify icon="solar:box-bold-duotone" />
                            </Avatar>
                          )}
                          <Stack sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              #{o.orderCode}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                              {summaryLabel(o)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', typography: 'caption' }}>
                        {fDateTime(o.createdAt)}
                      </TableCell>
                      <TableCell align="center">{totalQty(o)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">{fCurrency(o.totalAmount)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Label variant="soft" color={orderStatusColor(o.status)}>
                          {orderStatusKey(o.status) ? t(orderStatusKey(o.status)) : o.status || '—'}
                        </Label>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('view_detail')}>
                          <IconButton component={NextLink} href={PATH_DASHBOARD.orders.view(o.orderCode)}>
                            <Iconify icon="eva:arrow-ios-forward-fill" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>
        )}
      </Card>
    </Container>
  );
}
