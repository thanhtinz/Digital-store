import { useEffect, useRef, useState } from 'react';
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
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// locales
import { useLocales } from '../../locales';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
import { fDate, fDateTime } from '../../utils/formatTime';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
// sections (form đổi mật khẩu của Minimal)
import AccountChangePassword from '../@dashboard/user/account/AccountChangePassword';
//
import LoyaltyCard from './LoyaltyCard';
import TwoFactorCard from './TwoFactorCard';
import { orderStatusColor, orderStatusKey } from './orderStatus';

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
  status?: string;
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
  const { user, refreshUser } = useAuthContext();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarUrl =
    (user as any)?.avatar_url || (user as any)?.avatarUrl || (user as any)?.photoURL || '';

  const handlePickAvatar = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng 1 file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar(`${translate('account_page_extra.avatar_invalid')}`, { variant: 'error' });
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploadingAvatar(true);
    try {
      await axiosInstance.post('/api/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser?.();
      enqueueSnackbar(`${translate('account_page_extra.avatar_updated')}`);
    } catch (err: any) {
      enqueueSnackbar(err?.detail || err?.message || `${translate('account_page_extra.avatar_failed')}`, {
        variant: 'error',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Nhãn loại/trạng thái giao dịch theo ngôn ngữ (fallback nếu thiếu key).
  const txLabel = (type: string) => {
    const k = `account_page.tx_${type}`;
    const v = `${translate(k)}`;
    return v === k ? TX_LABEL[type] || type : v;
  };
  const txStatusLabel = (s: string) => {
    const k = `account_page.txstatus_${s}`;
    const v = `${translate(k)}`;
    return v === k ? s : v;
  };

  // Nhãn trạng thái đơn hàng (dùng key i18n trong namespace orders_page).
  const orderStatusLabel = (status?: string) => {
    const key = orderStatusKey(status);
    return key ? `${translate(`orders_page.${key}`)}` : status || '—';
  };
  // Nhãn vai trò người dùng theo ngôn ngữ (fallback về giá trị gốc nếu thiếu key).
  const roleLabel = (r: string) => {
    const k = `account_page_extra.role_${r}`;
    const v = `${translate(k)}`;
    return v === k ? r : v;
  };

  // Số dư hiển thị NGAY từ thông tin user; nếu chưa có thì mặc định 0 (luôn hiện).
  const initialBalance = Number((user as any)?.balance);
  const [balance, setBalance] = useState<number>(
    Number.isFinite(initialBalance) ? initialBalance : 0
  );
  const [txs, setTxs] = useState<Tx[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loaded, setLoaded] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    // Cập nhật số dư nền (không xoá giá trị cũ nếu lỗi).
    axiosInstance
      .get('/api/balance/me')
      .then((r) => {
        const v = Number(r.data?.balance);
        if (mounted.current && Number.isFinite(v)) setBalance(v);
      })
      .catch(() => {});
    axiosInstance
      .get('/api/orders/my', { params: { limit: 5 } })
      .then((r) => mounted.current && setOrders(r.data?.items || []))
      .catch(() => {});
    axiosInstance
      .get('/api/balance/history', { params: { limit: 8 } })
      .then((r) => mounted.current && setTxs(r.data?.items || []))
      .catch(() => {})
      .finally(() => mounted.current && setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(user as any)?.id]);

  const name =
    (user as any)?.displayName ||
    (user as any)?.display_name ||
    (user as any)?.email ||
    `${translate('account_page_extra.default_name')}`;
  const email = (user as any)?.email || '';
  const role = (user as any)?.role || 'user';
  const createdAt = (user as any)?.created_at || (user as any)?.createdAt;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {`${translate('account_page.my_account')}`}
      </Typography>

      <Grid container spacing={3}>
        {/* CỘT TRÁI */}
        <Grid item xs={12} md={4}>
          {/* Thẻ thông tin tài khoản */}
          <Card sx={{ p: 3, textAlign: 'center', mb: 3 }}>
            <Box sx={{ position: 'relative', width: 96, height: 96, mx: 'auto', mb: 2 }}>
              <Avatar
                src={avatarUrl || undefined}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                }}
              >
                <Iconify icon="solar:user-rounded-bold" width={56} />
              </Avatar>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />

              {/* Nút đổi avatar */}
              <Box
                onClick={uploadingAvatar ? undefined : handlePickAvatar}
                sx={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  cursor: uploadingAvatar ? 'default' : 'pointer',
                  color: 'common.white',
                  bgcolor: 'primary.main',
                  border: (t) => `solid 2px ${t.palette.background.paper}`,
                  transition: (t) => t.transitions.create('opacity'),
                  '&:hover': { opacity: 0.85 },
                }}
              >
                <Iconify icon={uploadingAvatar ? 'eos-icons:loading' : 'solar:camera-bold'} width={18} />
              </Box>
            </Box>

            <Typography variant="h6" noWrap sx={{ px: 1 }}>
              {name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }} noWrap>
              {email}
            </Typography>

            <Label color="primary" variant="soft" sx={{ textTransform: 'capitalize' }}>
              {roleLabel(role)}
            </Label>

            {createdAt && (
              <>
                <Divider sx={{ borderStyle: 'dashed', my: 2.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {`${translate('account_page.member_since')}`}
                  </Typography>
                  <Typography variant="subtitle2">{fDate(createdAt)}</Typography>
                </Stack>
              </>
            )}
          </Card>

          {/* Thẻ số dư */}
          <Card
            sx={{
              p: 3,
              color: 'common.white',
              background: (t) =>
                `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: 0.9 }}>
              <Iconify icon="solar:wallet-money-bold-duotone" width={22} />
              <Typography variant="body2">{`${translate('account_page.available_balance')}`}</Typography>
            </Stack>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {fCurrency(balance)}
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              component={NextLink}
              href={PATH_DASHBOARD.wallet.topup}
              sx={{ mt: 2, color: 'primary.main' }}
            >
              {`${translate('account_page.topup')}`}
            </Button>
          </Card>

          {/* Thẻ điểm thưởng (ẩn nếu tắt) */}
          <LoyaltyCard />
        </Grid>

        {/* CỘT PHẢI */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Bảo mật */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {`${translate('account_page.security')}`}
              </Typography>
              <Stack spacing={3}>
                <TwoFactorCard />
                <AccountChangePassword />
              </Stack>
            </Box>

            {/* Đơn hàng gần đây */}
            <Card sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">{`${translate('account_page.recent_orders')}`}</Typography>
                <Button
                  component={NextLink}
                  href={PATH_DASHBOARD.orders.root}
                  size="small"
                  endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                >
                  {`${translate('account_page.view_all')}`}
                </Button>
              </Stack>

              {!loaded ? (
                <RowSkeleton />
              ) : orders.length === 0 ? (
                <Empty text={`${translate('account_page.no_orders')}`} />
              ) : (
                <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={2}>
                  {orders.map((o) => (
                    <Stack
                      key={o.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      component={NextLink}
                      href={PATH_DASHBOARD.orders.view(o.orderCode)}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: (t) => t.transitions.create('opacity'),
                        '&:hover': { opacity: 0.72 },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          #{o.orderCode}
                        </Typography>
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
              <Typography variant="h6" sx={{ mb: 2 }}>
                {`${translate('account_page.transactions')}`}
              </Typography>

              {!loaded ? (
                <RowSkeleton />
              ) : txs.length === 0 ? (
                <Empty text={`${translate('account_page.no_transactions')}`} />
              ) : (
                <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={2}>
                  {txs.map((t) => (
                    <Stack
                      key={t.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2">{txLabel(t.type)}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                          {t.description || fDateTime(t.createdAt)}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                        {t.status && t.status !== 'completed' && (
                          <Label variant="soft" color={t.status === 'failed' ? 'error' : 'warning'}>
                            {txStatusLabel(t.status)}
                          </Label>
                        )}
                        <Typography
                          variant="subtitle2"
                          sx={{
                            // Giao dịch chưa hoàn tất (vd nạp tiền chưa thanh toán) -> mờ, không hiện dấu +
                            color:
                              t.status && t.status !== 'completed'
                                ? 'text.disabled'
                                : t.amount >= 0
                                ? 'success.main'
                                : 'error.main',
                          }}
                        >
                          {(!t.status || t.status === 'completed') && t.amount >= 0 ? '+' : ''}
                          {fCurrency(t.amount)}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

// ----------------------------------------------------------------------

function Empty({ text }: { text: string }) {
  return (
    <Stack alignItems="center" sx={{ py: 4, color: 'text.disabled' }} spacing={1}>
      <Iconify icon="solar:inbox-line-duotone" width={40} />
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

function RowSkeleton() {
  return (
    <Stack spacing={2}>
      {[...Array(3)].map((_, i) => (
        <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ width: '60%' }}>
            <Skeleton width="50%" />
            <Skeleton width="30%" />
          </Box>
          <Skeleton width={80} />
        </Stack>
      ))}
    </Stack>
  );
}
