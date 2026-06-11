// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { EmailTab } from './AdminIntegrationsView';

// ----------------------------------------------------------------------

export default function AdminMailView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Email / SMTP" links={[{ name: 'Tích hợp' }]} />
        <EmailTab />
      </Container>
    </RoleBasedGuard>
  );
}
