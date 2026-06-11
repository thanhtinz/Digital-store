import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
// @mui
import { Box, Card, Container, Grid, Stack, Typography, Divider } from '@mui/material';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Iconify from '../../components/iconify';
import RankBadge from '../../sections/storefront/RankBadge';

// ----------------------------------------------------------------------

RanksPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

export default function RanksPage() {
  const [ranks, setRanks] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);

  useEffect(() => {
    axiosInstance.get('/api/ranks').then((r) => setRanks(r.data?.items || [])).catch(() => {});
    axiosInstance.get('/api/ranks/me').then((r) => setCurrentId(r.data?.current?.id || null)).catch(() => {});
  }, []);

  return (
    <>
      <Head>
        <title> Cấp bậc thành viên | Digital Store</title>
      </Head>
      <Container sx={{ pb: 8 }}>
        <Typography variant="h4" sx={{ my: 3 }}>Cấp bậc thành viên</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Chi tiêu càng nhiều, hạng càng cao và mở khoá nhiều đặc quyền hấp dẫn.
        </Typography>

        <Grid container spacing={2}>
          {ranks.map((r) => {
            const perks: { icon: string; text: string }[] = [];
            if (r.discount_percent > 0) perks.push({ icon: 'solar:tag-price-bold', text: `Giảm ${r.discount_percent}% giá sản phẩm` });
            if (r.order_priority) perks.push({ icon: 'solar:bolt-bold', text: 'Đơn hàng được ưu tiên xử lý' });
            if (r.support_priority) perks.push({ icon: 'solar:headphones-round-bold', text: 'Ưu tiên hỗ trợ' });
            if (r.highlight_name) perks.push({ icon: 'solar:user-bold', text: 'Tên hiển thị nổi bật' });
            if (r.sparkle) perks.push({ icon: 'solar:star-bold', text: 'Huy hiệu lấp lánh' });
            const isCurrent = r.id === currentId;
            return (
              <Grid key={r.id} item xs={12} sm={6} md={4}>
                <Card sx={{ p: 3, height: 1, border: (t) => isCurrent ? `2px solid ${r.color || t.palette.primary.main}` : undefined }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <RankBadge rank={r} size="lg" />
                    {isCurrent && <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>Hạng của bạn</Typography>}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {r.requirement_type === 'manual'
                      ? 'Hạng đặc biệt (do quản trị trao)'
                      : r.requirement_type === 'points'
                      ? `Đạt ${r.threshold} điểm`
                      : `Chi tiêu ${fCurrency(r.threshold)}`}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    {perks.length === 0 && <Typography variant="body2" color="text.disabled">Hạng cơ bản</Typography>}
                    {perks.map((p, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <Iconify icon={p.icon} sx={{ color: r.color || 'primary.main', flexShrink: 0 }} />
                        <Typography variant="body2">{p.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {ranks.length === 0 && (
          <Card sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">Hệ thống chưa cấu hình cấp bậc.</Typography>
          </Card>
        )}
      </Container>
    </>
  );
}
