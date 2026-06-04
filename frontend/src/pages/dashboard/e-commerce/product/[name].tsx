import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { alpha } from '@mui/material/styles';
import { Box, Tab, Tabs, Card, Grid, Divider, Container, Typography, Stack } from '@mui/material';
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
import Image from '../../../../components/image';
import Label from '../../../../components/label';
import Iconify from '../../../../components/iconify';
import Markdown from '../../../../components/markdown';
import CustomBreadcrumbs from '../../../../components/custom-breadcrumbs';
import { useSettingsContext } from '../../../../components/settings';
import { SkeletonProductDetails } from '../../../../components/skeleton';
// sections
import {
  ProductDetailsSummary,
  ProductDetailsReview,
  ProductDetailsCarousel,
} from '../../../../sections/@dashboard/e-commerce/details';
import CartWidget from '../../../../sections/@dashboard/e-commerce/CartWidget';
import ProductGridSection from '../../../../sections/@dashboard/e-commerce/ProductGridSection';
// utils
import { addRecentProduct, getRecentProducts } from '../../../../utils/recentProducts';

// ----------------------------------------------------------------------

const SUMMARY = [
  {
    title: 'Giao tự động',
    description: 'Sản phẩm số được giao ngay sau khi thanh toán thành công.',
    icon: 'solar:bolt-bold',
  },
  {
    title: 'Bảo hành đổi mới',
    description: 'Hỗ trợ đổi/bảo hành theo chính sách của từng sản phẩm.',
    icon: 'solar:shield-check-bold',
  },
  {
    title: 'Hỗ trợ nhanh',
    description: 'Đội ngũ hỗ trợ phản hồi nhanh qua chat & ticket.',
    icon: 'solar:chat-round-dots-bold',
  },
];

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

        {product && (() => {
          const pType = (product as any).productType || 'premium';
          const isGame = pType === 'game';
          const isGiftcard = pType === 'giftcard';
          const topupType = (product as any).topupType;
          const serverRegion = (product as any).serverRegion;
          const cover = (product as any).cover || (product as any).imageUrl;

          // ── GAME / GIFTCARD: header riêng + cột đơn (theo thiết kế gốc) ──
          if (isGame || isGiftcard) {
            return (
              <>
                {isGiftcard ? (
                  <Card sx={{ p: 3, mb: 3, textAlign: 'center' }}>
                    <Label color="info" variant="filled" sx={{ mb: 1.5 }}>
                      GIFT CARD
                    </Label>
                    <Typography variant="h3">{product.name}</Typography>
                  </Card>
                ) : (
                  <Card sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                      <Image
                        src={cover}
                        alt={product.name}
                        sx={{
                          flexShrink: 0,
                          borderRadius: 2,
                          width: { xs: '100%', sm: 150 },
                          height: { xs: 200, sm: 150 },
                        }}
                      />
                      <Stack spacing={1.25}>
                        <Label variant="filled" color="warning" sx={{ mr: 'auto' }}>
                          <Iconify icon="solar:gamepad-bold" sx={{ mr: 0.5 }} /> TOP UP
                        </Label>
                        <Typography variant="h4">{product.name}</Typography>
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                          {topupType && (
                            <Label
                              variant="soft"
                              color="default"
                              startIcon={
                                <Iconify icon={topupType === 'uid' ? 'solar:user-id-bold' : 'solar:login-3-bold'} />
                              }
                            >
                              {topupType === 'uid' ? 'UID' : 'Đăng nhập'}
                            </Label>
                          )}
                          {serverRegion && (
                            <Label variant="soft" color="default">
                              {serverRegion === 'vietnam' ? '🇻🇳 Việt Nam' : '🌐 Quốc tế'}
                            </Label>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Card>
                )}

                <Card sx={{ p: { xs: 1, md: 2 } }}>
                  <ProductDetailsSummary
                    product={product}
                    cart={checkout.cart}
                    onAddCart={handleAddCart}
                    onGotoStep={handleGotoStep}
                    hideTitle
                  />
                </Card>
              </>
            );
          }

          // ── PREMIUM: bố cục 2 cột như cũ ──
          return (
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
          );
        })()}

        {product && (
          <>

            <Box
              gap={5}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                md: 'repeat(3, 1fr)',
              }}
              sx={{ my: 10 }}
            >
              {SUMMARY.map((item) => (
                <Box key={item.title} sx={{ textAlign: 'center' }}>
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      borderRadius: '50%',
                      color: 'primary.main',
                      bgcolor: (theme) => `${alpha(theme.palette.primary.main, 0.08)}`,
                    }}
                  >
                    <Iconify icon={item.icon} width={36} />
                  </Stack>

                  <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
                    {item.title}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary' }}>{item.description}</Typography>
                </Box>
              ))}
            </Box>

            <Card>
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
