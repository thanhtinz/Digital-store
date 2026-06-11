// next
import { useEffect } from 'react';
import { useRouter } from 'next/router';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';

// Marketing đã tách thành các trang riêng — chuyển hướng sang Banner.
export default function AdminMarketingRedirect() {
  const { replace } = useRouter();
  useEffect(() => {
    replace(PATH_DASHBOARD.admin.banners);
  }, [replace]);
  return null;
}
