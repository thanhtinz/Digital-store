import { useEffect, useState } from 'react';
// @mui
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Cấu hình giá riêng theo cấp bậc cho một gói sản phẩm.
// Hiển thị trong dialog sửa gói (cần packageId đã tồn tại).
// ----------------------------------------------------------------------

export default function RankPriceEditor({ packageId, basePrice }: { packageId: number; basePrice?: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const [ranks, setRanks] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<number, { price_type: string; discount_percent: string; fixed_price: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/api/admin/ranks').then((r) => setRanks(r.data?.items || [])).catch(() => {});
    axiosInstance.get(`/api/admin/packages/${packageId}/rank-prices`).then((r) => {
      const map: any = {};
      (r.data?.items || []).forEach((it: any) => {
        map[it.rank_id] = {
          price_type: it.price_type || 'percent',
          discount_percent: it.discount_percent ?? '',
          fixed_price: it.fixed_price ?? '',
        };
      });
      setRows(map);
    }).catch(() => {});
  }, [packageId]);

  const setRow = (rankId: number, patch: any) =>
    setRows((p) => {
      const cur = p[rankId] || { price_type: 'percent', discount_percent: '', fixed_price: '' };
      return { ...p, [rankId]: { ...cur, ...patch } };
    });

  const save = async () => {
    setSaving(true);
    try {
      const items = Object.entries(rows)
        .filter(([, v]) => (v.price_type === 'fixed' ? v.fixed_price !== '' : v.discount_percent !== ''))
        .map(([rankId, v]) => ({
          rank_id: Number(rankId),
          price_type: v.price_type,
          discount_percent: v.price_type === 'percent' ? Number(v.discount_percent) : null,
          fixed_price: v.price_type === 'fixed' ? Number(v.fixed_price) : null,
        }));
      await axiosInstance.put(`/api/admin/packages/${packageId}/rank-prices`, { items });
      enqueueSnackbar('Đã lưu giá theo hạng');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!ranks.length) return null;

  return (
    <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Giá theo cấp bậc</Typography>
      <Stack spacing={1.5}>
        {ranks.map((rk) => {
          const row = rows[rk.id] || { price_type: 'percent', discount_percent: '', fixed_price: '' };
          return (
            <Stack key={rk.id} direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ width: 110, flexShrink: 0 }} noWrap>{rk.name}</Typography>
              <TextField select size="small" sx={{ width: 120 }} value={row.price_type} onChange={(e) => setRow(rk.id, { price_type: e.target.value })}>
                <MenuItem value="percent">Giảm %</MenuItem>
                <MenuItem value="fixed">Giá cố định</MenuItem>
              </TextField>
              {row.price_type === 'fixed' ? (
                <TextField size="small" type="number" placeholder="Giá (đ)" fullWidth value={row.fixed_price} onChange={(e) => setRow(rk.id, { fixed_price: e.target.value })} />
              ) : (
                <TextField size="small" type="number" placeholder="% giảm" fullWidth value={row.discount_percent} onChange={(e) => setRow(rk.id, { discount_percent: e.target.value })} />
              )}
            </Stack>
          );
        })}
      </Stack>
      <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={save} disabled={saving}>
        Lưu giá theo hạng
      </Button>
    </Box>
  );
}
