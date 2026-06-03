// next
import NextLink from 'next/link';
// @mui
import { styled, alpha } from '@mui/material/styles';
import { Box, Link, Typography } from '@mui/material';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// routes
import { PATH_DASHBOARD, PATH_AUTH } from '../../../routes/paths';
// components
import { CustomAvatar } from '../../../components/custom-avatar';

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
          <CustomAvatar name="K" />
          <Box sx={{ ml: 2, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              Khách
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              Đăng nhập / Đăng ký
            </Typography>
          </Box>
        </StyledRoot>
      </Link>
    );
  }

  return (
    <Link component={NextLink} href={PATH_DASHBOARD.myAccount} underline="none" color="inherit">
      <StyledRoot>
        <CustomAvatar src={avatar} alt={name} name={name} />

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
