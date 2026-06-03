import * as Yup from 'yup';
import { useEffect, useMemo, useState } from 'react';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  Card,
  Grid,
  MenuItem,
  Stack,
  Typography,
  IconButton,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import FormProvider, {
  RHFSwitch,
  RHFSelect,
  RHFEditor,
  RHFTextField,
} from '../../components/hook-form';
//
import { GalleryField } from './ImageUploadField';

// ----------------------------------------------------------------------
// Form tạo/sửa sản phẩm dạng TRANG ĐẦY ĐỦ (theo layout Minimal: 2 cột + Card),
// dùng trình soạn thảo văn bản RHFEditor cho mô tả. Thay cho popup cũ.
// ----------------------------------------------------------------------

type Category = { id: number; name: string };

type Props = {
  current?: any | null; // sản phẩm đang sửa (null = tạo mới)
  categories: Category[];
  onBack: VoidFunction;
  onSaved: VoidFunction;
};

type FormValuesProps = {
  name: string;
  description: string;
  images: string[]; // ảnh đầu tiên = ảnh đại diện (cover)
  category_id: string | number;
  is_featured: boolean;
  is_active: boolean;
};

export default function AdminProductForm({ current, categories, onBack, onSaved }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!current?.id;
  const [aiBusy, setAiBusy] = useState(false);

  const ProductSchema = Yup.object().shape({
    name: Yup.string().required('Vui lòng nhập tên sản phẩm'),
  });

  const defaultValues = useMemo<FormValuesProps>(() => {
    // Gộp ảnh đại diện + album thành một danh sách, ảnh bìa đứng đầu.
    const gallery = Array.isArray(current?.images) ? current.images : [];
    const cover = current?.imageUrl || '';
    const images = cover ? [cover, ...gallery.filter((u: string) => u !== cover)] : gallery;
    return {
      name: current?.name || '',
      description: current?.description || '',
      images,
      // Chuỗi để khớp value của <option> (native select dùng chuỗi).
      category_id: current?.categoryId ? String(current.categoryId) : '',
      is_featured: !!current?.isFeatured,
      is_active: current?.isActive ?? true,
    };
  }, [current]);

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(ProductSchema) as any,
    defaultValues,
  });

  const {
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const aiGenerate = async () => {
    if (!values.name?.trim()) {
      enqueueSnackbar('Nhập tên sản phẩm trước', { variant: 'warning' });
      return;
    }
    setAiBusy(true);
    try {
      const r = await axiosInstance.post('/api/admin/ai/generate', {
        field_type: 'product_description',
        context: values.name,
        max_tokens: 400,
      });
      if (r.data?.content) setValue('description', r.data.content.trim(), { shouldValidate: true });
      enqueueSnackbar('Đã tạo mô tả bằng AI');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'AI tạo mô tả thất bại', { variant: 'error' });
    } finally {
      setAiBusy(false);
    }
  };

  const onSubmit = async (data: FormValuesProps) => {
    const payload = {
      name: data.name,
      description: data.description,
      // Ảnh đầu tiên là ảnh đại diện; cả danh sách lưu vào album.
      image_url: data.images[0] || '',
      images: data.images,
      // Gửi dạng số (RHFSelect trả chuỗi) để Prisma nhận đúng kiểu Int.
      category_id: data.category_id ? Number(data.category_id) : null,
      is_featured: data.is_featured,
      is_active: data.is_active,
    };
    try {
      const res = isEdit
        ? await axiosInstance.patch(`/api/products/admin/${current.id}`, payload)
        : await axiosInstance.post('/api/products/admin', payload);
      // Xác nhận danh mục đã lưu thật sự (đọc lại từ server).
      const savedCat = res?.data?.category?.name;
      enqueueSnackbar(
        `${isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm'}${
          payload.category_id ? ` — Danh mục: ${savedCat || '⚠ không lưu được'}` : ''
        }`,
        { variant: payload.category_id && !savedCat ? 'warning' : 'success' }
      );
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
        <Typography variant="h4">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <RHFTextField name="name" label="Tên sản phẩm" />

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    Mô tả
                  </Typography>
                  <Button
                    size="small"
                    onClick={aiGenerate}
                    disabled={aiBusy}
                    startIcon={<Iconify icon={aiBusy ? 'eos-icons:loading' : 'solar:magic-stick-3-bold'} />}
                  >
                    {aiBusy ? 'Đang tạo…' : 'Tạo bằng AI'}
                  </Button>
                </Stack>
                <RHFEditor simple name="description" />
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Ảnh sản phẩm
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Ảnh đầu tiên là ảnh đại diện (hiện ở danh sách). Bấm ⭐ để đổi ảnh bìa.
                </Typography>
                <GalleryField
                  label="Ảnh"
                  markCover
                  value={values.images}
                  onChange={(urls) => setValue('images', urls, { shouldValidate: true })}
                />
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <RHFSelect name="category_id" label="Danh mục">
                  <MenuItem value="">— Không —</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </MenuItem>
                  ))}
                </RHFSelect>
                {categories.length === 0 && (
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    Chưa có danh mục nào. Hãy tạo danh mục ở mục “Danh mục” trước.
                  </Typography>
                )}
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Stack spacing={1}>
                <RHFSwitch name="is_active" label="Đang bán" />
                <RHFSwitch name="is_featured" label="Nổi bật (hiện trang chủ)" />
              </Stack>
            </Card>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button fullWidth color="inherit" variant="outlined" size="large" onClick={onBack}>
                Huỷ
              </Button>
              <LoadingButton fullWidth type="submit" variant="contained" size="large" loading={isSubmitting}>
                {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
              </LoadingButton>
            </Box>

            {isEdit && (
              <Typography variant="caption" color="text.secondary">
                Quản lý <b>gói &amp; giá</b> và <b>trường nhập</b> ở danh sách sản phẩm (biểu tượng hộp).
              </Typography>
            )}
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
