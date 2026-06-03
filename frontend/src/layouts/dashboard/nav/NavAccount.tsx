// next
import NextLink from 'next/link';
// @mui
import { styled, alpha } from '@mui/material/styles';
import { Avatar, Box, Link, Typography } from '@mui/material';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// locales
import { useLocales } from '../../../locales';
// routes
import { PATH_DASHBOARD, PATH_AUTH } from '../../../routes/paths';
// components
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------
// Avatar dùng icon user (đồng bộ với header).
function UserAvatar({ src }: { src?: string }) {
  return (
    <Avatar
      src={src || undefined}
      sx={{ width: 40, height: 40, bgcolor: 'primary.lighter', color: 'primary.main' }}
    >
      <Iconify icon="solar:user-rounded-bold" width={24} />
    </Avatar>
  );
}

// ----------------------------------------------------------------------

const StyledRoot = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2, 2.5),
  borderRadius: Number(theme.shape.borderRadius) * 1.5,
  backgroundColor: alpha(theme.palette.grey[500], 0.12),
  transition: theme.transitions.create('opacity', {
    duration: theme.transitions.duration.shorter,
  }),
}));

// ----------------------------------------------------------------------

export default function NavAccount() {
  const { user, isAuthenticated } = useAuthContext();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`nav.${k}`)}`;

  const name =
    (user as any)?.displayName ||
    (user as any)?.display_name ||
    (user as any)?.fullName ||
    (user as any)?.email ||
    'Tài khoản';
  const avatar = (user as any)?.photoURL || (user as any)?.avatar_url || '';
  const email = (user as any)?.email || '';

  // Chưa đăng nhập: hiện nút đăng nhập thay vì để trống.
  if (!isAuthenticated) {
    return (
      <Link component={NextLink} href={PATH_AUTH.login} underline="none" color="inherit">
        <StyledRoot>
          <UserAvatar />
          <Box sx={{ ml: 2, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {t('guest')}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {t('login_register')}
            </Typography>
          </Box>
        </StyledRoot>
      </Link>
    );
  }

  return (
    <Link component={NextLink} href={PATH_DASHBOARD.myAccount} underline="none" color="inherit">
      <StyledRoot>
        <UserAvatar src={avatar} />

        <Box sx={{ ml: 2, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {name}
          </Typography>

          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
            {email}
          </Typography>
        </Box>
      </StyledRoot>
    </Link>
  );
}
