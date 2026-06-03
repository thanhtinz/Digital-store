import * as Yup from 'yup';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { Stack } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// locales
import { useLocales } from '../../../../locales';
// components
import FormProvider, { RHFTextField } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

type FormValuesProps = {
  comment: string;
  name: string;
  email: string;
};

export default function BlogPostCommentForm() {
  const { translate } = useLocales();
  const tb = (k: string) => `${translate(`blog_page.${k}`)}`;

  const CommentSchema = Yup.object().shape({
    comment: Yup.string().required(tb('comment_required')),
    name: Yup.string().required(tb('name_required')),
    email: Yup.string().required(tb('email_required')).email(tb('email_invalid')),
  });

  const defaultValues = {
    comment: '',
    name: '',
    email: '',
  };

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(CommentSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data: FormValuesProps) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      console.log('DATA', data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3} alignItems="flex-end">
        <RHFTextField
          name="comment"
          placeholder={tb('comment_placeholder')}
          multiline
          rows={3}
        />

        <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
          {tb('post_comment')}
        </LoadingButton>
      </Stack>
    </FormProvider>
  );
}
