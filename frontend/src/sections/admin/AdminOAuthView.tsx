// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { OAuthTab } from './AdminIntegrationsView';

// ----------------------------------------------------------------------

export default function AdminOAuthView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Đăng nhập OAuth" links={[{ name: 'Tích hợp' }]} />
        <OAuthTab />
      </Container>
    </RoleBasedGuard>
  );
}
