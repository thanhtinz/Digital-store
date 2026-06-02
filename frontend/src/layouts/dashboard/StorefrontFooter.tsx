import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';

// ----------------------------------------------------------------------
// Footer storefront (tái dựng theo store cũ): 3 cột + copyright.
// ----------------------------------------------------------------------

const EXPLORE_LINKS = [
  { label: 'Tất cả sản phẩm', href: PATH_DASHBOARD.eCommerce.list },
  { label: 'Gian hàng', href: PATH_DASHBOARD.eCommerce.shop },
  { label: 'Góc chia sẻ (Blog)', href: PATH_DASHBOARD.blog.posts },
];

const SUPPORT_LINKS = [
  { label: 'Liên hệ & Hỗ trợ', href: PATH_DASHBOARD.chat.root },
  { label: 'Tài khoản của tôi', href: PATH_DASHBOARD.user.account },
];

type Settings = {
  site_name?: string;
  site_description?: string;
  copyright_text?: string;
};

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <Stack spacing={1.5} sx={{ minWidth: 160 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      {links.map((l) => (
        <Link
          key={l.label}
          component={NextLink}
          href={l.href}
          variant="body2"
          color="inherit"
          underline="hover"
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          {l.label}
        </Link>
      ))}
    </Stack>
  );
}

export default function StorefrontFooter() {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/admin/settings/public')
      .then((res) => {
        if (alive) setSettings(res.data || {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const siteName = settings.site_name || 'Digital Store';
  const siteDesc =
    settings.site_description || 'Cửa hàng sản phẩm số — giao hàng tự động, thanh toán nhanh.';
  const copyright =
    settings.copyright_text || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;

  return (
    <Box component="footer" sx={{ mt: 10 }}>
      <Divider sx={{ borderStyle: 'dashed' }} />
      <Container sx={{ py: 6 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={5}
          justifyContent="space-between"
        >
          <Stack spacing={2} sx={{ maxWidth: 360 }}>
            <Typography variant="h6">{siteName}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {siteDesc}
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={5}>
            <FooterCol title="Khám phá" links={EXPLORE_LINKS} />
            <FooterCol title="Hỗ trợ khách hàng" links={SUPPORT_LINKS} />
          </Stack>
        </Stack>
      </Container>

      <Divider sx={{ borderStyle: 'dashed' }} />
      <Container sx={{ py: 3 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {copyright}
        </Typography>
      </Container>
    </Box>
  );
}
