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
  menuItem: icon('ic_menu_item'),
  analytics: icon('ic_analytics'),
  chat: icon('ic_chat'),
};

// ----------------------------------------------------------------------
// Menu khu quản trị — gom theo nhóm, mỗi nhóm là 1 mục dropdown (children).
// Tách khỏi sidebar cửa hàng. Tiếng Việt.

export function useAdminNavConfig() {
  return [
    {
      subheader: 'Tổng quan',
      items: [
        { title: 'Tổng quan', path: PATH_DASHBOARD.admin.root, icon: ICONS.dashboard },
      ],
    },
    {
      subheader: 'Quản lý',
      items: [
        {
          title: 'Cửa hàng',
          path: PATH_DASHBOARD.admin.products,
          icon: ICONS.ecommerce,
          children: [
            { title: 'Sản phẩm', path: PATH_DASHBOARD.admin.products },
            { title: 'Danh mục', path: PATH_DASHBOARD.admin.categories },
            { title: 'Gói combo', path: PATH_DASHBOARD.admin.bundles },
            { title: 'SMM Panel', path: PATH_DASHBOARD.admin.smm },
          ],
        },
        {
          title: 'Đơn & Khách',
          path: PATH_DASHBOARD.admin.orders,
          icon: ICONS.cart,
          children: [
            { title: 'Đơn hàng', path: PATH_DASHBOARD.admin.orders },
            { title: 'Người dùng', path: PATH_DASHBOARD.admin.users },
            { title: 'Cấp bậc thành viên', path: PATH_DASHBOARD.admin.ranks },
          ],
        },
        {
          title: 'Marketing & Ưu đãi',
          path: PATH_DASHBOARD.admin.banners,
          icon: ICONS.label,
          children: [
            { title: 'Banner', path: PATH_DASHBOARD.admin.banners },
            { title: 'Flash sale', path: PATH_DASHBOARD.admin.flashSales },
            { title: 'Mã giảm giá', path: PATH_DASHBOARD.admin.giftCodes },
            { title: 'Thông báo', path: PATH_DASHBOARD.admin.announcements },
            { title: 'Vòng quay may mắn', path: PATH_DASHBOARD.admin.wheel },
            { title: 'Điểm thưởng', path: PATH_DASHBOARD.admin.rewards },
            { title: 'Huy hiệu', path: PATH_DASHBOARD.admin.badges },
          ],
        },
        {
          title: 'Nội dung & Hỗ trợ',
          path: PATH_DASHBOARD.admin.support,
          icon: ICONS.chat,
          children: [
            { title: 'Ticket hỗ trợ', path: PATH_DASHBOARD.admin.tickets },
            { title: 'Đánh giá', path: PATH_DASHBOARD.admin.reviews },
            { title: 'Hỏi & Đáp', path: PATH_DASHBOARD.admin.questions },
            { title: 'Blog', path: PATH_DASHBOARD.admin.blog },
            { title: 'Giới thiệu bạn bè', path: PATH_DASHBOARD.admin.affiliate },
          ],
        },
      ],
    },
    {
      subheader: 'Hệ thống',
      items: [
        {
          title: 'Cài đặt',
          path: PATH_DASHBOARD.admin.settings,
          icon: ICONS.banking,
          children: [
            { title: 'Thông tin chung', path: PATH_DASHBOARD.admin.settings },
            { title: 'Tính năng của web', path: PATH_DASHBOARD.admin.settingsFeatures },
            { title: 'Live chat', path: PATH_DASHBOARD.admin.settingsLivechat },
            { title: 'Bảo mật & Nhắc nhở', path: PATH_DASHBOARD.admin.settingsSecurity },
            { title: 'Mã nguồn / Drive', path: PATH_DASHBOARD.admin.settingsSource },
          ],
        },
        {
          title: 'Tích hợp',
          path: PATH_DASHBOARD.admin.intPayment,
          icon: ICONS.external,
          children: [
            { title: 'Thanh toán (SePay)', path: PATH_DASHBOARD.admin.intPayment },
            { title: 'Email / SMTP', path: PATH_DASHBOARD.admin.intMail },
            { title: 'Telegram Bot', path: PATH_DASHBOARD.admin.intTelegram },
            { title: 'Đăng nhập OAuth', path: PATH_DASHBOARD.admin.intOauth },
            { title: 'Nguồn cung cấp', path: PATH_DASHBOARD.admin.intProviders },
            { title: 'AI', path: PATH_DASHBOARD.admin.intAi },
          ],
        },
        { title: 'Bảo trì', path: PATH_DASHBOARD.admin.maintenance, icon: ICONS.label },
        { title: 'Trang tuỳ chỉnh (404, chuyển hướng)', path: PATH_DASHBOARD.admin.customPages, icon: ICONS.label },
        { title: 'Về cửa hàng', path: '/', icon: ICONS.menuItem },
      ],
    },
  ];
}
