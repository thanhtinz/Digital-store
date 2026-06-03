// next
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Card, Container, Stack, Typography } from '@mui/material';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// components
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------

SmmPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

const TITLES: Record<string, string> = {
  order: 'Đặt đơn dịch vụ',
  services: 'Danh sách dịch vụ',
  orders: 'Đơn hàng dịch vụ',
  warranty: 'Bảo hành',
};

export default function SmmPage() {
  const { query } = useRouter();
  const sub = (Array.isArray(query.params) ? query.params[0] : '') || '';
  const title = TITLES[sub] || 'Dịch vụ mạng xã hội';

  return (
    <>
      <Head>
        <title> {title} | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          {title}
        </Typography>
        <Card sx={{ p: 6 }}>
          <Stack spacing={1.5} alignItems="center" sx={{ color: 'text.secondary' }}>
            <Iconify icon="solar:rocket-bold-duotone" width={56} />
            <Typography variant="h6">Tính năng đang được hoàn thiện</Typography>
            <Typography variant="body2" textAlign="center">
              Dịch vụ tăng tương tác mạng xã hội (SMM) sẽ sớm có mặt tại đây.
            </Typography>
          </Stack>
        </Card>
      </Container>
    </>
  );
}
