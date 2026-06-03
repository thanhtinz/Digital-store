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
// locales
import { useLocales } from '../../locales';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------

SupportPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function SupportPage() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`support_page.${k}`)}`;

  const FAQS = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
  ];

  return (
    <>
      <Head>
        <title> Hỗ trợ | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          {t('title')}
        </Typography>

        <Card sx={{ p: 3, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <Typography variant="h6">{t('direct_title')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('direct_desc')}
              </Typography>
            </Stack>
            <Button
              component={NextLink}
              href={PATH_DASHBOARD.chat.root}
              variant="contained"
              startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
            >
              {t('contact_btn')}
            </Button>
          </Stack>
        </Card>

        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('faq')}
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
