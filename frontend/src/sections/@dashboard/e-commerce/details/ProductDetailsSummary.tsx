import { useEffect, useState } from 'react';
// next
import { useRouter } from 'next/router';
// form
import { Controller, useForm } from 'react-hook-form';
// @mui
import {
  Box,
  Link,
  Stack,
  Button,
  Rating,
  Divider,
  MenuItem,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// utils
import { fShortenNumber, fCurrency } from '../../../../utils/formatNumber';
// @types
import { IProduct, ICheckoutCartItem } from '../../../../@types/product';
// _mock
import { _socials } from '../../../../_mock/arrays';
// components
import Image from '../../../../components/image';
import Label from '../../../../components/label';
import Iconify from '../../../../components/iconify';
import { IncrementerButton } from '../../../../components/custom-input';
import { ColorSinglePicker } from '../../../../components/color-utils';
import FormProvider, { RHFSelect } from '../../../../components/hook-form';
import { useSnackbar } from '../../../../components/snackbar';
// auth + utils
import { useAuthContext } from '../../../../auth/useAuthContext';
import axiosInstance from '../../../../utils/axios';
// locales
import { useLocales } from '../../../../locales';

// ----------------------------------------------------------------------

interface FormValuesProps extends Omit<ICheckoutCartItem, 'colors'> {
  colors: string;
}

type Props = {
  product: IProduct;
  cart: ICheckoutCartItem[];
  onAddCart: (cartItem: ICheckoutCartItem) => void;
  onGotoStep: (step: number) => void;
  hideTitle?: boolean; // ẩn tên/badge/rating khi trang đã có header riêng (game/giftcard)
};

export default function ProductDetailsSummary({
  cart,
  product,
  onAddCart,
  onGotoStep,
  hideTitle = false,
  ...other
}: Props) {
  const { push } = useRouter();
  const { translate } = useLocales();
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const tp = (k: string) => `${translate(`product_page.${k}`)}`;
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);

  const {
    id,
    name,
    sizes,
    price,
    cover,
    colors,
    available,
    priceSale,
    totalRating,
    totalReview,
    packages = [],
  } = product;

  // Loại sản phẩm + thông tin topup (cho layout riêng game/giftcard).
  const pAny: any = product;
  const productType: string = pAny.productType || 'premium';
  const topupType: string | null = pAny.topupType || null;
  const serverRegion: string | null = pAny.serverRegion || null;
  const isGame = productType === 'game';
  const isGiftcard = productType === 'giftcard';

  // Digital Store: bán theo gói. Nếu có gói thì dùng gói thay cho size/màu.
  const hasPackages = Array.isArray(packages) && packages.length > 0;
  const defaultPackage = hasPackages ? packages[0] : undefined;

  // Giá hiệu lực của 1 gói (ưu tiên flash sale).
  const pkgPrice = (pkg: any) => (pkg?.flashSale?.salePrice ?? pkg?.price) || 0;
  // Chọn gói bằng cách bấm thẻ (thay cho dropdown).
  const selectPackage = (pkg: any) => {
    setValue('packageId', String(pkg.id));
    setValue('packageName', pkg.name);
    setValue('price', pkgPrice(pkg));
    setCustomFields({});
  };

  // Còn hàng nếu có ít nhất 1 gói khả dụng (gói không quản kho hoặc còn tồn).
  const inStock =
    hasPackages &&
    packages.some(
      (pk: any) => pk.isActive !== false && (!pk.isStockManaged || (pk.stockQuantity || 0) > 0)
    );

  const alreadyProduct = cart.map((item) => item.id).includes(id);

  const isMaxQuantity =
    cart.filter((item) => item.id === id).map((item) => item.quantity)[0] >= available;

  const defaultValues = {
    id,
    name,
    cover,
    available,
    price: defaultPackage ? defaultPackage.price : price,
    colors: colors[0],
    size: sizes[4],
    quantity: available < 1 ? 0 : 1,
    packageId: defaultPackage ? String(defaultPackage.id) : undefined,
    packageName: defaultPackage ? defaultPackage.name : undefined,
  };

  const methods = useForm<FormValuesProps>({
    defaultValues,
  });

  const { reset, watch, control, setValue, handleSubmit } = methods;

  const values = watch();

  // Trường tùy chỉnh theo gói (Digital Store)
  const selectedPackage = packages.find((p) => String(p.id) === String(values.packageId));
  const packageFields = selectedPackage?.fields || [];
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  // Gói đang chọn có hết hàng không (chỉ tính khi quản lý kho).
  const sp: any = selectedPackage;
  const selectedOutOfStock = !!sp && sp.isStockManaged && (sp.stockQuantity || 0) <= 0;

  useEffect(() => {
    setAlerted(false); // đổi gói thì reset trạng thái đã đăng ký
  }, [values.packageId]);

  const handleStockAlert = async () => {
    if (!isAuthenticated) {
      enqueueSnackbar(tp('login_required_alert'), { variant: 'warning' });
      return;
    }
    if (!selectedPackage) return;
    setAlerting(true);
    try {
      await axiosInstance.post('/api/products/stock-alert', { package_id: selectedPackage.id });
      setAlerted(true);
      enqueueSnackbar(tp('stock_alert_ok'));
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || tp('action_failed'), { variant: 'error' });
    } finally {
      setAlerting(false);
    }
  };

  const handleChangeCustomField = (fieldName: string, value: string) => {
    setCustomFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Kiểm tra các trường bắt buộc đã nhập đủ chưa.
  const missingRequired = packageFields
    .filter((f) => f.isRequired)
    .some((f) => !(customFields[f.fieldName] || '').trim());

  useEffect(() => {
    if (product) {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const onSubmit = async (data: FormValuesProps) => {
    try {
      if (missingRequired) return;
      if (!alreadyProduct) {
        onAddCart({
          ...data,
          colors: [values.colors],
          subtotal: data.price * data.quantity,
          customFields,
        });
      }
      onGotoStep(0);
      push(PATH_DASHBOARD.eCommerce.checkout);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddCart = async () => {
    try {
      if (missingRequired) return;
      onAddCart({
        ...values,
        colors: [values.colors],
        subtotal: values.price * values.quantity,
        customFields,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack
        spacing={3}
        sx={{
          p: (theme) => ({
            md: theme.spacing(5, 5, 0, 2),
          }),
        }}
        {...other}
      >
        <Stack spacing={2}>
          <Label variant="soft" color={inStock ? 'success' : 'error'} sx={{ mr: 'auto' }}>
            {inStock ? tp('in_stock') : tp('out_of_stock')}
          </Label>

          {!hideTitle && (
            <>
              <Typography variant="h5">{name}</Typography>

              {(isGame || isGiftcard) && (
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {isGame && (
                    <Label variant="filled" color="warning">
                      TOP UP
                    </Label>
                  )}
                  {isGiftcard && (
                    <Label variant="filled" color="info">
                      GIFT CARD
                    </Label>
                  )}
                  {isGame && topupType && (
                    <Label variant="soft" color="default" startIcon={<Iconify icon={topupType === 'uid' ? 'solar:user-id-bold' : 'solar:login-3-bold'} />}>
                      {topupType === 'uid' ? 'UID' : 'Đăng nhập'}
                    </Label>
                  )}
                  {isGame && serverRegion && (
                    <Label variant="soft" color="default">
                      {serverRegion === 'vietnam' ? '🇻🇳 Việt Nam' : '🌐 Global'}
                    </Label>
                  )}
                </Stack>
              )}

              <Stack direction="row" alignItems="center" spacing={1}>
                <Rating value={totalRating} precision={0.1} readOnly />

                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ({fShortenNumber(totalReview)} {tp('reviews')})
                </Typography>
              </Stack>
            </>
          )}

          <Typography variant="h4">
            {!hasPackages && priceSale && (
              <Box
                component="span"
                sx={{ color: 'text.disabled', textDecoration: 'line-through', mr: 0.5 }}
              >
                {fCurrency(priceSale)}
              </Box>
            )}

            {fCurrency(values.price ?? price)}
          </Typography>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {hasPackages ? (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">{tp('package')}</Typography>
            <Box
              display="grid"
              gap={1.5}
              gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }}
            >
              {packages.map((pkg: any) => {
                const selected = String(pkg.id) === String(values.packageId);
                const oos = pkg.isStockManaged && (pkg.stockQuantity || 0) <= 0;
                const eff = pkgPrice(pkg);
                const hasFlash = !!pkg.flashSale?.salePrice && pkg.price > eff;
                const showImg = (isGame || isGiftcard) && !!pkg.imageUrl;
                return (
                  <Box
                    key={pkg.id}
                    onClick={() => !oos && selectPackage(pkg)}
                    sx={{
                      position: 'relative',
                      p: 1.25,
                      cursor: oos ? 'not-allowed' : 'pointer',
                      opacity: oos ? 0.5 : 1,
                      borderRadius: 1.5,
                      bgcolor: selected ? 'primary.lighter' : 'background.paper',
                      border: (theme) =>
                        `solid 2px ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                      transition: (theme) => theme.transitions.create('border-color'),
                    }}
                  >
                    {hasFlash && (
                      <Label color="error" variant="filled" sx={{ position: 'absolute', top: 6, left: 6, zIndex: 9 }}>
                        SALE
                      </Label>
                    )}
                    {oos && (
                      <Label color="error" sx={{ position: 'absolute', top: 6, right: 6, zIndex: 9 }}>
                        {tp('out_of_stock')}
                      </Label>
                    )}
                    {showImg && (
                      <Image
                        src={pkg.imageUrl}
                        alt={pkg.name}
                        ratio={isGiftcard ? '3/4' : '1/1'}
                        sx={{ borderRadius: 1, mb: 1 }}
                      />
                    )}
                    <Typography variant="subtitle2" noWrap title={pkg.name}>
                      {pkg.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="baseline" flexWrap="wrap">
                      <Typography variant="subtitle2" color="primary.main">
                        {fCurrency(eff)}
                      </Typography>
                      {hasFlash && (
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.disabled', textDecoration: 'line-through' }}
                        >
                          {fCurrency(pkg.price)}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Stack>
        ) : (
          <>
            {colors.length > 0 && (
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">{tp('color')}</Typography>

                <Controller
                  name="colors"
                  control={control}
                  render={({ field }) => (
                    <ColorSinglePicker
                      colors={colors}
                      value={field.value}
                      onChange={field.onChange}
                      sx={{
                        ...(colors.length > 4 && {
                          maxWidth: 144,
                          justifyContent: 'flex-end',
                        }),
                      }}
                    />
                  )}
                />
              </Stack>
            )}

            {sizes.length > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" sx={{ height: 40, lineHeight: '40px', flexGrow: 1 }}>
                  {tp('size')}
                </Typography>

                <RHFSelect
                  name="size"
                  size="small"
                  helperText={
                    <Link underline="always" color="inherit">
                      {tp('size_chart')}
                    </Link>
                  }
                  sx={{
                    maxWidth: 96,
                    '& .MuiFormHelperText-root': {
                      mx: 0,
                      mt: 1,
                      textAlign: 'right',
                    },
                  }}
                >
                  {sizes.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </RHFSelect>
              </Stack>
            )}
          </>
        )}

        {/* Trường tùy chỉnh theo gói (Digital Store) */}
        {packageFields.length > 0 && (
          <Stack spacing={2}>
            <Typography variant="subtitle2">{tp('enter_info')}</Typography>
            {packageFields.map((f) => {
              const isSelect = f.fieldType === 'select';
              const opts = (f.options || '')
                .split(/[\n,]/)
                .map((o) => o.trim())
                .filter(Boolean);
              return (
                <TextField
                  key={f.fieldName}
                  fullWidth
                  size="small"
                  select={isSelect}
                  required={f.isRequired}
                  label={f.fieldName}
                  type={f.fieldType === 'number' ? 'number' : f.fieldType === 'email' ? 'email' : 'text'}
                  multiline={f.fieldType === 'textarea'}
                  minRows={f.fieldType === 'textarea' ? 2 : undefined}
                  value={customFields[f.fieldName] || ''}
                  onChange={(e) => handleChangeCustomField(f.fieldName, e.target.value)}
                >
                  {isSelect &&
                    opts.map((o) => (
                      <MenuItem key={o} value={o}>
                        {o}
                      </MenuItem>
                    ))}
                </TextField>
              );
            })}
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ height: 36, lineHeight: '36px' }}>
            {tp('quantity')}
          </Typography>

          <Stack spacing={1}>
            <IncrementerButton
              name="quantity"
              quantity={values.quantity}
              disabledDecrease={values.quantity <= 1}
              disabledIncrease={values.quantity >= available}
              onIncrease={() => setValue('quantity', values.quantity + 1)}
              onDecrease={() => setValue('quantity', values.quantity - 1)}
            />

            <Typography
              variant="caption"
              component="div"
              sx={{ textAlign: 'right', color: 'text.secondary' }}
            >
              {tp('available')}: {available}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {selectedOutOfStock ? (
          <Button
            fullWidth
            size="large"
            color="info"
            variant="contained"
            disabled={alerting || alerted}
            startIcon={<Iconify icon={alerted ? 'eva:checkmark-fill' : 'solar:bell-bing-bold'} />}
            onClick={handleStockAlert}
          >
            {alerted ? tp('stock_alert_done') : tp('stock_alert_btn')}
          </Button>
        ) : (
          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              disabled={isMaxQuantity || missingRequired}
              size="large"
              color="warning"
              variant="contained"
              startIcon={<Iconify icon="ic:round-add-shopping-cart" />}
              onClick={handleAddCart}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {tp('add_to_cart')}
            </Button>

            <Button fullWidth size="large" type="submit" variant="contained" disabled={missingRequired}>
              {tp('buy_now')}
            </Button>
          </Stack>
        )}

        <Stack direction="row" alignItems="center" justifyContent="center">
          {_socials.map((social) => (
            <IconButton key={social.name}>
              <Iconify icon={social.icon} />
            </IconButton>
          ))}
        </Stack>
      </Stack>
    </FormProvider>
  );
}
