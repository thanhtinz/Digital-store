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

  const { user, logout } = useAuthContext();

  const { translate } = useLocales();
  const t = (k: string) => `${translate(`nav.${k}`)}`;

  const isAdmin = (user as any)?.role === 'admin';

  const OPTIONS = [
    { label: t('home'), linkTo: '/' },
    { label: t('account'), linkTo: PATH_DASHBOARD.myAccount },
    { label: t('orders'), linkTo: PATH_DASHBOARD.orders.root },
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
      enqueueSnackbar('Unable to logout!', { variant: 'error' });
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
          sx={{ width: 36, height: 36, bgcolor: 'primary.lighter', color: 'primary.main' }}
        >
          <Iconify icon="solar:user-rounded-bold" width={22} />
        </Avatar>
      </IconButtonAnimate>

      <MenuPopover open={openPopover} onClose={handleClosePopover} sx={{ width: 200, p: 0 }}>
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
              onClick={() => {
                handleClosePopover();
                window.location.href = '/admin';
              }}
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
      </MenuPopover>
    </>
  );
}
