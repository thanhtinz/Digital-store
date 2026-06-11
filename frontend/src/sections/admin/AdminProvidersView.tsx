// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { ProvidersTab } from './AdminIntegrationsView';

// ----------------------------------------------------------------------

export default function AdminProvidersView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Nguồn cung cấp" links={[{ name: 'Tích hợp' }]} />
        <ProvidersTab />
      </Container>
    </RoleBasedGuard>
  );
}
