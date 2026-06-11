import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Box, Tab, Tabs, Card, Grid, Divider, Container, Typography } from '@mui/material';
// redux
import { useDispatch, useSelector } from '../../../../redux/store';
import { getProduct, addToCart, gotoStep } from '../../../../redux/slices/product';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// locales
import { useLocales } from '../../../../locales';
// @types
import { ICheckoutCartItem } from '../../../../@types/product';
// layouts
import DashboardLayout from '../../../../layouts/dashboard';
// components
import Markdown from '../../../../components/markdown';
import CustomBreadcrumbs from '../../../../components/custom-breadcrumbs';
import { useSettingsContext } from '../../../../components/settings';
import { SkeletonProductDetails } from '../../../../components/skeleton';
// sections
import {
  ProductDetailsSummary,
  ProductDetailsReview,
  ProductDetailsCarousel,
  TopupGiftcardDetailView,
  SourceDetailView,
} from '../../../../sections/@dashboard/e-commerce/details';
import CartWidget from '../../../../sections/@dashboard/e-commerce/CartWidget';
import ProductGridSection from '../../../../sections/@dashboard/e-commerce/ProductGridSection';
// utils
import { addRecentProduct, getRecentProducts } from '../../../../utils/recentProducts';

// ----------------------------------------------------------------------

EcommerceProductDetailsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function EcommerceProductDetailsPage() {
  const { themeStretch } = useSettingsContext();
  const { translate } = useLocales();
  const tp = (k: string) => `${translate(`product_page.${k}`)}`;

  const {
    query: { name },
  } = useRouter();

  const dispatch = useDispatch();

  const { product, isLoading, checkout } = useSelector((state) => state.product);

  // Sản phẩm topup (game) / giftcard dùng TRANG CHI TIẾT RIÊNG (không phải premium).
  const pType = (product as any)?.productType || 'premium';
  const isTopupOrGift = pType === 'game' || pType === 'giftcard';
  const isSource = pType === 'source';

  const [currentTab, setCurrentTab] = useState('description');
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (name) {
      dispatch(getProduct(name as string));
    }
    // Lấy danh sách đã xem TRƯỚC khi thêm sản phẩm hiện tại.
    setRecent(getRecentProducts());
  }, [dispatch, name]);

  // Ghi nhận sản phẩm hiện tại vào "đã xem gần đây" sau khi tải xong.
  useEffect(() => {
    if ((product as any)?.slug) addRecentProduct(product);
  }, [product]);

  const handleAddCart = (newProduct: ICheckoutCartItem) => {
    dispatch(addToCart(newProduct));
  };

  const handleGotoStep = (step: number) => {
    dispatch(gotoStep(step));
  };

  const TABS = [
    {
      value: 'description',
      label: 'Mô tả',
      component: product ? <Markdown children={product?.description} /> : null,
    },
    {
      value: 'reviews',
      label: `Đánh giá (${product ? product.reviews.length : 0})`,
      component: product ? <ProductDetailsReview product={product} /> : null,
    },
  ];

  return (
    <>
      <Head>
        <title>{`${product?.name || 'Sản phẩm'} | Digital Store`}</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'} sx={{ pt: { xs: 2, md: 3 } }}>
        <CustomBreadcrumbs
          links={[
            { name: tp('bc_home'), href: '/' },
            { name: tp('bc_shop'), href: PATH_DASHBOARD.eCommerce.shop },
            { name: product?.name || '' },
          ]}
        />

        <CartWidget totalItems={checkout.totalItems} />

        {/* ── GAME / GIFTCARD: trang chi tiết RIÊNG ── */}
        {product && isTopupOrGift && (
          <>
            <TopupGiftcardDetailView
              product={product}
              cart={checkout.cart}
              onAddCart={handleAddCart}
              onGotoStep={handleGotoStep}
            />

            <Card sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ p: 3, pb: 1 }}>
                {`Đánh giá (${product.reviews?.length || 0})`}
              </Typography>
              <Divider />
              <ProductDetailsReview product={product} />
            </Card>

            <ProductGridSection
              title={tp('related_title')}
              products={(product as any).related || []}
              excludeSlug={(product as any).slug}
            />

            <ProductGridSection
              title={tp('recent_title')}
              products={recent}
              excludeSlug={(product as any).slug}
            />
          </>
        )}

        {/* ── MÃ NGUỒN / THEME: trang chi tiết riêng ── */}
        {product && isSource && (
          <>
            <SourceDetailView
              product={product}
              cart={checkout.cart}
              onAddCart={handleAddCart}
              onGotoStep={handleGotoStep}
            />

            <ProductGridSection
              title={tp('related_title')}
              products={(product as any).related || []}
              excludeSlug={(product as any).slug}
            />

            <ProductGridSection
              title={tp('recent_title')}
              products={recent}
              excludeSlug={(product as any).slug}
            />
          </>
        )}

        {/* ── PREMIUM: bố cục cũ ── */}
        {product && !isTopupOrGift && !isSource && (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={7}>
                <ProductDetailsCarousel product={product} />
              </Grid>

              <Grid item xs={12} md={6} lg={5}>
                <ProductDetailsSummary
                  product={product}
                  cart={checkout.cart}
                  onAddCart={handleAddCart}
                  onGotoStep={handleGotoStep}
                />
              </Grid>
            </Grid>

            <Card sx={{ mt: 10 }}>
              <Tabs
                value={currentTab}
                onChange={(event, newValue) => setCurrentTab(newValue)}
                sx={{ px: 3, bgcolor: 'background.neutral' }}
              >
                {TABS.map((tab) => (
                  <Tab key={tab.value} value={tab.value} label={tab.label} />
                ))}
              </Tabs>

              <Divider />

              {TABS.map(
                (tab) =>
                  tab.value === currentTab && (
                    <Box
                      key={tab.value}
                      sx={{
                        ...(currentTab === 'description' && {
                          p: 3,
                        }),
                      }}
                    >
                      {tab.component}
                    </Box>
                  )
              )}
            </Card>

            <ProductGridSection
              title={tp('related_title')}
              products={(product as any).related || []}
              excludeSlug={(product as any).slug}
            />

            <ProductGridSection
              title={tp('recent_title')}
              products={recent}
              excludeSlug={(product as any).slug}
            />
          </>
        )}

        {isLoading && <SkeletonProductDetails />}
      </Container>
    </>
  );
}
