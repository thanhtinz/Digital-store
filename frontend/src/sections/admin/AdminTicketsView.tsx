// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';
import { TicketsTab } from './AdminSupportView';

// ----------------------------------------------------------------------

export default function AdminTicketsView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Ticket hỗ trợ" />
        <FeatureToggle
          flag="support"
          label="Hỗ trợ / Ticket"
          description="Cho phép khách tạo ticket hỗ trợ."
          icon="solar:headphones-round-bold-duotone"
        />
        <TicketsTab />
      </Container>
    </RoleBasedGuard>
  );
}
