// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { TelegramTab } from './AdminIntegrationsView';

// ----------------------------------------------------------------------

export default function AdminTelegramView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Telegram Bot" links={[{ name: 'Tích hợp' }]} />
        <TelegramTab />
      </Container>
    </RoleBasedGuard>
  );
}
