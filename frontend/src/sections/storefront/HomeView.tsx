import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import {
  Box,
  Button,
  Card,
  Container,
  Link,
  Stack,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// @types
import { IProduct } from '../../@types/product';
// components
import { paramCase } from 'change-case';
import Image from '../../components/image';
import Iconify from '../../components/iconify';
// sections
import { ShopProductList } from '../@dashboard/e-commerce/shop';

// ----------------------------------------------------------------------

type FlashSale = {
  id: number;
  product_name?: string;
  package_name?: string;
  sale_price?: number;
  original_price?: number;
  ends_at?: string;
};

type Banner = {
  id: number;
  imageUrl?: string;
  image_url?: string;
  linkUrl?: string;
  link_url?: string;
  bannerType?: string;
  banner_type?: string;
};

type BlogPost = {
  id: string;
  title: string;
  cover: string;
  createdAt: string;
};

// ----------------------------------------------------------------------

function SectionHead({ title, viewAllHref }: { title: string; viewAllHref?: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 3, mt: 6 }}
    >
      <Typography variant="h4">{title}</Typography>
      {viewAllHref && (
        <Link
          component={NextLink}
          href={viewAllHref}
          variant="subtitle2"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          Xem tất cả
          <Iconify icon="eva:arrow-ios-forward-fill" />
        </Link>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export default function HomeView() {
  const [featured, setFeatured] = useState<IProduct[]>([]);
  const [newest, setNewest] = useState<IProduct[]>([]);
  const [flash, setFlash] = useState<FlashSale[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const [trendingRes, newestRes, flashRes, bannerRes, blogRes] = await Promise.allSettled([
        axiosInstance.get('/api/products/trending', { params: { limit: 8 } }),
        axiosInstance.get('/api/products', { params: { limit: 8, sort: 'newest' } }),
        axiosInstance.get('/api/flash-sales/active'),
        axiosInstance.get('/api/banners'),
        axiosInstance.get('/api/blog/posts', { params: { limit: 4 } }),
      ]);

      if (!alive) return;

      if (trendingRes.status === 'fulfilled') {
        const d = trendingRes.value.data;
        setFeatured(d?.items || d?.products || []);
      }
      if (newestRes.status === 'fulfilled') {
        const d = newestRes.value.data;
        setNewest(d?.products || d?.items || []);
      }
      if (flashRes.status === 'fulfilled' && Array.isArray(flashRes.value.data)) {
        setFlash(flashRes.value.data);
      }
      if (bannerRes.status === 'fulfilled' && Array.isArray(bannerRes.value.data)) {
        const banners: Banner[] = bannerRes.value.data;
        const hero =
          banners.find((b) => (b.bannerType || b.banner_type) === 'hero') || banners[0] || null;
        setBanner(hero);
      }
      if (blogRes.status === 'fulfilled') {
        setPosts(blogRes.value.data?.posts || []);
      }
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const bannerImg = banner?.imageUrl || banner?.image_url;
  const bannerLink = banner?.linkUrl || banner?.link_url;

  return (
    <Container sx={{ pb: 4 }}>
      {/* HERO */}
      {bannerImg ? (
        <Link component={NextLink} href={bannerLink || PATH_DASHBOARD.eCommerce.shop}>
          <Image
            src={bannerImg}
            alt="banner"
            ratio="21/9"
            sx={{ borderRadius: 2, cursor: 'pointer' }}
          />
        </Link>
      ) : (
        <Card
          sx={{
            p: { xs: 4, md: 8 },
            borderRadius: 2,
            color: 'common.white',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          }}
        >
          <Stack spacing={2} alignItems="flex-start" sx={{ maxWidth: 560 }}>
            <Typography variant="h2">Sản phẩm số, giao hàng tự động</Typography>
            <Typography sx={{ opacity: 0.9 }}>
              Mua nhanh, nhận ngay. Thanh toán an toàn, hỗ trợ tận tâm.
            </Typography>
            <Button
              component={NextLink}
              href={PATH_DASHBOARD.eCommerce.shop}
              size="large"
              variant="contained"
              color="inherit"
              sx={{ color: 'primary.main' }}
            >
              Mua sắm ngay
            </Button>
          </Stack>
        </Card>
      )}

      {/* FLASH SALE */}
      {flash.length > 0 && (
        <>
          <SectionHead title="⚡ Flash Sale" viewAllHref={PATH_DASHBOARD.eCommerce.shop} />
          <Box
            gap={2}
            display="grid"
            gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }}
          >
            {flash.slice(0, 8).map((f) => (
              <Card key={f.id} sx={{ p: 2 }}>
                <Typography variant="subtitle2" noWrap title={f.product_name}>
                  {f.product_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                  {f.package_name}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                  <Typography variant="subtitle1" color="error.main">
                    {fCurrency(f.sale_price || 0)}
                  </Typography>
                  {!!f.original_price && f.original_price > (f.sale_price || 0) && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', textDecoration: 'line-through' }}
                    >
                      {fCurrency(f.original_price)}
                    </Typography>
                  )}
                </Stack>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* SẢN PHẨM NỔI BẬT */}
      {(loading || featured.length > 0) && (
        <>
          <SectionHead title="★ Sản phẩm nổi bật" viewAllHref={PATH_DASHBOARD.eCommerce.shop} />
          <ShopProductList products={featured} loading={loading && featured.length === 0} />
        </>
      )}

      {/* SẢN PHẨM MỚI */}
      {newest.length > 0 && (
        <>
          <SectionHead title="Sản phẩm mới" viewAllHref={PATH_DASHBOARD.eCommerce.shop} />
          <ShopProductList products={newest} loading={false} />
        </>
      )}

      {/* BLOG */}
      {posts.length > 0 && (
        <>
          <SectionHead title="Góc chia sẻ" viewAllHref={PATH_DASHBOARD.blog.posts} />
          <Box
            gap={3}
            display="grid"
            gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
          >
            {posts.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                component={NextLink}
                href={PATH_DASHBOARD.blog.view(paramCase(p.title))}
                color="inherit"
                underline="none"
              >
                <Card>
                  <Image src={p.cover} alt={p.title} ratio="4/3" />
                  <Typography variant="subtitle2" sx={{ p: 2 }} noWrap title={p.title}>
                    {p.title}
                  </Typography>
                </Card>
              </Link>
            ))}
          </Box>
        </>
      )}
    </Container>
  );
}
