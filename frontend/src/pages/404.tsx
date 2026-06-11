import { m } from 'framer-motion';
// next
import Head from 'next/head';
import NextLink from 'next/link';
// @mui
import { Box, Button, Typography } from '@mui/material';
// hooks
import useSiteSettings from '../hooks/useSiteSettings';
// locales
import { useLocales } from '../locales';
// layouts
import CompactLayout from '../layouts/compact';
// components
import { MotionContainer, varBounce } from '../components/animate';
// assets
import { PageNotFoundIllustration } from '../assets/illustrations';

// ----------------------------------------------------------------------

Page404.getLayout = (page: React.ReactElement) => <CompactLayout>{page}</CompactLayout>;

// ----------------------------------------------------------------------

export default function Page404() {
  const settings = useSiteSettings();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`notfound_page.${k}`)}`;

  // Ưu tiên nội dung admin tuỳ chỉnh, nếu trống dùng bản dịch.
  const title = settings?.notfound_title || t('title');
  const message = settings?.notfound_message || t('message');
  const image = settings?.notfound_image;

  return (
    <>
      <Head>
        <title> 404 | {settings?.site_name || 'Digital Store'}</title>
      </Head>

      <MotionContainer>
        <m.div variants={varBounce().in}>
          <Typography variant="h3" paragraph>
            {title}
          </Typography>
        </m.div>

        <m.div variants={varBounce().in}>
          <Typography sx={{ color: 'text.secondary' }}>{message}</Typography>
        </m.div>

        <m.div variants={varBounce().in}>
          {image ? (
            <Box
              component="img"
              src={image}
              alt="404"
              sx={{ height: 260, mx: 'auto', my: { xs: 5, sm: 10 }, objectFit: 'contain' }}
            />
          ) : (
            <PageNotFoundIllustration sx={{ height: 260, my: { xs: 5, sm: 10 } }} />
          )}
        </m.div>

        <Button component={NextLink} href="/" size="large" variant="contained">
          {t('button')}
        </Button>
      </MotionContainer>
    </>
  );
}
