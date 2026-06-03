import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import {
  Avatar,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
import { fDateTime } from '../../utils/formatTime';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
// sections (tái dùng form đổi mật khẩu của Minimal)
import AccountChangePassword from '../@dashboard/user/account/AccountChangePassword';
//
import { orderStatusColor, orderStatusLabel } from './orderStatus';

// ----------------------------------------------------------------------

const TX_LABEL: Record<string, string> = {
  topup: 'Nạp tiền',
  purchase: 'Mua hàng',
  refund: 'Hoàn tiền',
  affiliate_withdraw: 'Rút hoa hồng',
  admin_adjust: 'Điều chỉnh',
  card_charge: 'Nạp thẻ',
};

type Tx = {
  id: number;
  amount: number;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
};

type OrderLite = {
  id: number;
  orderCode: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

// ----------------------------------------------------------------------

export default function ProfileView() {
  const { user } = useAuthContext();

  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      axiosInstance.get('/api/balance/me'),
      axiosInstance.get('/api/balance/history', { params: { limit: 10 } }),
      axiosInstance.get('/api/orders/my', { params: { limit: 5 } }),
    ]).then(([bRes, tRes, oRes]) => {
      if (!alive) return;
      if (bRes.status === 'fulfilled') setBalance(bRes.value.data?.balance ?? 0);
      if (tRes.status === 'fulfilled') setTxs(tRes.value.data?.items || []);
      if (oRes.status === 'fulfilled') setOrders(oRes.value.data?.items || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const name =
    (user as any)?.displayName || (user as any)?.display_name || (user as any)?.email || 'Tài khoản';
  const email = (user as any)?.email || '';
  const avatar = (user as any)?.photoURL || (user as any)?.avatar_url || '';
  const provider = (user as any)?.provider || (user as any)?.auth_provider;

  return (
    <Container sx={{ pb: 6 }}>
      {/* COVER HEADER */}
      <Card
        sx={{
          mt: 3,
          mb: 3,
          p: { xs: 3, md: 4 },
          color: 'common.white',
          position: 'relative',
          overflow: 'hidden',
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={3}
        >
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Avatar
              src={avatar}
              alt={name}
              sx={{ width: 80, height: 80, border: '3px solid', borderColor: 'common.white' }}
            >
              {name?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" noWrap>
                {name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>
                {email}
              </Typography>
              {provider && (
                <Label variant="filled" color="default" sx={{ mt: 0.75, color: 'text.primary' }}>
                  {provider}
                </Label>
              )}
            </Box>
          </Stack>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              minWidth: 220,
              bgcolor: 'rgba(255,255,255,0.16)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:wallet-bold-duotone" width={24} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Số dư khả dụng
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {balance == null ? '…' : fCurrency(balance)}
            </Typography>
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="inherit"
              component={NextLink}
              href={PATH_DASHBOARD.chat.root}
              sx={{ mt: 1, color: 'primary.main' }}
            >
              Nạp tiền
            </Button>
          </Box>
        </Stack>
      </Card>

      <Grid container spacing={3}>
        {/* CỘT TRÁI: Bảo mật */}
        <Grid item xs={12} md={5}>
          <AccountChangePassword />
        </Grid>

        {/* CỘT PHẢI: Đơn + Giao dịch */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Đơn hàng gần đây</Typography>
              <Button
                component={NextLink}
                href={PATH_DASHBOARD.orders.root}
                size="small"
                endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              >
                Tất cả
              </Button>
            </Stack>
            {orders.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Chưa có đơn hàng.
              </Typography>
            ) : (
              <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={1.5}>
                {orders.map((o) => (
                  <Stack
                    key={o.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    component={NextLink}
                    href={PATH_DASHBOARD.orders.view(o.orderCode)}
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Box>
                      <Typography variant="subtitle2">#{o.orderCode}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {fDateTime(o.createdAt)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Label variant="soft" color={orderStatusColor(o.status)}>
                        {orderStatusLabel(o.status)}
                      </Label>
                      <Typography variant="subtitle2">{fCurrency(o.totalAmount)}</Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Lịch sử giao dịch
            </Typography>
            {txs.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Chưa có giao dịch.
              </Typography>
            ) : (
              <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={1.5}>
                {txs.map((t) => (
                  <Stack key={t.id} direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2">{TX_LABEL[t.type] || t.type}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t.description || fDateTime(t.createdAt)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="subtitle2"
                      color={t.amount >= 0 ? 'success.main' : 'error.main'}
                    >
                      {t.amount >= 0 ? '+' : ''}
                      {fCurrency(t.amount)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
