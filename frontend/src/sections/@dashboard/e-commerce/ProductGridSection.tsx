// @mui
import { Box, Typography } from '@mui/material';
//
import ShopProductCard from './shop/ShopProductCard';

// ----------------------------------------------------------------------
// Khu hiển thị một danh sách sản phẩm (grid) kèm tiêu đề.
// Dùng cho "Sản phẩm liên quan" và "Đã xem gần đây".
// ----------------------------------------------------------------------

type Props = {
  title: string;
  products: any[];
  excludeSlug?: string;
};

export default function ProductGridSection({ title, products, excludeSlug }: Props) {
  const list = (products || []).filter((p) => p && p.slug && p.slug !== excludeSlug);
  if (!list.length) return null;

  return (
    <Box sx={{ mt: 8 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {title}
      </Typography>

      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
        }}
      >
        {list.slice(0, 8).map((p) => (
          <ShopProductCard key={p.id || p.slug} product={p} />
        ))}
      </Box>
    </Box>
  );
}
