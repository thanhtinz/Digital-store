import { useEffect, useState } from 'react';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// utils
import axiosInstance from '../../../utils/axios';
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
};

// ----------------------------------------------------------------------
// MENU STOREFRONT (cửa hàng cho khách). Phần admin nằm ở /admin (app riêng).
// Cấu trúc theo store cũ: Mua sắm + Danh mục (động) + Tài khoản + Khác.
// ----------------------------------------------------------------------

// Phần TĨNH (luôn có). Dùng làm base + cho Searchbar.
const navConfig = [
  {
    subheader: 'mua sắm',
    items: [
      { title: 'trang chủ', path: '/', icon: ICONS.dashboard },
      { title: 'gian hàng', path: PATH_DASHBOARD.eCommerce.shop, icon: ICONS.ecommerce },
      { title: 'tất cả sản phẩm', path: PATH_DASHBOARD.eCommerce.list, icon: ICONS.cart },
    ],
  },
  {
    subheader: 'tài khoản',
    items: [
      { title: 'đơn hàng', path: PATH_DASHBOARD.orders.root, icon: ICONS.cart },
      { title: 'tài khoản', path: PATH_DASHBOARD.user.account, icon: ICONS.user },
      { title: 'blog', path: PATH_DASHBOARD.blog.posts, icon: ICONS.blog },
      { title: 'hỗ trợ', path: PATH_DASHBOARD.chat.root, icon: ICONS.chat },
    ],
  },
];

export default navConfig;

// ----------------------------------------------------------------------
// Hook trả về menu kèm phần DANH MỤC đổ động từ /api/categories.
// ----------------------------------------------------------------------

type AnyCat = {
  slug?: string;
  name?: string;
  productType?: string;
  product_type?: string;
  isActive?: boolean;
  is_active?: boolean;
};

export function useNavConfig() {
  const [categories, setCategories] = useState<AnyCat[]>([]);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/categories')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setCategories(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const catItems = categories
    .filter((c) => c.slug && (c.isActive ?? c.is_active ?? true))
    .map((c) => ({
      title: c.name || c.slug || '',
      path: `${PATH_DASHBOARD.eCommerce.shop}?category=${c.slug}`,
    }));

  const data = [...navConfig];

  if (catItems.length) {
    // Chèn nhóm "Danh mục" (collapsible) ngay sau phần "Mua sắm".
    data.splice(1, 0, {
      subheader: 'danh mục',
      items: [
        {
          title: 'danh mục',
          path: PATH_DASHBOARD.eCommerce.shop,
          icon: ICONS.menu,
          children: catItems,
        } as any,
      ],
    });
  }

  return data;
}
