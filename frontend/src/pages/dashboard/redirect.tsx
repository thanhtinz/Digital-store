import { useEffect, useMemo, useState } from 'react';
// next
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Alert, Box, Button, Card, Container, LinearProgress, Stack, Typography } from '@mui/material';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------

RedirectPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

const COUNTDOWN = 5;

export default function RedirectPage() {
  const { query, isReady, back } = useRouter();
  const rawUrl = (query.url as string) || '';
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [paused, setPaused] = useState(false);

  // Giải mã + kiểm tra URL hợp lệ (chỉ http/https).
  const parsed = useMemo(() => {
    if (!rawUrl) return null;
    try {
      const u = new URL(decodeURIComponent(rawUrl));
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u;
    } catch {
      return null;
    }
  }, [rawUrl]);

  useEffect(() => {
    if (!isReady || !parsed || paused) return undefined;
    if (seconds <= 0) {
      window.location.href = parsed.href;
      return undefined;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isReady, parsed, seconds, paused]);

  const go = () => parsed && (window.location.href = parsed.href);

  return (
    <>
      <Head>
        <title> Đang chuyển hướng... | Digital Store</title>
      </Head>
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
        <Card sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, mx: 'auto', mb: 2, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'warning.lighter', color: 'warning.main' }}>
            <Iconify icon="solar:link-bold-duotone" width={44} />
          </Box>

          <Typography variant="h4" gutterBottom>Bạn sắp rời khỏi website</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Bạn đang được chuyển đến một liên kết bên ngoài. Vui lòng kiểm tra địa chỉ trước khi tiếp tục.
          </Typography>

          {!parsed ? (
            <Alert severity="error" sx={{ textAlign: 'left' }}>
              Liên kết không hợp lệ hoặc thiếu thông tin.
            </Alert>
          ) : (
            <>
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral', textAlign: 'left', mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Tên miền đích</Typography>
                <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>{parsed.hostname}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', mt: 0.5 }}>
                  {parsed.href}
                </Typography>
              </Box>

              <Alert severity="warning" sx={{ textAlign: 'left', mb: 3 }}>
                Vì lý do an toàn, hãy cẩn trọng với các trang yêu cầu đăng nhập, thanh toán hoặc tải file lạ.
                Chúng tôi không chịu trách nhiệm về nội dung của trang bên ngoài.
              </Alert>

              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={((COUNTDOWN - seconds) / COUNTDOWN) * 100}
                  color="warning"
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {paused ? 'Đã tạm dừng đếm ngược' : `Tự động chuyển hướng sau ${seconds}s`}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button color="inherit" variant="outlined" onClick={() => back()} startIcon={<Iconify icon="eva:close-fill" />}>
                  Huỷ
                </Button>
                <Button color="inherit" onClick={() => setPaused((p) => !p)}>
                  {paused ? 'Tiếp tục' : 'Tạm dừng'}
                </Button>
                <Button variant="contained" color="warning" onClick={go} endIcon={<Iconify icon="eva:external-link-fill" />}>
                  Tới ngay
                </Button>
              </Stack>
            </>
          )}
        </Card>
      </Container>
    </>
  );
}
