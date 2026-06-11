// @mui
import { Container } from '@mui/material';
// auth
import RoleBasedGuard from '../../auth/RoleBasedGuard';
// components
import AdminPageHeader from './AdminPageHeader';
import FeatureToggle from './FeatureToggle';
import { ReviewsTab } from './AdminSupportView';

// ----------------------------------------------------------------------

export default function AdminReviewsView() {
  return (
    <RoleBasedGuard hasContent roles={['admin', 'superadmin', 'staff']}>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <AdminPageHeader title="Đánh giá sản phẩm" />
        <FeatureToggle
          flag="reviews"
          label="Đánh giá sản phẩm"
          description="Cho phép khách đánh giá sản phẩm."
          icon="solar:star-bold-duotone"
        />
        <ReviewsTab />
      </Container>
    </RoleBasedGuard>
  );
}
