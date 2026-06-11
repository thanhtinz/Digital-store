import { useEffect, useMemo, useState } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AppLoader from '../../components/app-loader';
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

export default function AffiliateView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`affiliate_page.${k}`)}`;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [openRedeem, setOpenRedeem] = useState(false);

  // Bộ lọc lịch sử giao dịch
  const [fDesc, setFDesc] = useState('');
  const [fMin, setFMin] = useState('');
  const [fMax, setFMax] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const load = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    axiosInstance
      .get('/api/affiliate/me')
      .then((r) => setData(r.data))
      .catch((e) => enqueueSnackbar(e?.detail || t('load_failed'), { variant: 'error' }))
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
      enqueueSnackbar(e?.detail || t('register_failed'), { variant: 'error' });
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
      setOpenRedeem(false);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || t('withdraw_failed'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Hai dạng link giới thiệu: theo mã (dễ nhớ) và theo ID (số).
  const refLinkCode = data?.ref_code ? `${origin}/?ref=${data.ref_code}` : '';
  const refLinkId = data?.id ? `${origin}/?aff=${data.id}` : '';

  const copy = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    enqueueSnackbar(t('copied'));
  };

  const referrals: any[] = data?.referrals || [];
  const available = data ? (data.total_earnings || 0) - (data.total_paid || 0) : 0;

  // Lọc lịch sử ở client theo mô tả / khoảng tiền / khoảng ngày.
  const filtered = useMemo(() => {
    const min = fMin ? Number(fMin) : null;
    const max = fMax ? Number(fMax) : null;
    const from = fFrom ? new Date(fFrom).getTime() : null;
    const to = fTo ? new Date(fTo).getTime() + 86400000 : null;
    return referrals.filter((r) => {
      const desc = `#${r.order_id}`;
      if (fDesc && !desc.toLowerCase().includes(fDesc.toLowerCase())) return false;
      const amt = Number(r.commission) || 0;
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      const ts = r.created_at ? new Date(r.created_at).getTime() : 0;
      if (from != null && ts < from) return false;
      if (to != null && ts >= to) return false;
      return true;
    });
  }, [referrals, fDesc, fMin, fMax, fFrom, fTo]);

  return (
    <Container sx={{ pt: { xs: 3, md: 5 }, pb: 8 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('title')}
      </Typography>

      {!isAuthenticated ? (
        <EmptyContent title={t('login_required')} img="/assets/illustrations/illustration_empty_cart.svg" />
      ) : loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <AppLoader />
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
          {/* ── Thông tin chương trình + link giới thiệu ── */}
          <Card sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography variant="h6">{t('info_title')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              {t('info_desc_1')}{' '}
              <Box component="strong" sx={{ color: 'text.primary' }}>
                {data.commission_rate || 0}%
              </Box>{' '}
              {t('info_desc_2')}
            </Typography>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <RefLinkField label={`${t('ref_link')} 1`} value={refLinkCode} onCopy={copy} t={t} />
              </Grid>
              {refLinkId && (
                <Grid item xs={12} md={6}>
                  <RefLinkField label={`${t('ref_link')} 2`} value={refLinkId} onCopy={copy} t={t} />
                </Grid>
              )}
            </Grid>
          </Card>

          {/* ── Quy đổi ── */}
          <Card sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('redeem_title')}
            </Typography>

            <Grid container spacing={2} alignItems="stretch">
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    height: 1,
                    borderRadius: 2,
                    color: 'common.white',
                    background: (theme) =>
                      `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  }}
                >
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {t('total_received')}
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 0.5 }}>
                    {fCurrency(data.total_earnings)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6} md={2.5}>
                <StatBox label={t('total_referrals')} value={`${referrals.length} ${t('people')}`} />
              </Grid>
              <Grid item xs={6} md={2.5}>
                <StatBox label={t('remaining')} value={fCurrency(available)} highlight />
              </Grid>

              <Grid item xs={12} md={3}>
                <Stack justifyContent="center" sx={{ height: 1 }}>
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    color="success"
                    disabled={available <= 0}
                    onClick={() => setOpenRedeem(true)}
                    startIcon={<Iconify icon="solar:wallet-money-bold" />}
                  >
                    {t('redeem_btn')}
                  </Button>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center' }}>
                    {t('total_paid')}: {fCurrency(data.total_paid)}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Card>

          {/* ── Lịch sử giao dịch ── */}
          <Card>
            <CardHeader title={t('tx_history')} />
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                sx={{ mb: 2 }}
                alignItems={{ md: 'center' }}
              >
                <TextField size="small" label={t('f_desc')} value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
                <TextField size="small" type="number" label={t('f_amount_from')} value={fMin} onChange={(e) => setFMin(e.target.value)} />
                <TextField size="small" type="number" label={t('f_amount_to')} value={fMax} onChange={(e) => setFMax(e.target.value)} />
                <TextField size="small" type="date" label={t('f_from_date')} InputLabelProps={{ shrink: true }} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
                <TextField size="small" type="date" label={t('f_to_date')} InputLabelProps={{ shrink: true }} value={fTo} onChange={(e) => setFTo(e.target.value)} />
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    setFDesc('');
                    setFMin('');
                    setFMax('');
                    setFFrom('');
                    setFTo('');
                  }}
                  startIcon={<Iconify icon="eva:refresh-fill" />}
                >
                  {t('f_reset')}
                </Button>
              </Stack>

              {filtered.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('col_time')}</TableCell>
                        <TableCell>{t('col_desc')}</TableCell>
                        <TableCell align="right">{t('col_amount')}</TableCell>
                        <TableCell align="center">{t('status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((r: any) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                            {r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '-'}
                          </TableCell>
                          <TableCell>
                            {t('commission_for_order')} #{r.order_id}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
            </Box>
          </Card>
        </Stack>
      )}

      {/* Dialog Quy đổi */}
      <Dialog open={openRedeem} onClose={() => setOpenRedeem(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('redeem_title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('remaining')}: <strong>{fCurrency(available)}</strong>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={t('withdraw_amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment> }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOpenRedeem(false)}>
            {t('cancel')}
          </Button>
          <Button variant="contained" color="success" disabled={busy} onClick={withdraw}>
            {t('redeem_btn')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// ----------------------------------------------------------------------

function RefLinkField({
  label,
  value,
  onCopy,
  t,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={t('copy')}>
              <IconButton onClick={() => onCopy(value)} edge="end">
                <Iconify icon="solar:copy-bold" />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Box
      sx={{
        p: 2,
        height: 1,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        bgcolor: (theme) =>
          highlight ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
      }}
    >
      <Typography variant="h5" sx={{ color: highlight ? 'success.dark' : 'text.primary' }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Box>
  );
}
