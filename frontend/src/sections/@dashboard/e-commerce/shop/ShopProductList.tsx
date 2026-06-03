// @mui
import { Box, BoxProps } from '@mui/material';
// @type
import { IProduct } from '../../../../@types/product';
// components
import EmptyContent from '../../../../components/empty-content';
import { SkeletonProductItem } from '../../../../components/skeleton';
//
import ShopProductCard from './ShopProductCard';

// ----------------------------------------------------------------------

interface Props extends BoxProps {
  products: IProduct[];
  loading: boolean;
}

export default function ShopProductList({ products, loading, ...other }: Props) {
  if (!loading && !products.length) {
    return (
      <EmptyContent
        title="Không tìm thấy sản phẩm"
        description="Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác."
        img="/assets/illustrations/illustration_empty_content.svg"
        sx={{ py: 10 }}
      />
    );
  }

  return (
    <Box
      gap={3}
      display="grid"
      gridTemplateColumns={{
        xs: 'repeat(2, 1fr)',
        sm: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)',
        lg: 'repeat(4, 1fr)',
      }}
      {...other}
    >
      {(loading ? [...Array(12)] : products).map((product, index) =>
        product ? (
          <ShopProductCard key={product.id} product={product} />
        ) : (
          <SkeletonProductItem key={index} />
        )
      )}
    </Box>
  );
}
