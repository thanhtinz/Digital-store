// next
import NextLink from 'next/link';
// @mui
import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';

// ----------------------------------------------------------------------
// Tiêu đề + breadcrumb đồng nhất cho mọi trang quản trị. Responsive:
// trên mobile, nút hành động xuống hàng dưới, full chiều rộng.
// ----------------------------------------------------------------------

type Crumb = { name: string; href?: string };

type Props = {
  title: string;
  links?: Crumb[];
  action?: React.ReactNode;
};

export default function AdminPageHeader({ title, links = [], action }: Props) {
  const crumbs: Crumb[] = [{ name: 'Quản trị', href: PATH_DASHBOARD.admin.root }, ...links, { name: title }];

  return (
    <Box sx={{ mb: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" gutterBottom noWrap>
            {title}
          </Typography>
          <Breadcrumbs separator={<Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />}>
            {crumbs.map((c, i) =>
              c.href && i < crumbs.length - 1 ? (
                <Link key={i} component={NextLink} href={c.href} variant="body2" color="inherit" underline="hover">
                  {c.name}
                </Link>
              ) : (
                <Typography key={i} variant="body2" sx={{ color: 'text.disabled' }}>
                  {c.name}
                </Typography>
              )
            )}
          </Breadcrumbs>
        </Box>

        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
