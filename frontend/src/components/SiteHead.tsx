import { useEffect } from 'react';
// next
import { useRouter } from 'next/router';
// hooks
import useSiteSettings from '../hooks/useSiteSettings';

// ----------------------------------------------------------------------
// Đồng bộ tiêu đề tab + meta description theo cấu hình site lấy từ backend
// (/api/settings). Thay thương hiệu mặc định của template ("Minimal UI")
// bằng tên web thật, áp lại sau mỗi lần điều hướng.
// ----------------------------------------------------------------------

export default function SiteHead() {
  const settings = useSiteSettings();
  const router = useRouter();
  const siteName = settings.site_name || 'Digital Store';
  const siteDesc = settings.site_description || '';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const apply = () => {
      const cur = document.title || '';
      // Chỉ can thiệp khi tiêu đề còn thương hiệu template hoặc rỗng,
      // tránh đè lên tiêu đề đã đặt đúng (vd trang sản phẩm).
      if (!cur || /minimal/i.test(cur)) {
        const left = cur.includes('|') ? cur.split('|')[0].trim() : '';
        document.title = left ? `${left} | ${siteName}` : siteName;
      }

      let meta = document.querySelector('meta[name="description"]');
      const curDesc = meta?.getAttribute('content') || '';
      if (siteDesc && (!curDesc || /minimal/i.test(curDesc))) {
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', siteDesc);
      }
    };

    apply();
    // Next đặt lại <title> từ <Head> của trang mới sau khi điều hướng xong.
    const onDone = () => setTimeout(apply, 0);
    router.events.on('routeChangeComplete', onDone);
    return () => {
      router.events.off('routeChangeComplete', onDone);
    };
  }, [siteName, siteDesc, router.events]);

  return null;
}
