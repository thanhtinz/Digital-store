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
// locales
import { useLocales } from '../../../../locales';
// components
import FormProvider, { RHFTextField } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

type FormValuesProps = {
  rating: number | string | null;
  review: string;
  name: string;
  email: string;
};

interface Props extends DialogProps {
  onClose: VoidFunction;
}

export default function ProductDetailsNewReviewForm({ onClose, ...other }: Props) {
  const { translate } = useLocales();
  const tp = (k: string) => `${translate(`product_page.${k}`)}`;

  const ReviewSchema = Yup.object().shape({
    rating: Yup.mixed().required(tp('rating_required')),
    review: Yup.string().required(tp('review_required')),
    name: Yup.string().required(tp('name_required')),
    email: Yup.string().required(tp('email_required')).email(tp('email_invalid')),
  });

  const defaultValues = {
    rating: null,
    review: '',
    name: '',
    email: '',
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      onClose();
      console.log('DATA', data);
    } catch (error) {
      console.error(error);
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

          <RHFTextField name="name" label={tp('name_field')} sx={{ mt: 3 }} />

          <RHFTextField name="email" label={tp('email_field')} sx={{ mt: 3 }} />
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
