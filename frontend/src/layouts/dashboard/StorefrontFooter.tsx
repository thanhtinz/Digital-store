import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Box, Container, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// locales
import { useLocales } from '../../locales';
// components
import Iconify from '../../components/iconify';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';

// ----------------------------------------------------------------------
// Footer storefront (tái dựng theo store cũ): 3 cột + copyright.
// ----------------------------------------------------------------------

type Settings = {
  site_name?: string;
  site_description?: string;
  footer_about?: string;
  copyright_text?: string;
  contact_email?: string;
  hotline?: string;
  facebook?: string;
  zalo?: string;
  youtube?: string;
  tiktok?: string;
  telegram?: string;
  instagram?: string;
};

const SOCIALS: { key: keyof Settings; icon: string }[] = [
  { key: 'facebook', icon: 'mdi:facebook' },
  { key: 'instagram', icon: 'mdi:instagram' },
  { key: 'youtube', icon: 'mdi:youtube' },
  { key: 'tiktok', icon: 'ic:baseline-tiktok' },
  { key: 'telegram', icon: 'mdi:telegram' },
  { key: 'zalo', icon: 'simple-icons:zalo' },
];

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
  const { translate } = useLocales();
  const tf = (k: string) => `${translate(`footer.${k}`)}`;
  const [settings, setSettings] = useState<Settings>({});

  const EXPLORE_LINKS = [
    { label: tf('shop'), href: PATH_DASHBOARD.eCommerce.shop },
    { label: tf('offers'), href: PATH_DASHBOARD.offers },
    { label: tf('blog'), href: PATH_DASHBOARD.blog.posts },
  ];
  const SUPPORT_LINKS = [
    { label: tf('support_center'), href: PATH_DASHBOARD.support },
    { label: tf('contact'), href: PATH_DASHBOARD.support },
    { label: tf('my_orders'), href: PATH_DASHBOARD.orders.root },
    { label: tf('my_account'), href: PATH_DASHBOARD.myAccount },
  ];

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
  const siteDesc = settings.footer_about || settings.site_description || tf('default_desc');
  const copyright =
    settings.copyright_text || `© ${new Date().getFullYear()} ${siteName}. ${tf('all_rights_reserved')}`;
  const socials = SOCIALS.filter((s) => settings[s.key]);

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
            {(settings.hotline || settings.contact_email) && (
              <Stack spacing={0.5}>
                {settings.hotline && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    <Iconify icon="solar:phone-bold" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {settings.hotline}
                  </Typography>
                )}
                {settings.contact_email && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    <Iconify icon="solar:letter-bold" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {settings.contact_email}
                  </Typography>
                )}
              </Stack>
            )}
            {socials.length > 0 && (
              <Stack direction="row" spacing={0.5}>
                {socials.map((s) => (
                  <IconButton
                    key={s.key}
                    component={Link}
                    href={String(settings[s.key])}
                    target="_blank"
                    rel="noopener"
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <Iconify icon={s.icon} />
                  </IconButton>
                ))}
              </Stack>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={5}>
            <FooterCol title={tf('explore')} links={EXPLORE_LINKS} />
            <FooterCol title={tf('support_col')} links={SUPPORT_LINKS} />
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
