// next
import { useEffect } from 'react';
import { useRouter } from 'next/router';
// config
import { PATH_DASHBOARD } from '../routes/paths';

// ----------------------------------------------------------------------

export default function HomePage() {
  const { push } = useRouter();
  useEffect(() => {
    // Trang chủ -> shop công khai (không bắt đăng nhập). Dashboard/app vẫn cần login.
    push(PATH_DASHBOARD.eCommerce.shop);
  }, [push]);
  return null;
}
