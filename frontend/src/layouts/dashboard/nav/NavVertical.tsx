import { useEffect } from 'react';
// next
import { useRouter } from 'next/router';
// @mui
import { Box, Stack, Drawer } from '@mui/material';
import { alpha } from '@mui/material/styles';
// hooks
import useResponsive from '../../../hooks/useResponsive';
import useSiteSettings from '../../../hooks/useSiteSettings';
// config
import { NAV } from '../../../config-global';
// components
import Logo from '../../../components/logo';
import Scrollbar from '../../../components/scrollbar';
import { NavSectionVertical } from '../../../components/nav-section';
//
import { useNavConfig } from './config-navigation';
import NavAccount from './NavAccount';
import NavToggleButton from './NavToggleButton';

// ----------------------------------------------------------------------

type Props = {
  openNav: boolean;
  onCloseNav: VoidFunction;
};

export default function NavVertical({ openNav, onCloseNav }: Props) {
  const { pathname } = useRouter();
  const settings = useSiteSettings();
  const navBg = settings?.nav_bg_image;

  const navData = useNavConfig();

  const isDesktop = useResponsive('up', 'lg');

  // Ảnh nền menu + lớp phủ màu nền bán trong suốt -> chữ luôn rõ (tự căn độ rõ).
  const bgSx = navBg
    ? {
        backgroundImage: (t: any) =>
          `linear-gradient(${alpha(t.palette.background.default, 0.84)}, ${alpha(t.palette.background.default, 0.9)}), url(${navBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  useEffect(() => {
    if (openNav) {
      onCloseNav();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': {
          height: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack
        spacing={3}
        sx={{
          pt: 3,
          pb: 2,
          px: 2.5,
          flexShrink: 0,
        }}
      >
        <Logo />

        <NavAccount />
      </Stack>

      <NavSectionVertical data={navData} />

      <Box sx={{ flexGrow: 1 }} />
    </Scrollbar>
  );

  return (
    <Box
      component="nav"
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: NAV.W_DASHBOARD },
      }}
    >
      <NavToggleButton />

      {isDesktop ? (
        <Drawer
          open
          variant="permanent"
          PaperProps={{
            sx: {
              zIndex: 0,
              width: NAV.W_DASHBOARD,
              bgcolor: 'transparent',
              borderRightStyle: 'dashed',
              ...bgSx,
            },
          }}
        >
          {renderContent}
        </Drawer>
      ) : (
        <Drawer
          open={openNav}
          onClose={onCloseNav}
          ModalProps={{
            keepMounted: true,
          }}
          PaperProps={{
            sx: {
              width: NAV.W_DASHBOARD,
              ...bgSx,
            },
          }}
        >
          {renderContent}
        </Drawer>
      )}
    </Box>
  );
}
