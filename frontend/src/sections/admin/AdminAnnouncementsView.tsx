// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { AnnounceTab } from './AdminMarketingView';

// ----------------------------------------------------------------------

export default function AdminAnnouncementsView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Thông báo" />
        <AnnounceTab />
      </Container>
    </RoleBasedGuard>
  );
}
