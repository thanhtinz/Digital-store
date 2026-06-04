import sum from 'lodash/sum';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import { IProductState, ICheckoutCartItem } from '../../@types/product';

// ----------------------------------------------------------------------

const initialState: IProductState = {
  isLoading: false,
  error: null,
  products: [],
  product: null,
  checkout: {
    activeStep: 0,
    cart: [],
    subtotal: 0,
    total: 0,
    discount: 0,
    couponCode: '',
    shipping: 0,
    billing: null,
    totalItems: 0,
  },
};

const slice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    // START LOADING
    startLoading(state) {
      state.isLoading = true;
    },

    // HAS ERROR
    hasError(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // GET PRODUCTS
    getProductsSuccess(state, action) {
      state.isLoading = false;
      state.products = action.payload;
    },

    // GET PRODUCT
    getProductSuccess(state, action) {
      state.isLoading = false;
      state.product = action.payload;
    },

    // CHECKOUT
    getCart(state, action) {
      const cart: ICheckoutCartItem[] = action.payload;

      const totalItems = sum(cart.map((product) => product.quantity));
      const subtotal = sum(cart.map((product) => product.price * product.quantity));
      state.checkout.cart = cart;
      state.checkout.discount = state.checkout.discount || 0;
      state.checkout.shipping = state.checkout.shipping || 0;
      state.checkout.billing = state.checkout.billing || null;
      state.checkout.subtotal = subtotal;
      state.checkout.total = subtotal - state.checkout.discount;
      state.checkout.totalItems = totalItems;
    },

    addToCart(state, action) {
      const newProduct = action.payload;
      const isEmptyCart = !state.checkout.cart.length;

      if (isEmptyCart) {
        state.checkout.cart = [...state.checkout.cart, newProduct];
      } else {
        state.checkout.cart = state.checkout.cart.map((product) => {
          const isExisted = product.id === newProduct.id;

          if (isExisted) {
            return {
              ...product,
              colors: uniq([...product.colors, ...newProduct.colors]),
              quantity: product.quantity + 1,
            };
          }

          return product;
        });
      }
      state.checkout.cart = uniqBy([...state.checkout.cart, newProduct], 'id');
      state.checkout.totalItems = sum(state.checkout.cart.map((product) => product.quantity));
    },

    deleteCart(state, action) {
      const updateCart = state.checkout.cart.filter((product) => product.id !== action.payload);

      state.checkout.cart = updateCart;
    },

    resetCart(state) {
      state.checkout.cart = [];
      state.checkout.billing = null;
      state.checkout.activeStep = 0;
      state.checkout.total = 0;
      state.checkout.subtotal = 0;
      state.checkout.discount = 0;
      state.checkout.couponCode = '';
      state.checkout.shipping = 0;
      state.checkout.totalItems = 0;
    },

    backStep(state) {
      state.checkout.activeStep -= 1;
    },

    nextStep(state) {
      state.checkout.activeStep += 1;
    },

    gotoStep(state, action) {
      const step = action.payload;
      state.checkout.activeStep = step;
    },

    increaseQuantity(state, action) {
      const productId = action.payload;

      const updateCart = state.checkout.cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            quantity: product.quantity + 1,
          };
        }
        return product;
      });

      state.checkout.cart = updateCart;
    },

    decreaseQuantity(state, action) {
      const productId = action.payload;
      const updateCart = state.checkout.cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            quantity: product.quantity - 1,
          };
        }
        return product;
      });

      state.checkout.cart = updateCart;
    },

    createBilling(state, action) {
      state.checkout.billing = action.payload;
    },

    applyDiscount(state, action) {
      // payload: number (back-compat) hoặc { discount, code }
      const payload = action.payload;
      const discount = typeof payload === 'number' ? payload : payload?.discount || 0;
      const code = typeof payload === 'number' ? '' : payload?.code || '';
      state.checkout.discount = discount;
      state.checkout.couponCode = discount > 0 ? code : '';
      state.checkout.total = state.checkout.subtotal - discount;
    },

    applyShipping(state, action) {
      const shipping = action.payload;
      state.checkout.shipping = shipping;
      state.checkout.total = state.checkout.subtotal - state.checkout.discount + shipping;
    },
  },
});

