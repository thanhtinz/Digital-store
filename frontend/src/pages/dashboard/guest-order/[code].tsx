import { useEffect, useRef, useState } from 'react';
// next
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Alert, Box, Card, Container, Divider, Stack, Typography, CircularProgress } from '@mui/material';
import AppLoader from '../../../components/app-loader';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// utils
import axios from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';

// ----------------------------------------------------------------------

GuestOrderPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function GuestOrderPage() {
  const { query } = useRouter();
  const code = (query.code as string) || '';
  const [pay, setPay] = useState<any>(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!code) return undefined;
    // Tạo link thanh toán (QR).
    axios
      .post('/api/payment/guest/create-link', { order_code: code })
      .then((r) => { setPay(r.data); setStatus(r.data?.status || 'pending'); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Poll trạng thái.
    timer.current = setInterval(() => {
      axios
        .get(`/api/payment/guest/status/${code}`)
        .then((r) => {
          setStatus(r.data?.status || 'pending');
          if (['completed', 'paid', 'cancelled', 'failed'].includes(r.data?.status)) {
            clearInterval(timer.current);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer.current);
  }, [code]);

  const done = status === 'completed' || status === 'paid';

  return (
    <>
      <Head>
        <title> Đơn hàng {code} | Digital Store</title>
      </Head>
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Thanh toán đơn hàng</Typography>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><AppLoader /></Box>
        ) : done ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" gutterBottom>✅ Thanh toán thành công</Typography>
            <Typography color="text.secondary">
              Sản phẩm đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư (cả mục spam).
            </Typography>
          </Card>
        ) : (
          <Card sx={{ p: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="subtitle1">Quét mã VietQR để thanh toán</Typography>
              {pay?.qrCodeUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pay.qrCodeUrl} alt="VietQR" style={{ width: 240, height: 240 }} />
              )}
              <Divider flexItem />
              <Stack spacing={1} sx={{ width: 1 }}>
                <Row label="Mã đơn" value={code} />
                <Row label="Số tiền" value={fCurrency(pay?.amount || 0)} />
                <Row label="Nội dung CK" value={pay?.transferContent || code} />
                <Row label="Số tài khoản" value={pay?.accountNumber || ''} />
              </Stack>
              <Alert severity="info" sx={{ width: 1 }}>
                Sau khi chuyển khoản, hệ thống tự xác nhận trong giây lát và gửi sản phẩm qua email.
              </Alert>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">Đang chờ thanh toán…</Typography>
              </Stack>
            </Stack>
          </Card>
        )}
      </Container>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all', textAlign: 'right', ml: 2 }}>{value}</Typography>
    </Stack>
  );
}
