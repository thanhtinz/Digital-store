import { useEffect, useState } from 'react';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// utils
import axiosInstance from '../../../utils/axios';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// locales
import { useLocales } from '../../../locales';
// components
import SvgColor from '../../../components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const ICONS = {
  blog: icon('ic_blog'),
  cart: icon('ic_cart'),
  chat: icon('ic_chat'),
  user: icon('ic_user'),
  ecommerce: icon('ic_ecommerce'),
  dashboard: icon('ic_dashboard'),
  menu: icon('ic_menu_item'),
  label: icon('ic_label'),
  external: icon('ic_external'),
  banking: icon('ic_banking'),
};

// ----------------------------------------------------------------------
// MENU STOREFRONT (cửa hàng cho khách). Admin nằm ở /admin (app riêng).
// Cấu trúc: Mua sắm (Trang chủ + danh mục premium) + Topup + Giftcard +
// Dịch vụ MXH + Hỗ trợ. Dữ liệu danh mục/sản phẩm đổ động từ backend.
// ----------------------------------------------------------------------

// Phần TĨNH (cho Searchbar + fallback).
const navConfig = [
  {
    subheader: 'mua sắm',
    items: [{ title: 'trang chủ', path: '/', icon: ICONS.dashboard }],
  },
  {
    subheader: 'hỗ trợ',
    items: [
      { title: 'ưu đãi', path: PATH_DASHBOARD.offers, icon: ICONS.label },
      { title: 'blog', path: PATH_DASHBOARD.blog.posts, icon: ICONS.blog },
      { title: 'hỗ trợ', path: PATH_DASHBOARD.support, icon: ICONS.chat },
    ],
  },
];

export default navConfig;

// ----------------------------------------------------------------------

type AnyCat = {
  id?: number;
  slug?: string;
  name?: string;
  productType?: string;
  product_type?: string;
  parentId?: number | null;
  parent_id?: number | null;
  isActive?: boolean;
  is_active?: boolean;
};

type AnyProduct = {
  id?: number;
  slug?: string;
  code?: string;
  name?: string;
};

const typeOf = (c: AnyCat) => c.productType || c.product_type || 'premium';
const parentOf = (c: AnyCat) => c.parentId ?? c.parent_id ?? null;
const activeOf = (c: AnyCat) => c.isActive ?? c.is_active ?? true;

// ----------------------------------------------------------------------

export function useNavConfig() {
  const { translate } = useLocales();
  const t = (key: string) => `${translate(`nav.${key}`)}`;

  const { user } = useAuthContext();
  const isStaff = (user as any)?.role === 'admin' || (user as any)?.role === 'staff';

  const [categories, setCategories] = useState<AnyCat[]>([]);
  const [giftcards, setGiftcards] = useState<AnyProduct[]>([]);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/categories')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setCategories(list);
      })
      .catch(() => {});
    axiosInstance
      .get('/api/products', { params: { type: 'giftcard', limit: 50 } })
      .then((res) => {
        const list = res.data?.products || res.data?.items || [];
        if (alive) setGiftcards(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const shopByCat = (slug?: string) => `${PATH_DASHBOARD.eCommerce.shop}?category=${slug || ''}`;

  // Danh mục lớn premium (cấp 1) -> mục phẳng trong "Mua sắm".
  const premiumCats = categories
    .filter((c) => c.slug && activeOf(c) && typeOf(c) === 'premium' && parentOf(c) == null)
    .map((c) => ({ title: c.name || c.slug || '', path: shopByCat(c.slug), icon: ICONS.menu }));

  // Danh mục game -> dropdown Topup.
  const gameCats = categories
    .filter((c) => c.slug && activeOf(c) && typeOf(c) === 'game')
    .map((c) => ({ title: c.name || c.slug || '', path: shopByCat(c.slug) }));

  // Sản phẩm giftcard -> dropdown Giftcard.
  const giftcardItems = giftcards
    .filter((p) => p.slug || p.code)
    .map((p) => ({
      title: p.name || p.slug || '',
      path: PATH_DASHBOARD.eCommerce.view((p.slug || p.code) as string),
    }));

  // ── Lắp ráp menu ──
  const shopping = {
    subheader: t('shopping'),
    items: [
      { title: t('home'), path: '/', icon: ICONS.dashboard },
      ...premiumCats,
    ],
  };

  const serviceItems: any[] = [];
  if (gameCats.length) {
    serviceItems.push({
      title: t('topup_game'),
      path: shopByCat(''),
      icon: ICONS.cart,
      children: gameCats,
    });
  }
  if (giftcardItems.length) {
    serviceItems.push({
      title: t('giftcard'),
      path: PATH_DASHBOARD.eCommerce.shop,
      icon: ICONS.label,
      children: giftcardItems,
    });
  }
  serviceItems.push({
    title: t('social'),
    path: PATH_DASHBOARD.smm.root,
    icon: ICONS.external,
    children: [
      { title: t('order'), path: PATH_DASHBOARD.smm.order },
      { title: t('service_list'), path: PATH_DASHBOARD.smm.services },
      { title: t('orders'), path: PATH_DASHBOARD.smm.orders },
      { title: t('warranty'), path: PATH_DASHBOARD.smm.warranty },
    ],
  });

  const support = {
    subheader: t('support'),
    items: [
      { title: t('topup'), path: PATH_DASHBOARD.wallet.topup, icon: ICONS.banking },
      { title: t('offers'), path: PATH_DASHBOARD.offers, icon: ICONS.label },
      { title: t('blog'), path: PATH_DASHBOARD.blog.posts, icon: ICONS.blog },
      { title: t('support'), path: PATH_DASHBOARD.support, icon: ICONS.chat },
    ],
  };

  // Khu quản trị — chỉ hiện cho admin/staff. Dùng luôn theme Minimal.
  const adminSection = {
    subheader: t('admin'),
    items: [
      { title: t('admin_overview'), path: PATH_DASHBOARD.admin.root, icon: ICONS.dashboard },
      { title: t('admin_settings'), path: PATH_DASHBOARD.admin.settings, icon: ICONS.banking },
    ],
  };

  const sections: any[] = [shopping, { subheader: t('services'), items: serviceItems }, support];
  if (isStaff) sections.push(adminSection);
  return sections;
}
