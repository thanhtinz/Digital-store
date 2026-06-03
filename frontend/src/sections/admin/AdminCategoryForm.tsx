import * as Yup from 'yup';
import { useMemo } from 'react';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Button, Card, Grid, MenuItem, Stack, Typography, IconButton } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import FormProvider, { RHFSwitch, RHFSelect, RHFTextField } from '../../components/hook-form';
//
import ImageUploadField from './ImageUploadField';

// ----------------------------------------------------------------------
// Form tạo/sửa DANH MỤC dạng trang đầy đủ (thay popup).
// ----------------------------------------------------------------------

type Category = {
  id: number;
  name: string;
  slug?: string;
  iconUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  parentId?: number | null;
  productType?: string;
};

const PRODUCT_TYPES = [
  { value: 'premium', label: 'Tài khoản Premium' },
  { value: 'game', label: 'Nạp game (Topup)' },
  { value: 'giftcard', label: 'Giftcard' },
];

type Props = {
  current?: Category | null; // null = tạo mới
  roots: Category[]; // danh mục gốc để chọn cha
  presetParentId?: number | string;
  presetProductType?: string;
  onBack: VoidFunction;
  onSaved: VoidFunction;
};

type FormValuesProps = {
  name: string;
  icon_url: string;
  sort_order: number;
  is_active: boolean;
  product_type: string;
  parent_id: string | number;
};

export default function AdminCategoryForm({
  current,
  roots,
  presetParentId,
  presetProductType,
  onBack,
  onSaved,
}: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!current?.id;

  const CategorySchema = Yup.object().shape({
    name: Yup.string().required('Vui lòng nhập tên danh mục'),
  });

  const defaultValues = useMemo<FormValuesProps>(
    () => ({
      name: current?.name || '',
      icon_url: current?.iconUrl || '',
      sort_order: current?.sortOrder || 0,
      is_active: current?.isActive ?? true,
      product_type: current?.productType || presetProductType || 'premium',
      // Chuỗi để khớp value của MenuItem (MUI Select không native).
      parent_id: current?.parentId
        ? String(current.parentId)
        : presetParentId
        ? String(presetParentId)
        : '',
    }),
    [current, presetParentId, presetProductType]
  );

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(CategorySchema) as any,
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
      name: data.name,
      icon_url: data.icon_url,
      sort_order: Number(data.sort_order) || 0,
      is_active: data.is_active,
      product_type: data.product_type,
      parent_id: data.parent_id ? Number(data.parent_id) : null,
    };
    try {
      if (isEdit) await axiosInstance.patch(`/api/categories/${current!.id}`, payload);
      else await axiosInstance.post('/api/categories', payload);
      enqueueSnackbar(isEdit ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
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
        <Typography variant="h4">{isEdit ? 'Sửa danh mục' : 'Thêm danh mục'}</Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <RHFTextField name="name" label="Tên danh mục" />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <RHFSelect name="product_type" label="Loại">
                  {PRODUCT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </RHFSelect>

                <RHFSelect name="parent_id" label="Danh mục cha">
                  <MenuItem value="">— Danh mục gốc —</MenuItem>
                  {roots
                    .filter((r) => r.id !== current?.id)
                    .map((r) => (
                      <MenuItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </MenuItem>
                    ))}
                </RHFSelect>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Icon / Ảnh danh mục
                </Typography>
                <ImageUploadField
                  label=""
                  value={values.icon_url}
                  onChange={(url) => setValue('icon_url', url, { shouldValidate: true })}
                />
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <RHFTextField name="sort_order" label="Thứ tự" type="number" />
                <RHFSwitch name="is_active" label="Hiển thị" />
              </Stack>
            </Card>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button fullWidth color="inherit" variant="outlined" size="large" onClick={onBack}>
                Huỷ
              </Button>
              <LoadingButton fullWidth type="submit" variant="contained" size="large" loading={isSubmitting}>
                {isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
              </LoadingButton>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
