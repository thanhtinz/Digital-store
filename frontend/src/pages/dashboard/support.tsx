// next
import Head from 'next/head';
import NextLink from 'next/link';
// @mui
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  Container,
  Stack,
  Typography,
} from '@mui/material';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------

SupportPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

const FAQS = [
  {
    q: 'Sau khi thanh toán bao lâu nhận được hàng?',
    a: 'Các sản phẩm giao tự động sẽ được gửi ngay sau khi thanh toán thành công. Bạn có thể xem thông tin đã giao trong chi tiết đơn hàng.',
  },
  {
    q: 'Tôi thanh toán bằng cách nào?',
    a: 'Bạn có thể thanh toán bằng số dư tài khoản hoặc chuyển khoản/QR. Nạp tiền vào số dư ở trang Tài khoản.',
  },
  {
    q: 'Sản phẩm bị lỗi thì xử lý thế nào?',
    a: 'Vào chi tiết đơn hàng, dùng nút báo lỗi ở mục thông tin đã giao, hoặc liên hệ hỗ trợ trực tiếp. Chúng tôi sẽ kiểm tra và bảo hành theo chính sách.',
  },
  {
    q: 'Tôi có được hoàn tiền không?',
    a: 'Đơn chưa giao có thể được hủy và hoàn vào số dư. Đơn đã giao được xử lý theo chính sách bảo hành của từng sản phẩm.',
  },
];

export default function SupportPage() {
  return (
    <>
      <Head>
        <title> Hỗ trợ | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          Trung tâm hỗ trợ
        </Typography>

        <Card sx={{ p: 3, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <Typography variant="h6">Cần hỗ trợ trực tiếp?</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Chat với nhân viên hỗ trợ để được giải đáp nhanh nhất.
              </Typography>
            </Stack>
            <Button
              component={NextLink}
              href={PATH_DASHBOARD.chat.root}
              variant="contained"
              startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
            >
              Liên hệ hỗ trợ
            </Button>
          </Stack>
        </Card>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Câu hỏi thường gặp
        </Typography>
        {FAQS.map((item, i) => (
          <Accordion key={i}>
            <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
              <Typography variant="subtitle1">{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: 'text.secondary' }}>{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </>
  );
}
