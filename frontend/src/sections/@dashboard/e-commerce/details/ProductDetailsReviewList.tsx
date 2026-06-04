import { useState } from 'react';
// @mui
import { Box, Stack, Button, Rating, Avatar, Pagination, Typography } from '@mui/material';
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

type Props = {
  reviews: IProductReview[];
};

export default function ProductDetailsReviewList({ reviews }: Props) {
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil((reviews.length || 0) / PAGE_SIZE);
  const paged = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Stack
        spacing={5}
        sx={{
          pt: 5,
          pl: {
            xs: 2.5,
            md: 0,
          },
          pr: {
            xs: 2.5,
            md: 5,
          },
        }}
      >
        {paged.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
        {reviews.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Chưa có đánh giá nào.
          </Typography>
        )}
      </Stack>

      {pageCount > 1 && (
        <Stack
          alignItems={{
            xs: 'center',
            md: 'flex-end',
          }}
          sx={{
            my: 5,
            mr: { md: 5 },
          }}
        >
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_e, value) => setPage(value)}
          />
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
  const { id, name, rating, comment, helpful, postedAt, avatarUrl, isPurchased, images } = review;

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
