import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
// @mui
import {
  Box, Card, CardHeader, Container, Divider, Grid, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography,
} from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency, fNumber } from '../../utils/formatNumber';
// components
import Iconify from '../../components/iconify';
import AdminPageHeader from './AdminPageHeader';

// ApexChart cần window -> tắt SSR.
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

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
  const [overview, setOverview] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosInstance
      .get('/api/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setError(e?.detail || e?.message || 'Không tải được số liệu'));
    axiosInstance
      .get('/api/admin/stats/overview')
      .then((r) => setOverview(r.data))
      .catch(() => {});
  }, []);

  const series = overview?.revenue_series || [];
  const chartOptions: any = {
    chart: { toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    dataLabels: { enabled: false },
    xaxis: { categories: series.map((s: any) => s.date.slice(5)), labels: { rotate: -45 } },
    yaxis: { labels: { formatter: (v: number) => fNumber(v) } },
    tooltip: { y: { formatter: (v: number) => fCurrency(v) } },
    colors: ['#00AB55'],
  };

  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container sx={{ pb: 6 }}>
        <AdminPageHeader title="Tổng quan" />

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

        {/* Biểu đồ doanh thu 14 ngày */}
        {series.length > 0 && (
          <Card sx={{ mt: 3 }}>
            <CardHeader title="Doanh thu 14 ngày gần nhất" />
            <Box sx={{ p: 2 }}>
              <ReactApexChart
                type="area"
                series={[{ name: 'Doanh thu', data: series.map((s: any) => Math.round(s.revenue)) }]}
                options={chartOptions}
                height={300}
              />
            </Box>
          </Card>
        )}

        {/* Top sản phẩm + Top khách hàng */}
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Top sản phẩm (30 ngày)" />
              <Divider />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell align="right">SL</TableCell>
                    <TableCell align="right">Doanh thu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(overview?.top_products || []).map((p: any, i: number) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap>{p.name}</Typography></TableCell>
                      <TableCell align="right">{fNumber(p.qty)}</TableCell>
                      <TableCell align="right">{fCurrency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {(!overview?.top_products || overview.top_products.length === 0) && (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có dữ liệu</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Top khách hàng" />
              <Divider />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell align="right">Đơn</TableCell>
                    <TableCell align="right">Chi tiêu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(overview?.top_customers || []).map((c: any, i: number) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap>{c.email}</Typography></TableCell>
                      <TableCell align="right">{fNumber(c.orders)}</TableCell>
                      <TableCell align="right">{fCurrency(c.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {(!overview?.top_customers || overview.top_customers.length === 0) && (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có dữ liệu</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
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
