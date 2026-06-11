// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { FlashTab } from './AdminMarketingView';

// ----------------------------------------------------------------------

export default function AdminFlashSalesView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Flash sale" />
        <FlashTab />
      </Container>
    </RoleBasedGuard>
  );
}
