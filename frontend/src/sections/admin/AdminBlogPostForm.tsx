import * as Yup from 'yup';
import { useEffect, useState } from 'react';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Button, Card, Grid, Stack, Typography, IconButton, CircularProgress } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import FormProvider, { RHFSwitch, RHFSelect, RHFEditor, RHFTextField } from '../../components/hook-form';
//
import ImageUploadField from './ImageUploadField';

// ----------------------------------------------------------------------
// Form tạo/sửa BÀI VIẾT dạng trang đầy đủ + trình soạn thảo RHFEditor.
// ----------------------------------------------------------------------

type Cat = { id: number; name: string };

type Props = {
  postId?: number | null; // null = viết bài mới
  categories: Cat[];
  onBack: VoidFunction;
  onSaved: VoidFunction;
};

type FormValuesProps = {
  title: string;
  excerpt: string;
  content: string;
  category_id: string | number;
  thumbnail_url: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
};

const EMPTY: FormValuesProps = {
  title: '',
  excerpt: '',
  content: '',
  category_id: '',
  thumbnail_url: '',
  meta_title: '',
  meta_description: '',
  is_published: false,
};

export default function AdminBlogPostForm({ postId, categories, onBack, onSaved }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!postId;
  const [loaded, setLoaded] = useState(!postId);

  const PostSchema = Yup.object().shape({
    title: Yup.string().required('Vui lòng nhập tiêu đề'),
  });

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(PostSchema) as any,
    defaultValues: EMPTY,
  });

  const {
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  // Nạp chi tiết bài viết khi sửa.
  useEffect(() => {
    let alive = true;
    if (postId) {
      axiosInstance
        .get(`/api/admin/blog/posts/id/${postId}`)
        .then((r) => {
          if (!alive) return;
          const p = r.data;
          const data: FormValuesProps = {
            title: p.title || '',
            excerpt: p.excerpt || '',
            content: p.content || '',
            category_id: p.categoryId || '',
            thumbnail_url: p.thumbnailUrl || '',
            meta_title: p.metaTitle || '',
            meta_description: p.metaDescription || '',
            is_published: !!p.isPublished,
          };
          reset(data);
          setLoaded(true);
        })
        .catch((e: any) => enqueueSnackbar(e?.detail || 'Không tải được bài viết', { variant: 'error' }));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onSubmit = async (data: FormValuesProps) => {
    const payload = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      category_id: data.category_id ? Number(data.category_id) : null,
      thumbnail_url: data.thumbnail_url,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      is_published: data.is_published,
    };
    try {
      if (isEdit) await axiosInstance.patch(`/api/admin/blog/posts/${postId}`, payload);
      else await axiosInstance.post('/api/admin/blog/posts', payload);
      enqueueSnackbar('Đã lưu bài viết');
      onSaved();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Lưu thất bại', { variant: 'error' });
    }
  };

  if (!loaded)
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>
        <Typography variant="h4">{isEdit ? 'Sửa bài viết' : 'Viết bài'}</Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <RHFTextField name="title" label="Tiêu đề" />

              <RHFTextField name="excerpt" label="Tóm tắt" multiline rows={2} />

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Nội dung
                </Typography>
                <RHFEditor name="content" />
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <ImageUploadField
                  label="Ảnh đại diện"
                  value={values.thumbnail_url}
                  onChange={(url) => setValue('thumbnail_url', url, { shouldValidate: true })}
                  height={140}
                />
                <RHFSelect native name="category_id" label="Chuyên mục">
                  <option value="">— Không —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </RHFSelect>
                <RHFSwitch name="is_published" label="Đăng công khai" />
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  SEO
                </Typography>
                <RHFTextField name="meta_title" label="Meta title" />
                <RHFTextField name="meta_description" label="Meta description" multiline rows={2} />
              </Stack>
            </Card>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button fullWidth color="inherit" variant="outlined" size="large" onClick={onBack}>
                Huỷ
              </Button>
              <LoadingButton fullWidth type="submit" variant="contained" size="large" loading={isSubmitting}>
                {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
              </LoadingButton>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
