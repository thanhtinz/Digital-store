import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Card, Container, Grid, Stack, Typography } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency, fNumber } from '../../utils/formatNumber';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------

type Stats = {
  total_orders: number;
  total_users: number;
  total_products: number;
  total_revenue: number;
  monthly_revenue: number;
};

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}.lighter`,
            color: `${color}.main`,
            flexShrink: 0,
          }}
        >
          <Iconify icon={icon} width={28} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" noWrap>
            {value}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {title}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

const QUICK_LINKS = [
  { label: 'Sản phẩm', icon: 'solar:box-bold-duotone', href: PATH_DASHBOARD.admin.products },
  { label: 'Danh mục', icon: 'solar:folder-bold-duotone', href: PATH_DASHBOARD.admin.categories },
  { label: 'Đơn hàng', icon: 'solar:cart-large-bold-duotone', href: PATH_DASHBOARD.admin.orders },
  { label: 'Người dùng', icon: 'solar:users-group-rounded-bold-duotone', href: PATH_DASHBOARD.admin.users },
  { label: 'Cài đặt cửa hàng', icon: 'solar:settings-bold-duotone', href: PATH_DASHBOARD.admin.settings },
];

export default function AdminOverviewView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosInstance
      .get('/api/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setError(e?.detail || e?.message || 'Không tải được số liệu'));
  }, []);

  return (
    <RoleBasedGuard hasContent roles={['admin', 'staff']}>
      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          Tổng quan quản trị
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Doanh thu tháng này"
              value={fCurrency(stats?.monthly_revenue || 0)}
              icon="solar:wallet-money-bold-duotone"
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Tổng doanh thu"
              value={fCurrency(stats?.total_revenue || 0)}
              icon="solar:dollar-minimalistic-bold-duotone"
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Tổng đơn hàng"
              value={fNumber(stats?.total_orders || 0)}
              icon="solar:cart-large-bold-duotone"
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Người dùng"
              value={fNumber(stats?.total_users || 0)}
              icon="solar:users-group-rounded-bold-duotone"
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Sản phẩm đang bán"
              value={fNumber(stats?.total_products || 0)}
              icon="solar:box-bold-duotone"
              color="secondary"
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 5, mb: 2 }}>
          Lối tắt
        </Typography>
        <Grid container spacing={2}>
          {QUICK_LINKS.map((q) => (
            <Grid item xs={12} sm={4} key={q.label}>
              <Card
                component={NextLink}
                href={q.href}
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  textDecoration: 'none',
                  color: 'text.primary',
                  transition: (t) => t.transitions.create('box-shadow'),
                  '&:hover': { boxShadow: (t) => t.customShadows.z16 },
                }}
              >
                <Iconify icon={q.icon} width={28} sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1">{q.label}</Typography>
                <Iconify icon="eva:arrow-ios-forward-fill" sx={{ ml: 'auto', color: 'text.disabled' }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </RoleBasedGuard>
  );
}
