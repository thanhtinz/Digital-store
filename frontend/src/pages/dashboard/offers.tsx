import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
// @mui
import { Container, Typography } from '@mui/material';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// utils
import axiosInstance from '../../utils/axios';
// @types
import { IProduct } from '../../@types/product';
// sections
import { ShopProductList } from '../../sections/@dashboard/e-commerce/shop';

// ----------------------------------------------------------------------

OffersPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout disableGuard>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function OffersPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/products', { params: { featured: true, limit: 24 } })
      .then((res) => {
        if (alive) setProducts(res.data?.products || res.data?.items || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title> Ưu đãi | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>
          Ưu đãi & Khuyến mãi
        </Typography>
        <ShopProductList products={products} loading={loading} />
      </Container>
    </>
  );
}
