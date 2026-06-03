// next
import { useRouter } from 'next/router';
// @mui
import { Badge } from '@mui/material';
// redux
import { useSelector } from '../../../redux/store';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// components
import Iconify from '../../../components/iconify';
import { IconButtonAnimate } from '../../../components/animate';

// ----------------------------------------------------------------------
// Nút giỏ hàng trên header — badge số sản phẩm, bấm sang trang thanh toán.

export default function CartButton() {
  const { push } = useRouter();
  const { checkout } = useSelector((state) => state.product);
  const count = checkout?.cart?.length || 0;

  return (
    <IconButtonAnimate
      onClick={() => push(PATH_DASHBOARD.eCommerce.checkout)}
      sx={{ width: 40, height: 40, color: 'text.primary' }}
    >
      <Badge badgeContent={count} color="error" max={99}>
        <Iconify icon="solar:cart-3-bold-duotone" width={24} />
      </Badge>
    </IconButtonAnimate>
  );
}
