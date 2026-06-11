import { useState } from 'react';
// @mui
import { Box } from '@mui/material';
// auth
import AuthGuard from '../../auth/AuthGuard';
import RoleBasedGuard from '../../auth/RoleBasedGuard';
//
import Main from './Main';
import Header from './header';
import AdminNavVertical from './nav/AdminNavVertical';

// ----------------------------------------------------------------------
// Layout RIÊNG cho khu quản trị: dùng chrome Minimal nhưng menu admin riêng.
// Chặn người dùng không phải admin/staff.

type Props = {
  children?: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <AuthGuard>
      <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
        <Header onOpenNav={() => setOpen(true)} />

        <Box sx={{ display: { lg: 'flex' }, minHeight: { lg: 1 } }}>
          <AdminNavVertical openNav={open} onCloseNav={() => setOpen(false)} />

          <Main>{children}</Main>
        </Box>
      </RoleBasedGuard>
    </AuthGuard>
  );
}
