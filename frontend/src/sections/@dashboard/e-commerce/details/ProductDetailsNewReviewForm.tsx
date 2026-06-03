import * as Yup from 'yup';
// form
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import {
  Stack,
  Button,
  Rating,
  Dialog,
  Typography,
  DialogTitle,
  DialogProps,
  DialogActions,
  DialogContent,
  FormHelperText,
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
      });
      reset();
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
