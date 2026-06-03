import { useState, useEffect } from 'react';
// next
import { useRouter } from 'next/router';
import orderBy from 'lodash/orderBy';
// form
import { useForm } from 'react-hook-form';
// next
import Head from 'next/head';
// @mui
import { Container, Typography, Stack } from '@mui/material';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getProducts } from '../../../redux/slices/product';
// utils
import axiosInstance from '../../../utils/axios';
// @types
import { IProduct, IProductFilter } from '../../../@types/product';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// locales
import { useLocales } from '../../../locales';
// components
import FormProvider from '../../../components/hook-form';
import { useSettingsContext } from '../../../components/settings';
// sections
import {
  ShopProductSort,
  ShopProductList,
  ShopFilterDrawer,
  ShopProductSearch,
} from '../../../sections/@dashboard/e-commerce/shop';

// ----------------------------------------------------------------------

EcommerceShopPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function EcommerceShopPage() {
  const { themeStretch } = useSettingsContext();

  const { translate } = useLocales();

  const dispatch = useDispatch();

  const { query } = useRouter();

  const { products, isLoading } = useSelector((state) => state.product);

  const [openFilter, setOpenFilter] = useState(false);

  // Danh mục thật cho bộ lọc (thay cho các filter quần áo của template).
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  useEffect(() => {
    axiosInstance
      .get('/api/categories')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setCategories(list.map((c: any) => ({ label: c.name, value: c.slug })));
      })
      .catch(() => {});
  }, []);

  const defaultValues = {
    gender: [],
    category: 'All',
    colors: [],
    priceRange: [0, 200],
    rating: '',
    sortBy: 'featured',
  };

  const methods = useForm<IProductFilter>({
    defaultValues,
  });

  const {
    reset,
    watch,
    formState: { dirtyFields },
  } = methods;

  const isDefault = !dirtyFields.category;

  const values = watch();

  const dataFiltered = applyFilter(products, values);

  // Lọc theo danh mục/loại từ URL (sidebar storefront trỏ ?category=slug / ?type=).
  const categorySlug = (query.category as string) || undefined;
  const typeFilter = (query.type as string) || undefined;

  useEffect(() => {
    dispatch(getProducts({ category: categorySlug, type: typeFilter }));
  }, [dispatch, categorySlug, typeFilter]);

  const handleResetFilter = () => {
    reset();
  };

  const handleOpenFilter = () => {
    setOpenFilter(true);
  };

  const handleCloseFilter = () => {
    setOpenFilter(false);
  };

  return (
    <>
      <Head>
        <title> {`${translate('shop_page.all_products')}`} | Digital Store</title>
      </Head>

      <FormProvider methods={methods}>
        <Container maxWidth={themeStretch ? false : 'lg'}>
          <Typography variant="h4" sx={{ my: 3 }}>
            {`${translate('shop_page.all_products')}`}
          </Typography>

          <Stack
            spacing={2}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <ShopProductSearch />

            <Stack direction="row" spacing={1} flexShrink={0} sx={{ my: 1 }}>
              <ShopFilterDrawer
                categories={categories}
                isDefault={isDefault}
                open={openFilter}
                onOpen={handleOpenFilter}
                onClose={handleCloseFilter}
                onResetFilter={handleResetFilter}
              />

              <ShopProductSort />
            </Stack>
          </Stack>

          <Stack sx={{ mb: 3 }}>
            {!isDefault && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }} gutterBottom>
                <strong>{dataFiltered.length}</strong>
                &nbsp;{`${translate('shop_page.products_found')}`}
              </Typography>
            )}
          </Stack>

          <ShopProductList products={dataFiltered} loading={isLoading} />
        </Container>
      </FormProvider>
    </>
  );
}

// ----------------------------------------------------------------------

// Giá hiệu lực của sản phẩm = giá thấp nhất trong các gói.
function effPrice(product: any): number {
  const prices = (product.packages || []).map((p: any) => p.price).filter((n: number) => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function applyFilter(products: IProduct[], filters: IProductFilter) {
  const { category, sortBy } = filters;

  // SORT BY
  if (sortBy === 'featured') {
    products = orderBy(products, [(p: any) => p.isFeatured], ['desc']);
  }
  if (sortBy === 'newest') {
    products = orderBy(products, ['createdAt'], ['desc']);
  }
  if (sortBy === 'priceDesc') {
    products = orderBy(products, [(p: any) => effPrice(p)], ['desc']);
  }
  if (sortBy === 'priceAsc') {
    products = orderBy(products, [(p: any) => effPrice(p)], ['asc']);
  }

  // FILTER theo danh mục (so theo slug của danh mục thật)
  if (category && category !== 'All') {
    products = products.filter((product: any) => product.category?.slug === category);
  }

  return products;
}
