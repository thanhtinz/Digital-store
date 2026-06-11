// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { AiTab } from './AdminIntegrationsView';

// ----------------------------------------------------------------------

export default function AdminAiView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="AI" links={[{ name: 'Tích hợp' }]} />
        <AiTab />
      </Container>
    </RoleBasedGuard>
  );
}
