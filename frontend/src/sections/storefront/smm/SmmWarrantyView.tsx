import { useEffect, useState } from 'react';
// @mui
import { Button, Card, Container, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../../utils/axios';
// components
import Label from '../../../components/label';
import { useSnackbar } from '../../../components/snackbar';

// ----------------------------------------------------------------------

type WarrantyItem = {
  order_id: number;
  order_code?: string;
  service_name?: string;
  refill_id?: string;
  refill_status?: string;
};

export default function SmmWarrantyView() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = () => {
    axiosInstance
      .get('/api/smm/warranty', { params: { limit: 100 } })
      .then((res) => setItems(res.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleRefill = async (orderId: number) => {
    try {
      await axiosInstance.post(`/api/smm/orders/${orderId}/refill`);
      enqueueSnackbar('Đã gửi yêu cầu bảo hành (refill)');
      fetchItems();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Không gửi được yêu cầu', { variant: 'error' });
    }
  };

  return (
    <Container sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Bảo hành
      </Typography>

      {loading ? (
        <Typography sx={{ color: 'text.secondary' }}>Đang tải…</Typography>
      ) : items.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
          Chưa có đơn nào cần bảo hành.
        </Card>
      ) : (
        <Stack spacing={2}>
          {items.map((it) => (
            <Card key={it.order_id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack>
                  <Typography variant="subtitle1">#{it.order_code || it.order_id}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {it.service_name}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {it.refill_status && (
                    <Label variant="soft" color="info">
                      {it.refill_status}
                    </Label>
                  )}
                  <Button size="small" variant="outlined" onClick={() => handleRefill(it.order_id)}>
                    Yêu cầu bảo hành
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
