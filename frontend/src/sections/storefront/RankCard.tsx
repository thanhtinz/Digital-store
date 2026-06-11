import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Button, Card, LinearProgress, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Iconify from '../../components/iconify';
import RankBadge from './RankBadge';

// ----------------------------------------------------------------------

export default function RankCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axiosInstance.get('/api/ranks/me').then((r) => setData(r.data)).catch(() => {});
  }, []);

  // Ẩn nếu hệ thống chưa cấu hình hạng nào.
  if (!data || (!data.current && (!data.ranks || data.ranks.length === 0))) return null;

  const cur = data.current;
  const next = data.next;

  return (
    <Card sx={{ p: 3, mt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h6">Hạng thành viên</Typography>
        <Button size="small" component={NextLink} href={PATH_DASHBOARD.ranks} endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}>
          Đặc quyền
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        {cur ? <RankBadge rank={cur} size="lg" /> : <Typography color="text.secondary">Chưa xếp hạng</Typography>}
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">Tổng chi tiêu</Typography>
          <Typography variant="subtitle1">{fCurrency(data.total_spent || 0)}</Typography>
        </Box>
      </Stack>

      {cur && (cur.discount_percent > 0 || cur.order_priority || cur.support_priority) && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          {cur.discount_percent > 0 && <Perk icon="solar:tag-price-bold" text={`Giảm ${cur.discount_percent}% giá`} />}
          {cur.order_priority && <Perk icon="solar:bolt-bold" text="Ưu tiên đơn hàng" />}
          {cur.support_priority && <Perk icon="solar:headphones-round-bold" text="Ưu tiên hỗ trợ" />}
        </Stack>
      )}

      {next && (
        <Box sx={{ mt: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Lên hạng <b>{next.name}</b>
            </Typography>
            <Typography variant="caption" color="text.secondary">{next.progress || 0}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={next.progress || 0} sx={{ height: 8, borderRadius: 4 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {next.requirement_type === 'points'
              ? `Cần ${next.threshold} điểm`
              : `Cần chi tiêu ${fCurrency(next.threshold)}`}
          </Typography>
        </Box>
      )}
    </Card>
  );
}

function Perk({ icon, text }: { icon: string; text: string }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Iconify icon={icon} width={16} sx={{ color: 'primary.main' }} />
      <Typography variant="caption">{text}</Typography>
    </Stack>
  );
}