// Reducer
export default slice.reducer;

// Actions
export const {
  getCart,
  addToCart,
  resetCart,
  gotoStep,
  backStep,
  nextStep,
  deleteCart,
  createBilling,
  applyShipping,
  applyDiscount,
  increaseQuantity,
  decreaseQuantity,
} = slice.actions;

// ----------------------------------------------------------------------

export function getProducts(params?: { category?: string; type?: string; limit?: number }) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/products', {
        // limit cao để trang "tất cả sản phẩm" (gian hàng) lấy hết.
        params: { limit: 500, ...(params || {}) },
      });
      // Backend trả { total, page, items: [...] }. Hỗ trợ cả 'products' để an toàn.
      dispatch(slice.actions.getProductsSuccess(response.data.items || response.data.products || []));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

// Chuẩn hoá đánh giá từ backend (raw Review records) sang shape mà component cần.
function normalizeProduct(raw: any) {
  if (!raw) return raw;
  const rawReviews: any[] = Array.isArray(raw.reviews) ? raw.reviews : [];
  const reviews = rawReviews.map((r: any) => ({
    id: String(r.id),
    name: r.userName || r.user_name || 'Khách',
    avatarUrl: r.avatarUrl || '',
    comment: r.comment || '',
    rating: r.rating || 0,
    isPurchased: r.isPurchased ?? r.isVerified ?? false,
    helpful: r.helpfulCount ?? r.helpful_count ?? r.helpful ?? 0,
    images: Array.isArray(r.images) ? r.images : [],
    adminReply: r.adminReply ?? r.admin_reply ?? null,
    adminReplyAt: r.adminReplyAt ?? r.admin_reply_at ?? null,
    postedAt: r.createdAt || r.created_at || r.postedAt || new Date().toISOString(),
  }));
  // Phân bố sao 1..5: ưu tiên dữ liệu tổng hợp từ backend (toàn bộ review),
  // fallback đếm trên các review đính kèm nếu backend chưa trả.
  const dist: any[] = Array.isArray(raw.ratingDistribution) ? raw.ratingDistribution : [];
  const ratings = [1, 2, 3, 4, 5].map((star) => {
    const count = dist.length
      ? dist.find((d: any) => d.star === star)?.count || 0
      : rawReviews.filter((r: any) => Math.round(r.rating || 0) === star).length;
    return { name: `${star} Star`, starCount: count, reviewCount: count };
  });
  return {
    ...raw,
    reviews,
    ratings,
    totalRating: raw.rating ?? 0,
    totalReview: raw.ratingCount ?? reviews.length,
    // Các field template cần để không crash.
    colors: raw.colors || [],
    sizes: raw.sizes || [],
    tags: raw.tags || [],
  };
}

export function getProduct(name: string) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/products/${name}`);
      const raw = response.data.product || response.data;
      dispatch(slice.actions.getProductSuccess(normalizeProduct(raw)));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------
// Đồng bộ giỏ hàng với backend (đa thiết bị). Chỉ chạy khi đã đăng nhập.

export function getServerCart() {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.get('/api/cart');
      const items = (res.data?.items || []).map((it: any) => ({
        colors: [],
        size: '',
        ...it,
      }));
      if (items.length) dispatch(slice.actions.getCart(items));
    } catch (error) {
      /* bỏ qua nếu chưa đăng nhập */
    }
  };
}

export function syncServerCart(cart: any[]) {
  return async () => {
    try {
      await axios.post('/api/cart/sync', {
        items: (cart || [])
          .map((c) => ({
            package_id: Number(c.packageId),
            quantity: c.quantity || 1,
            custom_fields: c.customFields || undefined,
          }))
          .filter((x) => Number.isFinite(x.package_id) && x.package_id > 0),
      });
    } catch (error) {
      /* bỏ qua */
    }
  };
}
