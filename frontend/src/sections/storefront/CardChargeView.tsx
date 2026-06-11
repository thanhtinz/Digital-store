import { useEffect, useState } from 'react';
// @mui
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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

const statusColor = (s: string): any => {
  if (['success', 'completed', 'approved'].includes(s)) return 'success';
  if (['failed', 'rejected', 'error'].includes(s)) return 'error';
  return 'warning';
};

// ----------------------------------------------------------------------
// Panel nạp thẻ — nhúng dưới dạng tab trong trang Nạp tiền.

export function CardChargePanel() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`card_charge_page.${k}`)}`;

  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [telco, setTelco] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [code, setCode] = useState('');
  const [serial, setSerial] = useState('');

  const loadHistory = () => {
    if (!isAuthenticated) return;
    axiosInstance
      .get('/api/card-charge/history')
      .then((r) => setHistory(r.data?.items || []))
      .catch(() => {});
  };

  useEffect(() => {
    axiosInstance
      .get('/api/card-charge/rates')
      .then((r) => {
        setRates(r.data);
        if (r.data?.telcos?.length) setTelco(r.data.telcos[0]);
        if (r.data?.amounts?.length) setAmount(r.data.amounts[0]);
      })
      .catch(() => setRates({ available: false }))
      .finally(() => setLoading(false));
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Chiết khấu theo telco+mệnh giá nếu có, ngược lại dùng discount_rate chung.
  const discountRate =
    rates?.rates?.[telco]?.[String(amount)] ?? rates?.discount_rate ?? 0;
  const estReceive = Math.round(amount * (1 - Number(discountRate) / 100));

  const submit = async () => {
    if (!code.trim() || !serial.trim()) {
      enqueueSnackbar(t('input_required'), { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.post('/api/card-charge/submit', { telco, code: code.trim(), serial: serial.trim(), amount });
      enqueueSnackbar(t('success'));
      setCode('');
      setSerial('');
      loadHistory();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || t('submit_failed'), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const enabled = rates?.available && rates?.exchange_enabled;

  return (
    <>
      {!isAuthenticated ? (
        <EmptyContent title={t('login_required')} img="/assets/illustrations/illustration_empty_cart.svg" />
      ) : loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <AppLoader />
        </Stack>
      ) : !enabled ? (
        <Alert severity="info">{t('unavailable')}</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card>
              <CardHeader title={t('title')} />
              <CardContent>
                <Stack spacing={2.5}>
                  <TextField select label={t('telco')} value={telco} onChange={(e) => setTelco(e.target.value)}>
                    {(rates.telcos || []).map((x: string) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select label={t('amount')} value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
                    {(rates.amounts || []).map((x: number) => (
                      <MenuItem key={x} value={x}>
                        {fCurrency(x)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField label={t('serial')} value={serial} onChange={(e) => setSerial(e.target.value)} />
                  <TextField label={t('code')} value={code} onChange={(e) => setCode(e.target.value)} />

                  <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {t('est_receive')}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: 'success.main' }}>
                      {fCurrency(estReceive)}
                    </Typography>
                  </Stack>

                  <Button
                    size="large"
                    variant="contained"
                    disabled={submitting}
                    onClick={submit}
                    startIcon={<Iconify icon="solar:card-send-bold" />}
                  >
                    {submitting ? t('submitting') : t('submit')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardHeader title={t('history')} />
              <CardContent sx={{ p: 0 }}>
                {history.length ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('created')}</TableCell>
                          <TableCell>{t('telco')}</TableCell>
                          <TableCell align="right">{t('declared')}</TableCell>
                          <TableCell align="right">{t('credited')}</TableCell>
                          <TableCell align="center">{t('status')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map((h) => (
                          <TableRow key={h.id} hover>
                            <TableCell sx={{ fontSize: 13 }}>
                              {h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : '-'}
                            </TableCell>
                            <TableCell>{h.telco}</TableCell>
                            <TableCell align="right">{fCurrency(h.declared_amount)}</TableCell>
                            <TableCell align="right">{h.credited_amount ? fCurrency(h.credited_amount) : '-'}</TableCell>
                            <TableCell align="center">
                              <Label color={statusColor(h.status)} variant="soft">
                                {h.status}
                              </Label>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('no_history')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </>
  );
}
