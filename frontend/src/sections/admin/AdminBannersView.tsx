// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { BannersTab } from './AdminMarketingView';

// ----------------------------------------------------------------------

export default function AdminBannersView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Banner" />
        <BannersTab />
      </Container>
    </RoleBasedGuard>
  );
}
