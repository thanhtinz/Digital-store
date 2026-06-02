// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
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
};

// Menu chỉ giữ các mục backend Digital Store thực sự hỗ trợ.
const navConfig = [
  // GENERAL
  {
    subheader: 'general',
    items: [
      { title: 'dashboard', path: PATH_DASHBOARD.general.app, icon: ICONS.dashboard },
      { title: 'cửa hàng', path: PATH_DASHBOARD.general.ecommerce, icon: ICONS.ecommerce },
    ],
  },

  // QUẢN LÝ
  {
    subheader: 'quản lý',
    items: [
      // SẢN PHẨM / E-COMMERCE
      {
        title: 'sản phẩm',
        path: PATH_DASHBOARD.eCommerce.root,
        icon: ICONS.cart,
        children: [
          { title: 'gian hàng', path: PATH_DASHBOARD.eCommerce.shop },
          { title: 'danh sách', path: PATH_DASHBOARD.eCommerce.list },
          { title: 'thêm mới', path: PATH_DASHBOARD.eCommerce.new },
          { title: 'thanh toán', path: PATH_DASHBOARD.eCommerce.checkout },
        ],
      },

      // NGƯỜI DÙNG
      {
        title: 'người dùng',
        path: PATH_DASHBOARD.user.root,
        icon: ICONS.user,
        children: [
          { title: 'tài khoản', path: PATH_DASHBOARD.user.account },
          { title: 'hồ sơ', path: PATH_DASHBOARD.user.profile },
          { title: 'danh sách', path: PATH_DASHBOARD.user.list },
          { title: 'thêm mới', path: PATH_DASHBOARD.user.new },
        ],
      },

      // BLOG
      {
        title: 'blog',
        path: PATH_DASHBOARD.blog.root,
        icon: ICONS.blog,
        children: [
          { title: 'bài viết', path: PATH_DASHBOARD.blog.posts },
          { title: 'viết bài', path: PATH_DASHBOARD.blog.new },
        ],
      },
    ],
  },

  // ỨNG DỤNG
  {
    subheader: 'ứng dụng',
    items: [
      { title: 'chat', path: PATH_DASHBOARD.chat.root, icon: ICONS.chat },
    ],
  },
];

export default navConfig;
