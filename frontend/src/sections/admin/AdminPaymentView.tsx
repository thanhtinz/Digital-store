// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import { PaymentTab } from './AdminIntegrationsView';

// ----------------------------------------------------------------------

export default function AdminPaymentView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Thanh toán (SePay)" links={[{ name: 'Tích hợp' }]} />
        <PaymentTab />
      </Container>
    </RoleBasedGuard>
  );
}
