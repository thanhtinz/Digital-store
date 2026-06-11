import { useEffect, useState } from 'react';
// @mui
import { Box, Card, Stack, Tooltip, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------

export default function BadgesCard() {
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axiosInstance
      .get('/api/badges/me')
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Ẩn thẻ khi chưa có huy hiệu nào (tránh chiếm chỗ trống).
  if (loaded && items.length === 0) return null;

  return (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Huy hiệu của bạn</Typography>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        {items.map((b) => (
          <Tooltip key={b.id} title={b.description || b.name}>
            <Stack alignItems="center" spacing={0.5} sx={{ width: 72 }}>
              <Box
                sx={{
                  width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  bgcolor: b.color || 'primary.main', color: '#fff',
                }}
              >
                {b.icon && b.icon.includes(':') ? (
                  <Iconify icon={b.icon} width={28} />
                ) : (
                  <Typography sx={{ fontSize: 24 }}>{b.icon || '🏅'}</Typography>
                )}
              </Box>
              <Typography variant="caption" align="center" noWrap sx={{ maxWidth: 72 }}>{b.name}</Typography>
            </Stack>
          </Tooltip>
        ))}
      </Stack>
    </Card>
  );
}
