import { useState } from 'react';
// @mui
import { Box } from '@mui/material';
// hooks
import useResponsive from '../../hooks/useResponsive';
import useCartSync from '../../hooks/useCartSync';
import useSiteSettings from '../../hooks/useSiteSettings';
// auth
import AuthGuard from '../../auth/AuthGuard';
import { useAuthContext } from '../../auth/useAuthContext';
// components
import { useSettingsContext } from '../../components/settings';
import LiveChatWidget from '../../components/live-chat';
import ExternalLinkInterceptor from '../../components/external-redirect/ExternalLinkInterceptor';
import MaintenanceScreen from '../../components/maintenance/MaintenanceScreen';
import ClickEffect from '../../components/effects/ClickEffect';
import SeasonEffect from '../../components/effects/SeasonEffect';
//
import Main from './Main';
import Header from './header';
import MobileBottomNav from './MobileBottomNav';
import NavMini from './nav/NavMini';
import NavVertical from './nav/NavVertical';
import NavHorizontal from './nav/NavHorizontal';

// ----------------------------------------------------------------------

type Props = {
  children?: React.ReactNode;
  // Digital Store: cho phép trang công khai (shop/sản phẩm/blog) bỏ AuthGuard
  // để khách chưa đăng nhập vẫn xem được.
  disableGuard?: boolean;
};

export default function DashboardLayout({ children, disableGuard = false }: Props) {
  const { themeLayout } = useSettingsContext();
  const settings = useSiteSettings();
  const { user } = useAuthContext();

  useCartSync();

  const isDesktop = useResponsive('up', 'lg');

  const [open, setOpen] = useState(false);

  const isNavHorizontal = themeLayout === 'horizontal';

  const isNavMini = themeLayout === 'mini';

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const renderNavVertical = <NavVertical openNav={open} onCloseNav={handleClose} />;

  const renderContent = () => {
    if (isNavHorizontal) {
      return (
        <>
          <Header onOpenNav={handleOpen} />

          {isDesktop ? <NavHorizontal /> : renderNavVertical}

          <Main>{children}</Main>
        </>
      );
    }

    if (isNavMini) {
      return (
        <>
          <Header onOpenNav={handleOpen} />

          <Box
            sx={{
              display: { lg: 'flex' },
              minHeight: { lg: 1 },
            }}
          >
            {isDesktop ? <NavMini /> : renderNavVertical}

            <Main>{children}</Main>
          </Box>
        </>
      );
    }

    return (
      <>
        <Header onOpenNav={handleOpen} />

        <Box
          sx={{
            display: { lg: 'flex' },
            minHeight: { lg: 1 },
          }}
        >
          {renderNavVertical}

          <Main>{children}</Main>
        </Box>
      </>
    );
  };

  // Bảo trì: chặn hiển thị cho khách (staff/admin vẫn xem được để kiểm tra).
  const isStaff = ['admin', 'superadmin', 'staff'].includes((user as any)?.role);
  if (settings?.maintenance?.on && !isStaff) {
    return <MaintenanceScreen config={settings.maintenance} />;
  }

  const extras = (
    <>
      <MobileBottomNav />
      <LiveChatWidget />
      <ExternalLinkInterceptor />
      <ClickEffect />
      <SeasonEffect />
    </>
  );

  if (disableGuard) {
    return (
      <>
        {renderContent()}
        {extras}
      </>
    );
  }

  return (
    <AuthGuard>
      {renderContent()}
      {extras}
    </AuthGuard>
  );
}
