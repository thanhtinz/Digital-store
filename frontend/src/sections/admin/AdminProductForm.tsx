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
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';
import FormProvider, { RHFSwitch, RHFEditor, RHFTextField } from '../../components/hook-form';
//
import { GalleryField } from './ImageUploadField';

// ----------------------------------------------------------------------
// Form tạo/sửa sản phẩm (VIẾT LẠI v2):
//  - Ô DANH MỤC tách hẳn khỏi React Hook Form: dùng MUI Select controlled bằng
//    state riêng -> không còn race/reset, value luôn đúng.
//  - Tự FETCH danh mục trong component (không phụ thuộc thời điểm prop cha tải).
//  - Có marker "form v2 · <buildId>" để xác nhận ngay bản frontend mới đã chạy.
// ----------------------------------------------------------------------

type Category = { id: number; name: string; productType?: string };

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
  is_featured: boolean;
  is_active: boolean;
};

const BUILD_ID = (process.env.NEXT_PUBLIC_BUILD_ID || 'dev').slice(0, 7);

export default function AdminProductForm({ current, categories, onBack, onSaved }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!current?.id;
  const [aiBusy, setAiBusy] = useState(false);

  // ── DANH MỤC: state độc lập, không qua RHF ────────────────────────────
  const [cats, setCats] = useState<Category[]>(categories || []);
  const [categoryId, setCategoryId] = useState<string>(
    current?.categoryId ? String(current.categoryId) : ''
  );

  // Nhận danh mục từ prop cha khi có.
  useEffect(() => {
    if (categories && categories.length) setCats(categories);
  }, [categories]);

  // Tự fetch danh mục để đảm bảo dropdown luôn có dữ liệu (không phụ thuộc prop).
  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/categories')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.items || [];
        if (alive && list.length) setCats(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ── Tag theo type: topup (uid/login) + server (chỉ dùng cho danh mục Game) ──
  const [topupType, setTopupType] = useState<string>(current?.topupType || '');
  const [serverRegion, setServerRegion] = useState<string>(current?.serverRegion || '');

  // Preselect đúng danh mục + tag của sản phẩm đang sửa (khi mở/đổi sản phẩm).
  useEffect(() => {
    setCategoryId(current?.categoryId ? String(current.categoryId) : '');
    setTopupType(current?.topupType || '');
    setServerRegion(current?.serverRegion || '');
  }, [current]);

  // Danh mục đang chọn có phải loại Game không -> hiện ô Loại topup/Server.
  const selectedCat = cats.find((c) => String(c.id) === categoryId);
  const isGameCat = (selectedCat as any)?.productType === 'game';

  // ── Các field còn lại qua RHF ─────────────────────────────────────────
  const ProductSchema = Yup.object().shape({
    name: Yup.string().required('Vui lòng nhập tên sản phẩm'),
  });

  const defaultValues = useMemo<FormValuesProps>(() => {
    const gallery = Array.isArray(current?.images) ? current.images : [];
    const cover = current?.imageUrl || '';
    const images = cover ? [cover, ...gallery.filter((u: string) => u !== cover)] : gallery;
    return {
      name: current?.name || '',
      description: current?.description || '',
      images,
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
      image_url: data.images[0] || '',
      images: data.images,
      // Lấy thẳng từ state độc lập, ép số cho Prisma (Int).
      category_id: categoryId ? Number(categoryId) : null,
      is_featured: data.is_featured,
      is_active: data.is_active,
      // Tag game (chỉ gửi khi danh mục là Game; ngược lại để trống).
      topup_type: isGameCat ? topupType || null : null,
      server_region: isGameCat ? serverRegion || null : null,
    };
    try {
      const res = isEdit
        ? await axiosInstance.patch(`/api/products/admin/${current.id}`, payload)
        : await axiosInstance.post('/api/products/admin', payload);
      const savedCatName = res?.data?.category?.name || cats.find((c) => String(c.id) === categoryId)?.name;
      enqueueSnackbar(
        `${isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm'}${
          payload.category_id ? ` — Danh mục: ${savedCatName || '(đã lưu)'}` : ''
        }`,
        { variant: 'success' }
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
        {/* Marker: thấy chip này nghĩa là bản frontend MỚI đã chạy */}
        <Chip
          size="small"
          color="success"
          variant="soft"
          label={`form v2 · ${BUILD_ID}`}
          sx={{ ml: 'auto' }}
        />
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
              <Stack spacing={1.5}>
                {/* MUI Select controlled bằng state riêng — KHÔNG qua RHF */}
                <TextField
                  select
                  fullWidth
                  label="Danh mục"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <MenuItem value="">— Không —</MenuItem>
                  {cats.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
                {cats.length === 0 && (
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    Chưa có danh mục nào. Hãy tạo danh mục ở mục “Danh mục” trước.
                  </Typography>
                )}

                {/* Tag game: chỉ hiện khi danh mục là loại Game */}
                {isGameCat && (
                  <>
                    <TextField
                      select
                      fullWidth
                      label="Loại topup"
                      value={topupType}
                      onChange={(e) => setTopupType(e.target.value)}
                    >
                      <MenuItem value="">— Không —</MenuItem>
                      <MenuItem value="uid">Nạp qua UID</MenuItem>
                      <MenuItem value="login">Đăng nhập tài khoản</MenuItem>
                    </TextField>
                    <TextField
                      select
                      fullWidth
                      label="Server / Khu vực"
                      value={serverRegion}
                      onChange={(e) => setServerRegion(e.target.value)}
                    >
                      <MenuItem value="">— Không —</MenuItem>
                      <MenuItem value="vietnam">🇻🇳 Việt Nam</MenuItem>
                      <MenuItem value="global">🌐 Quốc tế</MenuItem>
                    </TextField>
                  </>
                )}
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Stack spacing={1}>
                <RHFSwitch name="is_active" label="Đang bán" />
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
