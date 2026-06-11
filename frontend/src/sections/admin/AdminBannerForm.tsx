import * as Yup from 'yup';
import { useMemo } from 'react';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Button, Card, Grid, Stack, Typography, IconButton } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import FormProvider, { RHFSwitch, RHFSelect, RHFTextField } from '../../components/hook-form';
//
import ImageUploadField from './ImageUploadField';

// ----------------------------------------------------------------------
// Form tạo/sửa BANNER dạng trang đầy đủ (thay popup).
// ----------------------------------------------------------------------

const BANNER_TYPES = ['hero', 'promo', 'popup', 'sidebar'];

type Props = {
  current?: any | null; // null = tạo mới
  onBack: VoidFunction;
  onSaved: VoidFunction;
};

type FormValuesProps = {
  title: string;
  image_url: string;
  link: string;
  banner_type: string;
  sort_order: number;
  is_active: boolean;
};

export default function AdminBannerForm({ current, onBack, onSaved }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!current?.id;

  const BannerSchema = Yup.object().shape({
    title: Yup.string().required('Vui lòng nhập tiêu đề'),
  });

  const defaultValues = useMemo<FormValuesProps>(
    () => ({
      title: current?.title || '',
      image_url: current?.imageUrl || '',
      link: current?.link || '',
      banner_type: current?.bannerType || 'hero',
      sort_order: current?.sortOrder || 0,
      is_active: current?.isActive ?? true,
    }),
    [current]
  );

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(BannerSchema) as any,
    defaultValues,
  });

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const onSubmit = async (data: FormValuesProps) => {
    const payload = {
      title: data.title,
      image_url: data.image_url,
      link: data.link,
      banner_type: data.banner_type,
      sort_order: Number(data.sort_order) || 0,
      is_active: data.is_active,
    };
    try {
      if (isEdit) await axiosInstance.patch(`/api/banners/${current.id}`, payload);
      else await axiosInstance.post('/api/banners', payload);
      enqueueSnackbar(isEdit ? 'Đã cập nhật banner' : 'Đã tạo banner');
      onSaved();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Lưu thất bại', { variant: 'error' });
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>
        <Typography variant="h4">{isEdit ? 'Sửa banner' : 'Thêm banner'}</Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <RHFTextField name="title" label="Tiêu đề" />

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Ảnh banner
                </Typography>
                <ImageUploadField
                  label=""
                  value={values.image_url}
                  onChange={(url) => setValue('image_url', url, { shouldValidate: true })}
                  height={180}
                />
              </Stack>

              <RHFTextField name="link" label="Link khi bấm (URL)" />
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <RHFSelect native name="banner_type" label="Loại">
                  {BANNER_TYPES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </RHFSelect>
                <RHFTextField name="sort_order" label="Thứ tự" type="number" />
                <RHFSwitch name="is_active" label="Hiển thị" />
              </Stack>
            </Card>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button fullWidth color="inherit" variant="outlined" size="large" onClick={onBack}>
                Huỷ
              </Button>
              <LoadingButton fullWidth type="submit" variant="contained" size="large" loading={isSubmitting}>
                {isEdit ? 'Lưu thay đổi' : 'Tạo banner'}
              </LoadingButton>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
