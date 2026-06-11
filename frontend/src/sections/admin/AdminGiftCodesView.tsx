// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { GiftTab } from './AdminMarketingView';

// ----------------------------------------------------------------------

export default function AdminGiftCodesView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Mã giảm giá" />
        <GiftTab />
      </Container>
    </RoleBasedGuard>
  );
}
