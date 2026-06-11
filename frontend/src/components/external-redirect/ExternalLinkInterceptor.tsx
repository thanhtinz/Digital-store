import { useEffect } from 'react';
// next
import { useRouter } from 'next/router';

// ----------------------------------------------------------------------
// Bắt mọi click vào link RA NGOÀI (khác tên miền) và đưa qua trang chuyển
// hướng có cảnh báo + đếm ngược. Thêm thuộc tính data-no-interstitial trên
// thẻ <a> để bỏ qua (ví dụ widget live chat của bên thứ ba).
// ----------------------------------------------------------------------

export default function ExternalLinkInterceptor() {
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== 'A') el = el.parentElement;
      const a = el as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href || a.hasAttribute('data-no-interstitial')) return;
      if (!/^https?:\/\//i.test(href)) return; // bỏ qua nội bộ, mailto, tel, anchor...

      let host = '';
      try {
        host = new URL(href).hostname;
      } catch {
        return;
      }
      if (!host || host === window.location.hostname) return; // cùng tên miền -> đi bình thường

      e.preventDefault();
      router.push(`/dashboard/redirect?url=${encodeURIComponent(href)}`);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  return null;
}
