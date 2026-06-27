// @mui
import { useTheme } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar } from '@mui/material';
// utils
import { bgBlur } from '../../../utils/cssStyles';
// hooks
import useOffSetTop from '../../../hooks/useOffSetTop';
import useResponsive from '../../../hooks/useResponsive';
// config
import { HEADER, NAV } from '../../../config-global';
// components
import Logo from '../../../components/logo';
import { useSettingsContext } from '../../../components/settings';
//
import ProductSearchbar from './ProductSearchbar';
import CartButton from './CartButton';
import AccountPopover from './AccountPopover';
import LanguagePopover from './LanguagePopover';
import NotificationsPopover from './NotificationsPopover';

// ----------------------------------------------------------------------

type Props = {
  onOpenNav?: VoidFunction;
};

export default function Header({ onOpenNav }: Props) {
  const theme = useTheme();

  const { themeLayout } = useSettingsContext();

  const isNavHorizontal = themeLayout === 'horizontal';

  const isNavMini = themeLayout === 'mini';

  const isDesktop = useResponsive('up', 'lg');

  const isOffset = useOffSetTop(HEADER.H_DASHBOARD_DESKTOP) && !isNavHorizontal;

  const renderContent = (
    <>
      {isDesktop && isNavHorizontal && <Logo sx={{ mr: 2.5 }} />}

      {/* Logo gọn cho mobile (menu đã chuyển xuống thanh dưới đáy). */}
      {!isDesktop && <Logo sx={{ mr: 1.5, flexShrink: 0 }} />}

      <Box sx={{ flexGrow: 1, minWidth: 0, maxWidth: 420, mr: { xs: 1, sm: 2 } }}>
        <ProductSearchbar />
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        flexShrink={0}
        spacing={{ xs: 0.5, sm: 1 }}
      >
        {/* Giỏ hàng & Tài khoản đã có ở thanh dưới đáy (mobile) -> chỉ hiện trên desktop
            để tránh trùng menu. Thông báo giữ ở header (không có trong thanh dưới). */}
        <Box sx={{ display: { xs: 'none', lg: 'inline-flex' } }}>
          <CartButton />
        </Box>

        {/* Đổi ngôn ngữ ẩn trên mobile cho gọn header. */}
        <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          <LanguagePopover />
        </Box>

        <NotificationsPopover />

        <Box sx={{ display: { xs: 'none', lg: 'inline-flex' } }}>
          <AccountPopover />
        </Box>
      </Stack>
    </>
  );

  return (
    <AppBar
      sx={{
        boxShadow: 'none',
        height: HEADER.H_MOBILE,
        zIndex: theme.zIndex.appBar + 1,
        ...bgBlur({
          color: theme.palette.background.default,
        }),
        transition: theme.transitions.create(['height'], {
          duration: theme.transitions.duration.shorter,
        }),
        ...(isDesktop && {
          width: `calc(100% - ${NAV.W_DASHBOARD + 1}px)`,
          height: HEADER.H_DASHBOARD_DESKTOP,
          ...(isOffset && {
            height: HEADER.H_DASHBOARD_DESKTOP_OFFSET,
          }),
          ...(isNavHorizontal && {
            width: 1,
            bgcolor: 'background.default',
            height: HEADER.H_DASHBOARD_DESKTOP_OFFSET,
            borderBottom: `dashed 1px ${theme.palette.divider}`,
          }),
          ...(isNavMini && {
            width: `calc(100% - ${NAV.W_DASHBOARD_MINI + 1}px)`,
          }),
        }),
      }}
    >
      <Toolbar
        sx={{
          height: 1,
          px: { lg: 5 },
        }}
      >
        {renderContent}
      </Toolbar>
    </AppBar>
  );
}
