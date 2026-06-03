// components
import SvgColor from '../../../components/svg-color';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const ICONS = {
  dashboard: icon('ic_dashboard'),
  banking: icon('ic_banking'),
  user: icon('ic_user'),
  cart: icon('ic_cart'),
  ecommerce: icon('ic_ecommerce'),
  label: icon('ic_label'),
  blog: icon('ic_blog'),
  external: icon('ic_external'),
};

// ----------------------------------------------------------------------
// Menu RIÊNG cho khu quản trị (AdminLayout). Tách khỏi sidebar cửa hàng.
// (Để tiếng Việt — sẽ đa ngôn ngữ sau nếu cần.)

export function useAdminNavConfig() {
  return [
    {
      subheader: 'Quản trị',
      items: [
        { title: 'Tổng quan', path: PATH_DASHBOARD.admin.root, icon: ICONS.dashboard },
        { title: 'Đơn hàng', path: PATH_DASHBOARD.admin.orders, icon: ICONS.cart },
        { title: 'Người dùng', path: PATH_DASHBOARD.admin.users, icon: ICONS.user },
      ],
    },
    {
      subheader: 'Cửa hàng',
      items: [
        { title: 'Sản phẩm', path: PATH_DASHBOARD.admin.products, icon: ICONS.ecommerce },
        { title: 'Danh mục', path: PATH_DASHBOARD.admin.categories, icon: ICONS.label },
        { title: 'SMM Panel', path: PATH_DASHBOARD.admin.smm, icon: ICONS.cart },
        { title: 'Marketing', path: PATH_DASHBOARD.admin.marketing, icon: ICONS.blog },
        { title: 'Blog', path: PATH_DASHBOARD.admin.blog, icon: ICONS.blog },
      ],
    },
    {
      subheader: 'Vận hành',
      items: [
        { title: 'Hỗ trợ & Đánh giá', path: PATH_DASHBOARD.admin.support, icon: ICONS.banking },
        { title: 'Giới thiệu bạn bè', path: PATH_DASHBOARD.admin.affiliate, icon: ICONS.user },
      ],
    },
    {
      subheader: 'Cấu hình',
      items: [
        { title: 'Cài đặt cửa hàng', path: PATH_DASHBOARD.admin.settings, icon: ICONS.banking },
        { title: 'Tích hợp', path: PATH_DASHBOARD.admin.integrations, icon: ICONS.external },
      ],
    },
    {
      subheader: 'Khác',
      items: [{ title: 'Về cửa hàng', path: '/', icon: ICONS.external }],
    },
  ];
}
