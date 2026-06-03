import { useEffect, useRef, useState } from 'react';
// @mui
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
//
import { CardChargePanel } from './CardChargeView';

// ----------------------------------------------------------------------

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

type TopUp = {
  txn_id: number;
  reference: string;
  amount: number;
  transfer_content: string;
  account_number: string;
  bank_code: string;
  qr_code_url: string | null;
  status: string;
};

export default function TopUpView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`topup_page.${k}`)}`;

  const [method, setMethod] = useState<'bank' | 'card'>('bank');
  const [amount, setAmount] = useState(100000);
  const [creating, setCreating] = useState(false);
  const [topup, setTopup] = useState<TopUp | null>(null);
  const [status, setStatus] = useState<string>('pending');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dừng polling khi rời trang.
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  const handleCreate = async () => {
    if (!isAuthenticated) {
      enqueueSnackbar(t('login_required'), { variant: 'warning' });
      return;
    }
    if (amount < 10000) {
      enqueueSnackbar(t('min_warning'), { variant: 'warning' });
      return;
    }
    setCreating(true);
    try {
      const res = await axiosInstance.post('/api/balance/topup', { amount });
      setTopup(res.data);
      setStatus(res.data.status || 'pending');
      startPolling(res.data.txn_id);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || t('create_failed'), { variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Hỏi backend trạng thái nạp mỗi 4s; xong thì báo và dừng.
  const startPolling = (txnId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await axiosInstance.get(`/api/balance/topup/status/${txnId}`);
        const st = r.data?.status;
        setStatus(st);
        if (st && st !== 'pending') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (st === 'completed') enqueueSnackbar(t('success'));
          else enqueueSnackbar(t('create_failed'), { variant: 'error' });
        }
      } catch {
        /* bỏ qua lỗi mạng tạm thời */
      }
    }, 4000);
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    enqueueSnackbar(t('copied'));
  };

  const completed = status === 'completed';

  return (
    <Container sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        {t('title')}
      </Typography>

      {/* Chọn phương thức nạp */}
      <ToggleButtonGroup
        exclusive
        color="primary"
        value={method}
        onChange={(_, v) => v && setMethod(v)}
        sx={{ mb: 3, flexWrap: 'wrap' }}
      >
        <ToggleButton value="bank" sx={{ px: 2.5, gap: 1 }}>
          <Iconify icon="solar:card-transfer-bold" /> {t('method_bank')}
        </ToggleButton>
        <ToggleButton value="card" sx={{ px: 2.5, gap: 1 }}>
          <Iconify icon="solar:smartphone-bold" /> {t('method_card')}
        </ToggleButton>
      </ToggleButtonGroup>

      {method === 'card' ? (
        <CardChargePanel />
      ) : (
        <Grid container spacing={3}>
        {/* Nhập số tiền */}
        <Grid item xs={12} md={topup ? 6 : 12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {t('choose_amount')}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              {QUICK_AMOUNTS.map((v) => (
                <Button
                  key={v}
                  variant={amount === v ? 'contained' : 'outlined'}
                  onClick={() => setAmount(v)}
                  disabled={!!topup}
                >
                  {fCurrency(v)}
                </Button>
              ))}
            </Box>

            <TextField
              fullWidth
              type="number"
              label={t('other_amount')}
              value={amount}
              disabled={!!topup}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              helperText={t('min_note')}
            />

            {!topup ? (
              <Button
                fullWidth
                size="large"
                variant="contained"
                sx={{ mt: 2.5 }}
                disabled={creating || amount < 10000}
                onClick={handleCreate}
                startIcon={creating ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {t('create_code')}
              </Button>
            ) : (
              <Button
                fullWidth
                size="large"
                variant="outlined"
                color="inherit"
                sx={{ mt: 2.5 }}
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setTopup(null);
                  setStatus('pending');
                }}
              >
                {t('create_another')}
              </Button>
            )}
          </Card>
        </Grid>

        {/* QR + thông tin chuyển khoản */}
        {topup && (
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              {completed ? (
                <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
                  <Iconify icon="solar:check-circle-bold" width={72} sx={{ color: 'success.main' }} />
                  <Typography variant="h6">{t('success')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    +{fCurrency(topup.amount)} · {t('success_desc')}
                  </Typography>
                </Stack>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('scan_note')}
                  </Alert>

                  {topup.qr_code_url ? (
                    <Box
                      component="img"
                      src={topup.qr_code_url}
                      alt="QR nạp tiền"
                      sx={{ width: 240, maxWidth: '100%', mx: 'auto', display: 'block', mb: 2 }}
                    />
                  ) : (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {t('not_configured')}
                    </Alert>
                  )}

                  <Stack spacing={1.25}>
                    <Row label={t('bank')} value={topup.bank_code} onCopy={copy} />
                    <Row label={t('account_number')} value={topup.account_number} onCopy={copy} />
                    <Row label={t('amount')} value={String(topup.amount)} display={fCurrency(topup.amount)} onCopy={copy} />
                    <Row label={t('content')} value={topup.transfer_content} highlight onCopy={copy} />
                  </Stack>

                  <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      {t('waiting')}
                    </Typography>
                  </Stack>
                </>
              )}
            </Card>
          </Grid>
        )}
        </Grid>
      )}
    </Container>
  );
}

// ----------------------------------------------------------------------

function Row({
  label,
  value,
  display,
  highlight,
  onCopy,
}: {
  label: string;
  value: string;
  display?: string;
  highlight?: boolean;
  onCopy: (t: string) => void;
}) {
  if (!value) return null;
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="subtitle2" color={highlight ? 'error.main' : 'text.primary'}>
          {display || value}
        </Typography>
        <IconButton size="small" onClick={() => onCopy(value)}>
          <Iconify icon="solar:copy-bold" width={16} />
        </IconButton>
      </Stack>
    </Stack>
  );
}
