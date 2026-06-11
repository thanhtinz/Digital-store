import { useState, useEffect } from 'react';
//
import AppLoader from '../app-loader';

// ----------------------------------------------------------------------
// Màn hình loading toàn trang — dùng GIF chung (AppLoader).

export default function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <AppLoader fullscreen />;
}
