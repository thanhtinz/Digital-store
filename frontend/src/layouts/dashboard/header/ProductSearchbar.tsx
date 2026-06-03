import { useState, useRef } from 'react';
// next
import { useRouter } from 'next/router';
// @mui
import { Link, Typography, Autocomplete, InputAdornment } from '@mui/material';
// utils
import axios from '../../../utils/axios';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// components
import Image from '../../../components/image';
import Iconify from '../../../components/iconify';
import { CustomTextField } from '../../../components/custom-input';
import SearchNotFound from '../../../components/search-not-found';

// ----------------------------------------------------------------------
// Ô tìm kiếm sản phẩm trên header — nối backend /api/products/search.

type ResultItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  packages?: { price: number }[];
};

export default function ProductSearchbar() {
  const { push } = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeSearch = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value) {
      setResults([]);
      return;
    }
    // debounce nhẹ để tránh gọi API liên tục
    timer.current = setTimeout(async () => {
      try {
        const res = await axios.get('/api/products/search', { params: { query: value } });
        setResults(res.data?.results || []);
      } catch (error) {
        setResults([]);
      }
    }, 300);
  };

  const gotoProduct = (item?: ResultItem) => {
    const slug = item?.slug || results[0]?.slug;
    if (slug) push(PATH_DASHBOARD.eCommerce.view(slug));
  };

  return (
    <Autocomplete
      size="small"
      autoHighlight
      popupIcon={null}
      options={results}
      filterOptions={(x) => x}
      onInputChange={(_e, value) => handleChangeSearch(value)}
      onChange={(_e, value) => value && gotoProduct(value as ResultItem)}
      getOptionLabel={(o: any) => (typeof o === 'string' ? o : o.name)}
      noOptionsText={<SearchNotFound query={query} />}
      isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
      sx={{ width: { xs: 1, sm: 260 } }}
      renderInput={(params) => (
        <CustomTextField
          {...params}
          width={240}
          placeholder="Tìm sản phẩm..."
          onKeyUp={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') gotoProduct();
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ ml: 1, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, product: any) => {
        const minPrice = product.packages?.length
          ? Math.min(...product.packages.map((p: any) => p.price))
          : null;
        return (
          <li {...props} key={product.id}>
            <Image
              alt={product.name}
              src={product.imageUrl || '/assets/placeholder.svg'}
              sx={{ width: 44, height: 44, borderRadius: 1, flexShrink: 0, mr: 1.5 }}
            />
            <Link
              underline="none"
              color="inherit"
              onClick={() => gotoProduct(product)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="subtitle2" noWrap>
                {product.name}
              </Typography>
              {minPrice != null && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {minPrice.toLocaleString('vi-VN')}đ
                </Typography>
              )}
            </Link>
          </li>
        );
      }}
    />
  );
}
