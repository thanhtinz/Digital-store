import { useEffect, useState } from 'react';
// @mui
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// locales
import { useLocales } from '../../locales';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import EmptyContent from '../../components/empty-content';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

const statusColor = (s: string): any =>
  ({ paid: 'success', approved: 'success', pending: 'warning', rejected: 'error' }[s] || 'default');

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card sx={{ p: 2.5, textAlign: 'center', height: 1 }}>
      <Typography variant="h4" sx={{ color: color || 'text.primary' }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        {label}
      </Typography>
    </Card>
  );
}

export default function AffiliateView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`affiliate_page.${k}`)}`;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');

  const load = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    axiosInstance
      .get('/api/affiliate/me')
      .then((r) => setData(r.data))
      .catch((e) => enqueueSnackbar(e?.detail || 'Lỗi tải dữ liệu', { variant: 'error' }))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [isAuthenticated]);

  const register = async () => {
    setBusy(true);
    try {
      await axiosInstance.post('/api/affiliate/register');
      enqueueSnackbar(t('registered_ok'));
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Đăng ký thất bại', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    const val = Number(amount);
    if (!val || val <= 0) {
      enqueueSnackbar(t('invalid_amount'), { variant: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await axiosInstance.post('/api/balance/affiliate-withdraw', { amount: val });
      enqueueSnackbar(t('withdraw_sent'));
      setAmount('');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Rút thất bại', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const refLink =
    data?.ref_code && typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${data.ref_code}`
      : '';

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    enqueueSnackbar(t('copied'));
  };

  const available = data ? (data.total_earnings || 0) - (data.total_paid || 0) : 0;

  return (
    <Container sx={{ pt: { xs: 3, md: 5 }, pb: 8 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Iconify icon="solar:users-group-rounded-bold" width={28} sx={{ color: 'primary.main' }} />
        <Typography variant="h4">{t('title')}</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
        {t('subtitle')}
      </Typography>

      {!isAuthenticated ? (
        <EmptyContent title={t('login_required')} img="/assets/illustrations/illustration_empty_cart.svg" />
      ) : loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : !data?.registered ? (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Iconify icon="solar:hand-money-bold-duotone" width={64} sx={{ color: 'primary.main', mb: 2 }} />
          <Typography variant="h6">{t('not_registered')}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', my: 2, maxWidth: 460, mx: 'auto' }}>
            {t('not_registered_desc')}
          </Typography>
          <Button variant="contained" size="large" disabled={busy} onClick={register}>
            {t('register')}
          </Button>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Mã & link giới thiệu */}
          <Card sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('ref_code')}
                  value={data.ref_code}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('copy')}>
                          <IconButton onClick={() => copy(data.ref_code)}>
                            <Iconify icon="solar:copy-bold" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label={t('ref_link')}
                  value={refLink}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('copy')}>
                          <IconButton onClick={() => copy(refLink)}>
                            <Iconify icon="solar:copy-bold" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Thống kê */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <StatCard label={t('commission_rate')} value={`${data.commission_rate || 0}%`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard label={t('total_earnings')} value={fCurrency(data.total_earnings)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard label={t('available')} value={fCurrency(available)} color="#229A16" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard label={t('total_paid')} value={fCurrency(data.total_paid)} />
            </Grid>
          </Grid>

          {/* Rút hoa hồng */}
          <Card sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('withdraw')}
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                type="number"
                label={t('withdraw_amount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                sx={{ maxWidth: 260 }}
              />
              <Button variant="contained" disabled={busy} onClick={withdraw} startIcon={<Iconify icon="solar:wallet-money-bold" />}>
                {t('withdraw_btn')}
              </Button>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              {t('available')}: {fCurrency(available)}
            </Typography>
          </Card>

          {/* Lịch sử giới thiệu */}
          <Card>
            <CardHeader title={t('referrals')} />
            <CardContent sx={{ p: 0, mt: 2 }}>
              {data.referrals?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('date')}</TableCell>
                        <TableCell>{t('order')}</TableCell>
                        <TableCell align="right">{t('amount')}</TableCell>
                        <TableCell align="right">{t('commission')}</TableCell>
                        <TableCell align="center">{t('status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.referrals.map((r: any) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontSize: 13 }}>
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-'}
                          </TableCell>
                          <TableCell>#{r.order_id}</TableCell>
                          <TableCell align="right">{fCurrency(r.order_amount)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            +{fCurrency(r.commission)}
                          </TableCell>
                          <TableCell align="center">
                            <Label color={statusColor(r.status)} variant="soft">
                              {r.status}
                            </Label>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 4 }}>
                  <Typography align="center" sx={{ color: 'text.secondary' }}>
                    {t('no_referrals')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Container>
  );
}
