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
// locales
import { useLocales } from '../../locales';
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

function SectionHead({
  title,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  viewAllHref?: string;
  viewAllLabel: string;
}) {
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
          {viewAllLabel}
          <Iconify icon="eva:arrow-ios-forward-fill" />
        </Link>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export default function HomeView() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`home.${k}`)}`;

  const [featured, setFeatured] = useState<IProduct[]>([]);
  const [newest, setNewest] = useState<IProduct[]>([]);
  const [topup, setTopup] = useState<IProduct[]>([]);
  const [giftcard, setGiftcard] = useState<IProduct[]>([]);
  const [smm, setSmm] = useState<any[]>([]);
  const [flash, setFlash] = useState<FlashSale[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const [trendingRes, newestRes, topupRes, giftcardRes, smmRes, flashRes, bannerRes, blogRes] =
        await Promise.allSettled([
          axiosInstance.get('/api/products', { params: { featured: 'true', limit: 8 } }),
          axiosInstance.get('/api/products', { params: { limit: 8, sort: 'newest' } }),
          axiosInstance.get('/api/products', { params: { type: 'game', limit: 12 } }),
          axiosInstance.get('/api/products', { params: { type: 'giftcard', limit: 12 } }),
          axiosInstance.get('/api/smm/catalog'),
          axiosInstance.get('/api/flash-sales/active'),
          axiosInstance.get('/api/banners'),
          axiosInstance.get('/api/blog/posts', { params: { limit: 4 } }),
        ]);

      if (!alive) return;

      const pickList = (r: PromiseSettledResult<any>): IProduct[] =>
        r.status === 'fulfilled' ? r.value.data?.products || r.value.data?.items || [] : [];

      setTopup(pickList(topupRes));
      setGiftcard(pickList(giftcardRes));
      setSmm(smmRes.status === 'fulfilled' && Array.isArray(smmRes.value.data) ? smmRes.value.data : []);

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
            <Typography variant="h2">{t('hero_title')}</Typography>
            <Typography sx={{ opacity: 0.9 }}>{t('hero_desc')}</Typography>
            <Button
              component={NextLink}
              href={PATH_DASHBOARD.eCommerce.shop}
              size="large"
              variant="contained"
              color="inherit"
              sx={{ color: 'primary.main' }}
            >
              {t('shop_now')}
            </Button>
          </Stack>
        </Card>
      )}

      {/* FLASH SALE */}
      {flash.length > 0 && (
        <>
          <SectionHead
            title={t('flash_sale')}
            viewAllHref={PATH_DASHBOARD.eCommerce.shop}
            viewAllLabel={t('view_all')}
          />
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
          <SectionHead
            title={t('featured')}
            viewAllHref={PATH_DASHBOARD.eCommerce.shop}
            viewAllLabel={t('view_all')}
          />
          <ShopProductList products={featured} loading={loading && featured.length === 0} />
        </>
      )}

      {/* SẢN PHẨM MỚI */}
      {newest.length > 0 && (
        <>
          <SectionHead
            title={t('newest')}
            viewAllHref={PATH_DASHBOARD.eCommerce.shop}
            viewAllLabel={t('view_all')}
          />
          <ShopProductList products={newest} loading={false} />
        </>
      )}

      {/* TOPUP GAME */}
      {topup.length > 0 && (
        <>
          <SectionHead
            title={`${translate('nav.topup_game')}`}
            viewAllHref={`${PATH_DASHBOARD.eCommerce.shop}?type=game`}
            viewAllLabel={t('view_all')}
          />
          <ShopProductList products={topup} loading={false} />
        </>
      )}

      {/* GIFT CARD */}
      {giftcard.length > 0 && (
        <>
          <SectionHead
            title={`${translate('nav.giftcard')}`}
            viewAllHref={`${PATH_DASHBOARD.eCommerce.shop}?type=giftcard`}
            viewAllLabel={t('view_all')}
          />
          <ShopProductList products={giftcard} loading={false} />
        </>
      )}

      {/* SMM — TĂNG TƯƠNG TÁC */}
      {smm.length > 0 && (
        <>
          <SectionHead
            title="Tăng tương tác"
            viewAllHref={PATH_DASHBOARD.smm.order}
            viewAllLabel={t('view_all')}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: -2, mb: 2 }}>
            Tăng like, follow, view, comment cho mọi nền tảng mạng xã hội — giá rẻ, giao nhanh.
          </Typography>
          <Box
            gap={2}
            display="grid"
            gridTemplateColumns={{
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
            }}
          >
            {smm.map((p: any) => {
              const catCount = (p.categories || []).length;
              return (
                <Link
                  key={p.id || p.slug}
                  component={NextLink}
                  href={`${PATH_DASHBOARD.smm.order}?platform=${encodeURIComponent(p.slug || '')}`}
                  color="inherit"
                  underline="none"
                >
                  <Card
                    sx={{
                      p: 2,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      transition: (theme) => theme.transitions.create('box-shadow'),
                      '&:hover': { boxShadow: (theme) => theme.customShadows.z16 },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                        bgcolor: 'background.neutral',
                        color: 'primary.main',
                      }}
                    >
                      {p.icon_url ? (
                        <Image src={p.icon_url} alt={p.name} sx={{ width: 48, height: 48 }} />
                      ) : (
                        <Iconify icon="solar:share-bold" width={26} />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap title={p.name}>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {catCount} danh mục
                      </Typography>
                    </Box>
                  </Card>
                </Link>
              );
            })}
          </Box>
        </>
      )}

      {/* BLOG */}
      {posts.length > 0 && (
        <>
          <SectionHead
            title={t('blog')}
            viewAllHref={PATH_DASHBOARD.blog.posts}
            viewAllLabel={t('view_all')}
          />
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
