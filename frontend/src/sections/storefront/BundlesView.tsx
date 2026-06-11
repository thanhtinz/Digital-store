import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Card, Container, Grid, Stack, Typography, Button, LinearProgress } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Image from '../../components/image';
import Label from '../../components/label';

// ----------------------------------------------------------------------

export default function BundlesView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance
      .get('/api/bundles')
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Gói combo tiết kiệm
      </Typography>

      {loading && <LinearProgress />}

      {!loading && items.length === 0 && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">Chưa có combo nào.</Typography>
        </Card>
      )}

      <Grid container spacing={3}>
        {items.map((b) => {
          const save = (b.original_price || b.items_total) - b.price;
          const pct = b.items_total > 0 ? Math.round((save / (b.original_price || b.items_total)) * 100) : 0;
          return (
            <Grid key={b.id} item xs={12} sm={6} md={4}>
              <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative' }}>
                  {pct > 0 && (
                    <Label color="error" sx={{ position: 'absolute', top: 12, right: 12, zIndex: 9 }}>
                      -{pct}%
                    </Label>
                  )}
                  <Image
                    alt={b.name}
                    src={b.image_url || b.items?.[0]?.image_url || '/assets/placeholder.svg'}
                    ratio="16/9"
                  />
                </Box>
                <Stack spacing={1} sx={{ p: 2.5, flexGrow: 1 }}>
                  <Typography variant="subtitle1" noWrap>{b.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.items?.length || 0} sản phẩm trong combo
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h6" color="error.main">{fCurrency(b.price)}</Typography>
                    {save > 0 && (
                      <Typography variant="body2" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                        {fCurrency(b.original_price || b.items_total)}
                      </Typography>
                    )}
                  </Stack>
                  <Button
                    component={NextLink}
                    href={PATH_DASHBOARD.bundle(b.slug)}
                    variant="contained"
                    fullWidth
                  >
                    Xem combo
                  </Button>
                </Stack>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}
