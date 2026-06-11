import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Button, Card, Container, LinearProgress, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Label from '../../components/label';

// ----------------------------------------------------------------------

export default function SubscriptionsView() {
  const { isAuthenticated } = useAuthContext();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    axiosInstance
      .get('/api/account/entitlements')
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <Container sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Gói đang sử dụng
      </Typography>

      {loading && <LinearProgress />}

      {!loading && items.length === 0 && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">Bạn chưa có gói có thời hạn nào.</Typography>
          <Button component={NextLink} href={PATH_DASHBOARD.eCommerce.shop} variant="contained" sx={{ mt: 2 }}>
            Mua sắm ngay
          </Button>
        </Card>
      )}

      <Stack spacing={2}>
        {items.map((it) => {
          const expired = it.status === 'expired' || it.days_left <= 0;
          const soon = !expired && it.days_left <= 7;
          return (
            <Card key={it.id} sx={{ p: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Box>
                  <Typography variant="subtitle1">{it.product_name}</Typography>
                  {it.package_name && (
                    <Typography variant="body2" color="text.secondary">{it.package_name}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Hết hạn: {new Date(it.expires_at).toLocaleDateString('vi-VN')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Label color={expired ? 'error' : soon ? 'warning' : 'success'}>
                    {expired ? 'Đã hết hạn' : `Còn ${it.days_left} ngày`}
                  </Label>
                  <Button
                    component={NextLink}
                    href={PATH_DASHBOARD.eCommerce.shop}
                    variant={expired || soon ? 'contained' : 'outlined'}
                    size="small"
                    color={expired ? 'error' : 'primary'}
                  >
                    Gia hạn
                  </Button>
                </Stack>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}
