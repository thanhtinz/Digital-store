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
      <Typography variant="h4" sx={{ my: 3 }}>
        Tài khoản của tôi
      </Typography>

      <Grid container spacing={3}>
        {/* CỘT TRÁI */}
        <Grid item xs={12} md={5}>
          {/* Thông tin hồ sơ */}
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={avatar} alt={name} sx={{ width: 64, height: 64 }}>
                {name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap>
                  {name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                  {email}
                </Typography>
                {provider && (
                  <Label variant="soft" color="info" sx={{ mt: 0.5 }}>
                    {provider}
                  </Label>
                )}
              </Box>
            </Stack>
          </Card>

          {/* Ví / Số dư */}
          <Card
            sx={{
              p: 3,
              mb: 3,
              color: 'common.white',
              background: (t) => `linear-gradient(135deg, ${t.palette.grey[900]} 0%, ${t.palette.grey[800]} 100%)`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Số dư khả dụng
                </Typography>
                <Typography variant="h3" sx={{ mt: 0.5 }}>
                  {balance == null ? '…' : fCurrency(balance)}
                </Typography>
              </Box>
              <Iconify icon="solar:wallet-bold-duotone" width={40} />
            </Stack>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              component={NextLink}
              href={PATH_DASHBOARD.chat.root}
              sx={{ mt: 2 }}
            >
              Nạp tiền
            </Button>
          </Card>

          {/* Đổi mật khẩu */}
          <AccountChangePassword />
        </Grid>

        {/* CỘT PHẢI */}
        <Grid item xs={12} md={7}>
          {/* Đơn gần đây */}
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Đơn hàng gần đây</Typography>
              <Button component={NextLink} href={PATH_DASHBOARD.orders.root} size="small">
                Xem tất cả
              </Button>
            </Stack>
            {orders.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Chưa có đơn hàng.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
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

          {/* Lịch sử giao dịch */}
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
