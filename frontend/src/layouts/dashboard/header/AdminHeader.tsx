// @mui
import { useTheme } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar, IconButton, Typography, Tooltip } from '@mui/material';
// utils
import { bgBlur } from '../../../utils/cssStyles';
// hooks
import useOffSetTop from '../../../hooks/useOffSetTop';
import useResponsive from '../../../hooks/useResponsive';
// config
import { HEADER, NAV } from '../../../config-global';
// components
import Iconify from '../../../components/iconify';
//
import AccountPopover from './AccountPopover';
import NotificationsPopover from './NotificationsPopover';

// ----------------------------------------------------------------------
// Header RIÊNG cho khu quản trị — gọn, không có giỏ hàng/ngôn ngữ như header
// cửa hàng. Gồm: nút mở nav (mobile), toàn màn hình, về cửa hàng, chuông, tài khoản.
// ----------------------------------------------------------------------

type Props = {
  onOpenNav?: VoidFunction;
};

function FullscreenButton() {
  const toggle = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  return (
    <Tooltip title="Toàn màn hình">
      <IconButton onClick={toggle} sx={{ color: 'text.secondary' }}>
        <Iconify icon="solar:maximize-square-3-bold-duotone" />
      </IconButton>
    </Tooltip>
  );
}

export default function AdminHeader({ onOpenNav }: Props) {
  const theme = useTheme();
  const isDesktop = useResponsive('up', 'lg');
  const isOffset = useOffSetTop(HEADER.H_DASHBOARD_DESKTOP);

  return (
    <AppBar
      sx={{
        boxShadow: 'none',
        height: HEADER.H_MOBILE,
        zIndex: theme.zIndex.appBar + 1,
        ...bgBlur({ color: theme.palette.background.default }),
        transition: theme.transitions.create(['height'], { duration: theme.transitions.duration.shorter }),
        ...(isDesktop && {
          width: `calc(100% - ${NAV.W_DASHBOARD + 1}px)`,
          height: HEADER.H_DASHBOARD_DESKTOP,
          ...(isOffset && { height: HEADER.H_DASHBOARD_DESKTOP_OFFSET }),
        }),
      }}
    >
      <Toolbar sx={{ height: 1, px: { lg: 5 } }}>
        {!isDesktop && (
          <IconButton onClick={onOpenNav} sx={{ mr: 1, color: 'text.primary' }}>
            <Iconify icon="eva:menu-2-fill" />
          </IconButton>
        )}

        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:widget-5-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Bảng quản trị
          </Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" alignItems="center" flexShrink={0} spacing={{ xs: 0.5, sm: 1 }}>
          <Tooltip title="Về cửa hàng">
            <IconButton href="/" sx={{ color: 'text.secondary' }}>
              <Iconify icon="solar:shop-2-bold-duotone" />
            </IconButton>
          </Tooltip>
          {isDesktop && <FullscreenButton />}
          <NotificationsPopover />
          <AccountPopover />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
