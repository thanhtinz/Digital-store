import { useEffect, useState, useCallback } from 'react';
// @mui
import {
  Box,
  Stack,
  Button,
  Rating,
  Avatar,
  Pagination,
  Typography,
  Chip,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Paper,
} from '@mui/material';
// utils
import axiosInstance from '../../../../utils/axios';
import { fDate } from '../../../../utils/formatTime';
import { fShortenNumber } from '../../../../utils/formatNumber';
// locales
import { useLocales } from '../../../../locales';
// @types
import { IProductReview } from '../../../../@types/product';
// components
import Image from '../../../../components/image';
import Iconify from '../../../../components/iconify';

// ----------------------------------------------------------------------

const PAGE_SIZE = 5;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'helpful', label: 'Hữu ích nhất' },
  { value: 'rating_high', label: 'Sao cao → thấp' },
  { value: 'rating_low', label: 'Sao thấp → cao' },
];

type Props = {
  reviews: IProductReview[];
  productId?: string | number;
};

export default function ProductDetailsReviewList({ reviews, productId }: Props) {
  const [items, setItems] = useState<IProductReview[]>(reviews);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(Math.ceil((reviews.length || 0) / PAGE_SIZE) || 1);
  const [sort, setSort] = useState('newest');
  const [rating, setRating] = useState(0); // 0 = tất cả
  const [hasImages, setHasImages] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const r = await axiosInstance.get(`/api/products/${productId}/reviews`, {
        params: {
          page,
          limit: PAGE_SIZE,
          sort,
          ...(rating ? { rating } : {}),
          ...(hasImages ? { has_images: 1 } : {}),
        },
      });
      const list: IProductReview[] = (r.data?.reviews || r.data?.items || []).map((x: any) => ({
        id: String(x.id),
        name: x.name || x.userName || 'Khách',
        avatarUrl: x.avatarUrl || '',
        comment: x.comment || '',
        rating: x.rating || 0,
        isPurchased: x.isPurchased ?? x.isVerified ?? false,
        helpful: x.helpful ?? x.helpfulCount ?? 0,
        images: Array.isArray(x.images) ? x.images : [],
        adminReply: x.adminReply ?? null,
        adminReplyAt: x.adminReplyAt ?? null,
        postedAt: x.postedAt || x.createdAt || new Date().toISOString(),
      }));
      setItems(list);
      setPages(r.data?.pages || 1);
    } catch {
      /* giữ nguyên dữ liệu hiện có nếu lỗi mạng */
    } finally {
      setLoading(false);
    }
  }, [productId, page, sort, rating, hasImages]);

  // Tải lại khi đổi bộ lọc / sắp xếp / trang. Bỏ qua nếu không có productId
  // (fallback dùng prop reviews + phân trang client).
  useEffect(() => {
    if (productId) fetchReviews();
  }, [fetchReviews, productId]);

  // Đồng bộ khi prop reviews thay đổi (vd sau khi gửi đánh giá mới).
  useEffect(() => {
    if (productId) {
      setPage(1);
      fetchReviews();
    } else {
      setItems(reviews);
      setPages(Math.ceil((reviews.length || 0) / PAGE_SIZE) || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews]);

  const handleFilter = (next: { sort?: string; rating?: number; hasImages?: boolean }) => {
    if (next.sort !== undefined) setSort(next.sort);
    if (next.rating !== undefined) setRating(next.rating);
    if (next.hasImages !== undefined) setHasImages(next.hasImages);
    setPage(1);
  };

  // Khi không có productId: phân trang client trên prop.
  const clientPaged = !productId
    ? items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : items;

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        spacing={1.5}
        sx={{ pt: 4, px: { xs: 2.5, md: 0 } }}
      >
        <TextField
          select
          size="small"
          label="Sắp xếp"
          value={sort}
          onChange={(e) => handleFilter({ sort: e.target.value })}
          sx={{ minWidth: 180 }}
        >
          {SORT_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, flexGrow: 1 }}>
          <Chip
            label="Tất cả"
            size="small"
            color={rating === 0 ? 'primary' : 'default'}
            variant={rating === 0 ? 'filled' : 'outlined'}
            onClick={() => handleFilter({ rating: 0 })}
          />
          {[5, 4, 3, 2, 1].map((s) => (
            <Chip
              key={s}
              size="small"
              label={`${s} ★`}
              color={rating === s ? 'primary' : 'default'}
              variant={rating === s ? 'filled' : 'outlined'}
              onClick={() => handleFilter({ rating: s })}
            />
          ))}
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={hasImages}
              onChange={(e) => handleFilter({ hasImages: e.target.checked })}
            />
          }
          label="Có hình ảnh"
        />
      </Stack>

      <Stack
        spacing={5}
        sx={{
          pt: 3,
          pl: { xs: 2.5, md: 0 },
          pr: { xs: 2.5, md: 5 },
          opacity: loading ? 0.5 : 1,
          transition: 'opacity .2s',
        }}
      >
        {clientPaged.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
        {clientPaged.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Chưa có đánh giá nào.
          </Typography>
        )}
      </Stack>

      {pages > 1 && (
        <Stack
          alignItems={{ xs: 'center', md: 'flex-end' }}
          sx={{ my: 5, mr: { md: 5 } }}
        >
          <Pagination count={pages} page={page} onChange={(_e, value) => setPage(value)} />
        </Stack>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

type ReviewItemProps = {
  review: IProductReview;
};

function ReviewItem({ review }: ReviewItemProps) {
  const { translate } = useLocales();
  const tp = (k: string) => `${translate(`product_page.${k}`)}`;
  const { id, name, rating, comment, helpful, postedAt, avatarUrl, isPurchased, images, adminReply, adminReplyAt } =
    review;

  const [isHelpful, setIsHelpful] = useState(false);
  const [count, setCount] = useState(helpful);
  const [busy, setBusy] = useState(false);

  const toggleHelpful = async () => {
    setBusy(true);
    try {
      const r = await axiosInstance.post(`/api/reviews/${id}/helpful`);
      setIsHelpful(!!r.data?.voted);
      setCount(Number(r.data?.helpful_count) || 0);
    } catch {
      /* bỏ qua (vd chưa đăng nhập) */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack
      spacing={2}
      direction={{
        xs: 'column',
        md: 'row',
      }}
    >
      <Stack
        spacing={2}
        alignItems="center"
        direction={{
          xs: 'row',
          md: 'column',
        }}
        sx={{
          width: { md: 240 },
          textAlign: { md: 'center' },
        }}
      >
        <Avatar
          src={avatarUrl}
          sx={{
            width: { md: 64 },
            height: { md: 64 },
          }}
        />

        <Stack spacing={{ md: 0.5 }}>
          <Typography variant="subtitle2" noWrap>
            {name}
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            {fDate(postedAt)}
          </Typography>
        </Stack>
      </Stack>

      <Stack spacing={1} flexGrow={1}>
        <Rating size="small" value={rating} precision={0.1} readOnly />

        {isPurchased && (
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'success.main',
            }}
          >
            <Iconify icon="ic:round-verified" width={16} sx={{ mr: 0.5 }} />
            {tp('verified_purchase')}
          </Typography>
        )}

        <Typography variant="body2">{comment}</Typography>

        {!!images?.length && (
          <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 0.5 }}>
            {images.map((src, i) => (
              <Box
                key={i}
                component="a"
                href={src}
                target="_blank"
                rel="noopener"
                sx={{ display: 'inline-block' }}
              >
                <Image
                  src={src}
                  sx={{ width: 72, height: 72, borderRadius: 1, bgcolor: 'background.neutral' }}
                />
              </Box>
            ))}
          </Stack>
        )}

        {adminReply && (
          <Paper
            variant="outlined"
            sx={{ mt: 1, p: 1.5, bgcolor: 'background.neutral', borderRadius: 1.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <Iconify icon="solar:shop-2-bold" width={16} sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                Phản hồi từ cửa hàng
              </Typography>
              {adminReplyAt && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  · {fDate(adminReplyAt)}
                </Typography>
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {adminReply}
            </Typography>
          </Paper>
        )}

        <Stack
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
        >
          {!isHelpful && (
            <Typography variant="subtitle2">{tp('review_helpful_q')}</Typography>
          )}

          <Button
            size="small"
            color="inherit"
            disabled={busy}
            startIcon={<Iconify icon={!isHelpful ? 'ic:round-thumb-up' : 'eva:checkmark-fill'} />}
            onClick={toggleHelpful}
          >
            {isHelpful ? tp('helpful') : tp('thank')}({fShortenNumber(count)})
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
