import { useRouter } from 'next/router';
// @mui
import { useTheme } from '@mui/material/styles';
import { Badge, Box, BottomNavigation, BottomNavigationAction } from '@mui/material';
// utils
import { bgBlur } from '../../utils/cssStyles';
// redux
import { useSelector } from '../../redux/store';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// routes
import { PATH_DASHBOARD, PATH_AUTH } from '../../routes/paths';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------
// Thanh điều hướng dưới cùng (mobile) — kiểu app bán hàng (Shopee/Lazada):
// Trang chủ · Danh mục (mở menu đầy đủ) · Giỏ hàng · Đơn hàng · Tài khoản.
// Menu đầy đủ (danh mục, dịch vụ, hỗ trợ…) mở từ tab "Danh mục" -> drawer.
// Chỉ hiển thị trên mobile/tablet, ẩn trên desktop (đã có sidebar).
// ----------------------------------------------------------------------

const MENU = '__menu__';

type NavItem = {
  label: string;
  value: string;
  icon: string;
  auth?: boolean;
  cart?: boolean;
};

const ITEMS: NavItem[] = [
  { label: 'Trang chủ', value: '/', icon: 'solar:home-2-bold-duotone' },
  { label: 'Danh mục', value: MENU, icon: 'solar:widget-5-bold-duotone' },
  { label: 'Giỏ hàng', value: PATH_DASHBOARD.eCommerce.checkout, icon: 'solar:cart-3-bold-duotone', cart: true },
  { label: 'Đơn hàng', value: PATH_DASHBOARD.orders.root, icon: 'solar:bag-check-bold-duotone', auth: true },
  { label: 'Tài khoản', value: PATH_DASHBOARD.myAccount, icon: 'solar:user-bold-duotone', auth: true },
];

type Props = {
  // Mở menu đầy đủ (drawer NavVertical) khi bấm tab "Danh mục".
  onOpenMenu?: VoidFunction;
};

export default function MobileBottomNav({ onOpenMenu }: Props) {
  const theme = useTheme();
  const { pathname, push } = useRouter();
  const { isAuthenticated } = useAuthContext();

  const { checkout } = useSelector((state) => state.product);
  const cartCount = checkout?.cart?.length || 0;

  // Khớp tab đang mở: trang chủ khớp tuyệt đối, còn lại khớp theo tiền tố.
  // Tab "Danh mục" là hành động (mở menu) nên không bao giờ ở trạng thái chọn.
  const current =
    ITEMS.find((it) =>
      it.value === MENU ? false : it.value === '/' ? pathname === '/' : pathname.startsWith(it.value)
    )?.value || false;

  const handleChange = (_e: React.SyntheticEvent, value: string) => {
    if (value === MENU) {
      onOpenMenu?.();
      return;
    }
    const item = ITEMS.find((it) => it.value === value);
    // Mục cần đăng nhập (đơn hàng, tài khoản) -> chuyển sang trang đăng nhập nếu chưa.
    if (item?.auth && !isAuthenticated) {
      push(PATH_AUTH.login);
      return;
    }
    push(value);
  };

  return (
    <Box
      sx={{
        display: { xs: 'block', lg: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: `solid 1px ${theme.palette.divider}`,
        pb: 'env(safe-area-inset-bottom)',
        ...bgBlur({ color: theme.palette.background.default }),
      }}
    >
      <BottomNavigation
        value={current}
        onChange={handleChange}
        showLabels
        sx={{ bgcolor: 'transparent', height: 60 }}
      >
        {ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.value}
            value={item.value}
            label={item.label}
            icon={
              item.cart ? (
                <Badge badgeContent={cartCount} color="error" max={99}>
                  <Iconify icon={item.icon} width={24} />
                </Badge>
              ) : (
                <Iconify icon={item.icon} width={24} />
              )
            }
            sx={{
              minWidth: 0,
              px: 0.5,
              '& .MuiBottomNavigationAction-label': {
                fontSize: 11,
                mt: 0.25,
                '&.Mui-selected': { fontSize: 11 },
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
