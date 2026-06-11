import { useCallback, useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AppLoader from '../../components/app-loader';
// utils
import axiosInstance from '../../utils/axios';
// components
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

type DownloadItem = {
  license_id: number;
  license_key: string;
  product: { id: number; name: string; slug: string; imageUrl?: string };
  latest_version: string | null;
  file_size: string | null;
  remaining_downloads: number;
  can_download: boolean;
};

export default function MyDownloadsView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [manualKey, setManualKey] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get('/api/me/downloads')
      .then((r) => setItems(r.data?.items || []))
      .catch((e) => enqueueSnackbar(e?.detail || 'Không tải được danh sách', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [enqueueSnackbar]);

  useEffect(() => load(), [load]);

  const redeem = async (licenseKey: string) => {
    setBusy(licenseKey);
    try {
      const r = await axiosInstance.post('/api/source/redeem', { license_key: licenseKey });
      // Mở link tải (dùng-một-lần, có hạn).
      if (r.data?.download_url) window.open(r.data.download_url, '_blank');
      enqueueSnackbar('Đã tạo link tải — đang mở…');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.response?.data?.detail || 'Không tạo được link', { variant: 'error' });
    } finally {
      setBusy('');
    }
  };

  const copyKey = (k: string) => {
    navigator.clipboard?.writeText(k).then(
      () => enqueueSnackbar('Đã copy license key'),
      () => {}
    );
  };

  return (
    <Container sx={{ pb: 8 }} maxWidth="md">
      <Typography variant="h4" sx={{ my: 3 }}>
        Tải xuống của tôi
      </Typography>

      {/* Nhập license key thủ công */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Có license key? Nhập để lấy link tải
        </Typography>
        <Stack direction="row" spacing={1} alignItems="stretch">
          <TextField
            size="small"
            fullWidth
            placeholder="VD: A1B2-C3D4-E5F6-7G8H"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={!manualKey.trim() || busy === manualKey.trim()}
            onClick={() => redeem(manualKey.trim())}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap', px: 2.5 }}
          >
            Lấy link
          </Button>
        </Stack>
      </Card>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <AppLoader />
        </Stack>
      ) : items.length ? (
        <Stack spacing={2}>
          {items.map((it) => (
            <Card key={it.license_id} sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Image
                  src={it.product.imageUrl || ''}
                  sx={{ width: 64, height: 64, borderRadius: 1.5, flexShrink: 0, bgcolor: 'background.neutral' }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Link component={NextLink} href={`/dashboard/e-commerce/product/${it.product.slug}`} color="inherit">
                    <Typography variant="subtitle1" noWrap>
                      {it.product.name}
                    </Typography>
                  </Link>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                    {it.latest_version && <Chip size="small" variant="soft" label={`v${it.latest_version}`} />}
                    {it.file_size && (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {it.file_size}
                      </Typography>
                    )}
                    <Chip
                      size="small"
                      variant="soft"
                      color={it.remaining_downloads > 0 ? 'success' : 'default'}
                      label={`Còn ${it.remaining_downloads} lượt tải`}
                    />
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Key: <code>{it.license_key}</code>
                    </Typography>
                    <Iconify
                      icon="solar:copy-bold"
                      width={14}
                      sx={{ cursor: 'pointer', color: 'text.disabled' }}
                      onClick={() => copyKey(it.license_key)}
                    />
                  </Stack>
                </Box>
                <Stack spacing={0.5} sx={{ flexShrink: 0 }}>
                  {it.can_download ? (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={busy === it.license_key}
                      startIcon={<Iconify icon="solar:download-bold" />}
                      onClick={() => redeem(it.license_key)}
                    >
                      Tải xuống
                    </Button>
                  ) : (
                    <Button size="small" color="warning" href="/dashboard/support" startIcon={<Iconify icon="solar:ticket-bold" />}>
                      Hết lượt — tạo ticket
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Iconify icon="solar:download-square-bold-duotone" width={56} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6">Chưa có mã nguồn nào</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Mua mã nguồn/theme để nhận license và tải về tại đây.
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Button component={NextLink} href="/dashboard/e-commerce/shop" variant="contained">
            Khám phá mã nguồn
          </Button>
        </Card>
      )}
    </Container>
  );
}
