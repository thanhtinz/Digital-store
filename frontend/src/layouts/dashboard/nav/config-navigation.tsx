import { useEffect, useState } from 'react';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// utils
import axiosInstance from '../../../utils/axios';
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

  const [categories, setCategories] = useState<AnyCat[]>([]);
  const [topupProducts, setTopupProducts] = useState<AnyProduct[]>([]);
  const [giftcardProducts, setGiftcardProducts] = useState<AnyProduct[]>([]);
  // Có nền tảng MXH (SMM) khả dụng hay không -> ẩn mục SMM nếu rỗng.
  const [hasSmm, setHasSmm] = useState(false);
  // Điểm thưởng (loyalty) có bật không -> ẩn mục "Điểm thưởng" nếu tắt.
  const [rewardsEnabled, setRewardsEnabled] = useState(false);
  // Vòng quay may mắn có bật không.
  const [wheelEnabled, setWheelEnabled] = useState(false);
  // Cờ tính năng (settings_features) từ admin -> ẩn các mục bị tắt.
  const [features, setFeatures] = useState<Record<string, any>>({});

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/loyalty/config')
      .then((res) => {
        if (alive) setRewardsEnabled(!!res.data?.enabled);
      })
      .catch(() => {});
    axiosInstance
      .get('/api/admin/settings/public')
      .then((res) => {
        if (alive) setFeatures(res.data?.features || {});
      })
      .catch(() => {});
    axiosInstance
      .get('/api/settings')
      .then((res) => {
        const v = res.data || {};
        if (alive) setWheelEnabled(v.wheel_enabled === '1' || v.wheel_enabled === 'true');
      })
      .catch(() => {});
    axiosInstance
      .get('/api/categories')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setCategories(list);
      })
      .catch(() => {});
    axiosInstance
      .get('/api/smm/catalog')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setHasSmm(list.length > 0);
      })
      .catch(() => {});
    axiosInstance
      .get('/api/products', { params: { type: 'game', limit: 60 } })
      .then((res) => {
        if (alive) setTopupProducts(res.data?.products || res.data?.items || []);
      })
      .catch(() => {});
    axiosInstance
      .get('/api/products', { params: { type: 'giftcard', limit: 60 } })
      .then((res) => {
        if (alive) setGiftcardProducts(res.data?.products || res.data?.items || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const shopByCat = (slug?: string) => `${PATH_DASHBOARD.eCommerce.shop}?category=${slug || ''}`;
  const viewProduct = (p: AnyProduct) =>
    PATH_DASHBOARD.eCommerce.view((p.slug || p.code || String(p.id || '')) as string);

  // Danh mục lớn premium (cấp 1) -> mục phẳng trong "Mua sắm".
  const premiumCats = categories
    .filter((c) => c.slug && activeOf(c) && typeOf(c) === 'premium' && parentOf(c) == null)
    .map((c) => ({ title: c.name || c.slug || '', path: shopByCat(c.slug), icon: ICONS.menu }));

  // Sản phẩm topup (type game) -> dropdown Topup (SẢN PHẨM).
  const gameCats = topupProducts
    .filter((p) => p.slug || p.code)
    .map((p) => ({ title: p.name || p.slug || '', path: viewProduct(p) }));

  // Sản phẩm giftcard -> dropdown Giftcard (SẢN PHẨM).
  const giftcardItems = giftcardProducts
    .filter((p) => p.slug || p.code)
    .map((p) => ({ title: p.name || p.slug || '', path: viewProduct(p) }));

  // Mã nguồn/theme -> dropdown Mã nguồn (DANH MỤC, không phải sản phẩm).
  const sourceItems = categories
    .filter((c) => c.slug && activeOf(c) && typeOf(c) === 'source' && parentOf(c) == null)
    .map((c) => ({ title: c.name || c.slug || '', path: shopByCat(c.slug) }));

  // ── Lắp ráp menu ──
  const on = (k: string) => features[k] !== false;

  const shopping = {
    subheader: t('shopping'),
    items: [
      { title: t('home'), path: '/', icon: ICONS.dashboard },
      ...premiumCats,
      ...(on('bundles') ? [{ title: t('bundles'), path: PATH_DASHBOARD.bundles, icon: ICONS.cart }] : []),
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
  if (sourceItems.length) {
    serviceItems.push({
      title: 'Mã nguồn & Theme',
      path: `${PATH_DASHBOARD.eCommerce.shop}?type=source`,
      icon: ICONS.menu,
      children: sourceItems,
    });
  }
  // Chỉ hiện dịch vụ MXH (SMM) khi đã có nền tảng/dịch vụ khả dụng.
  if (hasSmm) {
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
  }

  // Mỗi tính năng coi như BẬT trừ khi admin đặt false tường minh.
  const supportItems = [
    ...(on('flash_sales') ? [{ title: t('flash_sale'), path: PATH_DASHBOARD.flashSale, icon: ICONS.label }] : []),
    ...(on('offers') ? [{ title: t('offers'), path: PATH_DASHBOARD.offers, icon: ICONS.label }] : []),
    ...(rewardsEnabled ? [{ title: t('rewards'), path: PATH_DASHBOARD.rewards, icon: ICONS.banking }] : []),
    ...(wheelEnabled ? [{ title: t('wheel'), path: PATH_DASHBOARD.wheel, icon: ICONS.label }] : []),
    ...(on('blog') ? [{ title: t('blog'), path: PATH_DASHBOARD.blog.posts, icon: ICONS.blog }] : []),
    ...(on('support') ? [{ title: t('support'), path: PATH_DASHBOARD.support, icon: ICONS.chat }] : []),
  ];
  const support = {
    subheader: t('support'),
    items: supportItems,
  };

  // Admin có MENU RIÊNG (AdminLayout) — không nhồi vào sidebar cửa hàng nữa.
  // Bỏ qua nhóm "Dịch vụ" nếu không có mục nào (tránh hiện tiêu đề rỗng).
  return [
    shopping,
    ...(serviceItems.length ? [{ subheader: t('services'), items: serviceItems }] : []),
    ...(supportItems.length ? [support] : []),
  ];
}
