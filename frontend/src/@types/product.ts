// ----------------------------------------------------------------------

export type IProductReview = {
  id: string;
  name: string;
  avatarUrl: string;
  comment: string;
  rating: number;
  isPurchased: boolean;
  helpful: number;
  images?: string[];
  adminReply?: string | null;
  adminReplyAt?: Date | string | number | null;
  postedAt: Date | string | number;
};

export type IProduct = {
  id: string;
  cover: string;
  images: string[];
  name: string;
  price: number;
  code: string;
  sku: string;
  tags: string[];
  priceSale: number | null;
  totalRating: number;
  totalReview: number;
  ratings: {
    name: string;
    starCount: number;
    reviewCount: number;
  }[];
  reviews: IProductReview[];
  colors: string[];
  status: string;
  inventoryType: string;
  sizes: string[];
  available: number;
  description: string;
  sold: number;
  createdAt: Date | string | number;
  category: string;
  gender: string;
  // Digital Store: danh sách gói (giữ nguyên từ backend để trang chi tiết render & tạo đơn)
  packages?: IProductPackage[];
};

export type IProductPackageField = {
  id?: number;
  fieldName: string;
  fieldType?: string; // text | textarea | select | number | email
  isRequired?: boolean;
  options?: string | null;
};

export type IProductPackage = {
  id: string | number;
  name: string;
  price: number;
  originalPrice?: number | null;
  stock?: number;
  isActive?: boolean;
  description?: string;
  fields?: IProductPackageField[];
};

export type IProductFilter = {
  gender: string[];
  category: string;
  productType: string;
  colors: string[];
  priceRange: number[];
  rating: string;
  sortBy: string;
};

// ----------------------------------------------------------------------

export type ICheckoutCartItem = {
  id: string;
  name: string;
  cover: string;
  available: number;
  price: number;
  colors: string[];
  size: string;
  quantity: number;
  subtotal: number;
  // Digital Store: gói sản phẩm thực tế dùng để tạo đơn hàng
  packageId?: string | number;
  packageName?: string;
  // Giá trị các trường tùy chỉnh người dùng nhập (theo gói)
  customFields?: Record<string, string>;
};

export type ICheckoutBillingAddress = {
  receiver: string;
  phoneNumber: string;
  fullAddress: string;
  addressType: string;
  isDefault: boolean;
};

export type ICheckoutDeliveryOption = {
  value: number;
  title: string;
  description: string;
};

export type ICheckoutPaymentOption = {
  value: string;
  title: string;
  description: string;
  icons: string[];
};

export type ICheckoutCardOption = {
  value: string;
  label: string;
};

// ----------------------------------------------------------------------

export type IProductCheckoutState = {
  activeStep: number;
  cart: ICheckoutCartItem[];
  subtotal: number;
  total: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  billing: ICheckoutBillingAddress | null;
  totalItems: number;
};

export type IProductState = {
  isLoading: boolean;
  error: Error | string | null;
  products: IProduct[];
  product: IProduct | null;
  checkout: IProductCheckoutState;
};
