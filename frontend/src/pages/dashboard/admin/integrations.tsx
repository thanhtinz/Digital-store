// next
import { useEffect } from 'react';
import { useRouter } from 'next/router';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';

// Tích hợp đã tách thành các trang riêng — chuyển hướng sang Thanh toán.
export default function AdminIntegrationsRedirect() {
  const { replace } = useRouter();
  useEffect(() => {
    replace(PATH_DASHBOARD.admin.intPayment);
  }, [replace]);
  return null;
}
