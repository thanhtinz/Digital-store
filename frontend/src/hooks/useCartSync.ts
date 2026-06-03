import { useEffect, useRef } from 'react';
// redux
import { useDispatch, useSelector } from '../redux/store';
import { getServerCart, syncServerCart } from '../redux/slices/product';
// auth
import { useAuthContext } from '../auth/useAuthContext';

// ----------------------------------------------------------------------
// Đồng bộ giỏ hàng redux <-> backend khi đã đăng nhập:
//  - Lúc đăng nhập: nạp giỏ từ server (nếu server có).
//  - Khi giỏ thay đổi: đẩy lên server (debounce nhẹ).
// ----------------------------------------------------------------------

export default function useCartSync() {
  const dispatch = useDispatch();
  const { isAuthenticated, isInitialized } = useAuthContext();
  const { checkout } = useSelector((state) => state.product);
  const cart = checkout?.cart;

  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nạp giỏ từ server 1 lần sau khi xác thực.
  useEffect(() => {
    if (isInitialized && isAuthenticated && !hydrated.current) {
      hydrated.current = true;
      dispatch(getServerCart());
    }
    if (!isAuthenticated) hydrated.current = false;
  }, [dispatch, isAuthenticated, isInitialized]);

  // Đẩy giỏ lên server khi thay đổi (sau khi đã nạp xong).
  useEffect(() => {
    if (!isAuthenticated || !hydrated.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dispatch(syncServerCart(cart || []));
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dispatch, cart, isAuthenticated]);
}
