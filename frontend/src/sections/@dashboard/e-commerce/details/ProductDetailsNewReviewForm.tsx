import * as Yup from 'yup';
import { useRef, useState } from 'react';
// form
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import {
  Box,
  Stack,
  Button,
  Rating,
  Dialog,
  IconButton,
  Typography,
  DialogTitle,
  DialogProps,
  DialogActions,
  DialogContent,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
// redux
import { useDispatch } from '../../../../redux/store';
import { getProduct } from '../../../../redux/slices/product';
// utils
import axios from '../../../../utils/axios';
// locales
import { useLocales } from '../../../../locales';
// components
import Image from '../../../../components/image';
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';
import FormProvider, { RHFTextField } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

type FormValuesProps = {
  rating: number | string | null;
  review: string;
};

interface Props extends DialogProps {
  onClose: VoidFunction;
  productId?: number | string;
  productSlug?: string;
}

export default function ProductDetailsNewReviewForm({
  onClose,
  productId,
  productSlug,
  ...other
}: Props) {
  const { translate } = useLocales();
  const tp = (k: string) => `${translate(`product_page.${k}`)}`;
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - images.length);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        const r = await axios.post('/api/reviews/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (r.data?.url) urls.push(r.data.url);
      }
      setImages((p) => [...p, ...urls]);
    } catch (err: any) {
      enqueueSnackbar(err?.detail || tp('action_failed'), { variant: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const ReviewSchema = Yup.object().shape({
    rating: Yup.mixed().required(tp('rating_required')),
    review: Yup.string().required(tp('review_required')),
  });

  const defaultValues = {
    rating: null,
    review: '',
  };

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(ReviewSchema),
    defaultValues,
  });

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const onSubmit = async (data: FormValuesProps) => {
    try {
      await axios.post('/api/reviews', {
        product_id: productId,
        rating: Number(data.rating),
        comment: data.review,
        images,
      });
      reset();
      setImages([]);
      onClose();
      enqueueSnackbar(tp('review_posted'));
      if (productSlug) dispatch(getProduct(productSlug));
    } catch (error: any) {
      const detail = error?.detail || error?.response?.data?.detail || tp('review_failed');
      enqueueSnackbar(detail, { variant: 'error' });
    }
  };

  const onCancel = () => {
    onClose();
    reset();
  };

  return (
    <Dialog onClose={onClose} {...other}>
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle> {tp('add_review')} </DialogTitle>

        <DialogContent>
          <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5}>
            <Typography variant="body2">{tp('your_review_label')}</Typography>

            <Controller
              name="rating"
              control={control}
              render={({ field }) => <Rating {...field} value={Number(field.value)} />}
            />
          </Stack>

          {!!errors.rating && <FormHelperText error> {errors.rating?.message}</FormHelperText>}

          <RHFTextField name="review" label={tp('review_field')} multiline rows={3} sx={{ mt: 3 }} />

          {/* Ảnh đính kèm */}
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
            {images.map((src, i) => (
              <Box key={i} sx={{ position: 'relative', width: 64, height: 64 }}>
                <Image src={src} sx={{ width: 1, height: 1, borderRadius: 1 }} />
                <IconButton
                  size="small"
                  onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                  sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'common.white', p: 0.25, '&:hover': { bgcolor: 'error.dark' } }}
                >
                  <Iconify icon="eva:close-fill" width={14} />
                </IconButton>
              </Box>
            ))}
            {images.length < 6 && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                sx={{ width: 64, height: 64, minWidth: 0, p: 0, borderStyle: 'dashed' }}
              >
                {uploading ? <CircularProgress size={18} /> : <Iconify icon="solar:gallery-add-bold" width={22} />}
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" variant="outlined" onClick={onCancel}>
            {tp('cancel')}
          </Button>

          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            {tp('post_review')}
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
