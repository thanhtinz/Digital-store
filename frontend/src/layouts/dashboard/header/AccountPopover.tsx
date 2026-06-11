import { useState } from 'react';
// next
import { useRouter } from 'next/router';
// @mui
import { alpha } from '@mui/material/styles';
import { Avatar, Box, Divider, Typography, Stack, MenuItem } from '@mui/material';
// routes
import { PATH_DASHBOARD, PATH_AUTH } from '../../../routes/paths';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// locales
import { useLocales } from '../../../locales';
// components
import Iconify from '../../../components/iconify';
import { useSnackbar } from '../../../components/snackbar';
import MenuPopover from '../../../components/menu-popover';
import { IconButtonAnimate } from '../../../components/animate';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export default function AccountPopover() {
  const { replace, push } = useRouter();

  const { user, logout, isAuthenticated } = useAuthContext();

  const { translate } = useLocales();
  // Viết hoa chữ cái đầu cho nhãn menu (một số key i18n đang viết thường).
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const t = (k: string) => cap(`${translate(`nav.${k}`)}`);

  const isAdmin = ['admin', 'superadmin', 'staff'].includes((user as any)?.role);

  const OPTIONS = [
    { label: t('account'), linkTo: PATH_DASHBOARD.myAccount },
    { label: t('orders'), linkTo: PATH_DASHBOARD.orders.root },
    { label: 'Tải xuống của tôi', linkTo: PATH_DASHBOARD.downloads },
    { label: t('wishlist'), linkTo: PATH_DASHBOARD.wishlist },
    { label: t('affiliate'), linkTo: PATH_DASHBOARD.affiliate },
    { label: t('topup'), linkTo: PATH_DASHBOARD.wallet.topup },
    { label: t('wallet_history'), linkTo: PATH_DASHBOARD.wallet.history },
  ];

  const name =
    (user as any)?.displayName ||
    (user as any)?.display_name ||
    (user as any)?.fullName ||
    (user as any)?.email ||
    'Tài khoản';
  const avatar = (user as any)?.photoURL || (user as any)?.avatar_url || '';

  const { enqueueSnackbar } = useSnackbar();

  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  const handleLogout = async () => {
    try {
      logout();
      replace(PATH_AUTH.login);
      handleClosePopover();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`${translate('nav.logout_failed')}`, { variant: 'error' });
    }
  };

  const handleClickItem = (path: string) => {
    handleClosePopover();
    push(path);
  };

  return (
    <>
      <IconButtonAnimate
        onClick={handleOpenPopover}
        sx={{
          p: 0,
          width: 40,
          height: 40,
          ...(openPopover && {
            '&:before': {
              zIndex: 1,
              content: "''",
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              position: 'absolute',
              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.8),
            },
          }),
        }}
      >
        <Avatar
          src={avatar || undefined}
          alt={name}
          sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', color: 'primary.main' }}
        >
          <Iconify icon="solar:user-rounded-bold" width={20} />
        </Avatar>
      </IconButtonAnimate>

      <MenuPopover open={openPopover} onClose={handleClosePopover} sx={{ width: 200, p: 0 }}>
        {!isAuthenticated ? (
          // Chưa đăng nhập: chỉ hiển thị Đăng nhập + Đăng ký.
          <Stack sx={{ p: 1 }}>
            <MenuItem onClick={() => handleClickItem(PATH_AUTH.login)}>
              <Iconify icon="solar:login-3-bold" sx={{ mr: 1 }} />
              {t('login')}
            </MenuItem>
            <MenuItem onClick={() => handleClickItem(PATH_AUTH.register)}>
              <Iconify icon="solar:user-plus-bold" sx={{ mr: 1 }} />
              {t('register')}
            </MenuItem>
          </Stack>
        ) : (
          <>
            <Box sx={{ my: 1.5, px: 2.5 }}>
              <Typography variant="subtitle2" noWrap>
                {name}
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                {(user as any)?.email}
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack sx={{ p: 1 }}>
              {OPTIONS.map((option) => (
                <MenuItem key={option.label} onClick={() => handleClickItem(option.linkTo)}>
                  {option.label}
                </MenuItem>
              ))}

              {isAdmin && (
                <MenuItem
                  onClick={() => handleClickItem(PATH_DASHBOARD.admin.root)}
                  sx={{ color: 'primary.main', fontWeight: 'fontWeightMedium' }}
                >
                  <Iconify icon="solar:shield-user-bold" sx={{ mr: 1 }} />
                  {t('admin')}
                </MenuItem>
              )}
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <MenuItem onClick={handleLogout} sx={{ m: 1 }}>
              {t('logout')}
            </MenuItem>
          </>
        )}
      </MenuPopover>
    </>
  );
}
