// next
import { useEffect } from 'react';
import { useRouter } from 'next/router';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';

// Hỗ trợ & Đánh giá đã tách thành 2 trang riêng — chuyển hướng sang Ticket.
export default function AdminSupportRedirect() {
  const { replace } = useRouter();
  useEffect(() => {
    replace(PATH_DASHBOARD.admin.tickets);
  }, [replace]);
  return null;
}
