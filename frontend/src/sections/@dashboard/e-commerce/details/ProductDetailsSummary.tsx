import { useEffect, useState } from 'react';
import { sentenceCase } from 'change-case';
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
import Label from '../../../../components/label';
import Iconify from '../../../../components/iconify';
import { IncrementerButton } from '../../../../components/custom-input';
import { ColorSinglePicker } from '../../../../components/color-utils';
import FormProvider, { RHFSelect } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

interface FormValuesProps extends Omit<ICheckoutCartItem, 'colors'> {
  colors: string;
}

type Props = {
  product: IProduct;
  cart: ICheckoutCartItem[];
  onAddCart: (cartItem: ICheckoutCartItem) => void;
  onGotoStep: (step: number) => void;
};

export default function ProductDetailsSummary({
  cart,
  product,
  onAddCart,
  onGotoStep,
  ...other
}: Props) {
  const { push } = useRouter();

  const {
    id,
    name,
    sizes,
    price,
    cover,
    status,
    colors,
    available,
    priceSale,
    totalRating,
    totalReview,
    inventoryType,
    packages = [],
  } = product;

  // Digital Store: bán theo gói. Nếu có gói thì dùng gói thay cho size/màu.
  const hasPackages = Array.isArray(packages) && packages.length > 0;
  const defaultPackage = hasPackages ? packages[0] : undefined;

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

  const handleChangePackage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pkgId = event.target.value;
    const pkg = packages.find((p) => String(p.id) === String(pkgId));
    setValue('packageId', pkgId);
    setCustomFields({}); // đổi gói thì xóa dữ liệu trường cũ
    if (pkg) {
      setValue('packageName', pkg.name);
      setValue('price', pkg.price);
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
          <Label
            variant="soft"
            color={inventoryType === 'in_stock' ? 'success' : 'error'}
            sx={{ textTransform: 'uppercase', mr: 'auto' }}
          >
            {sentenceCase(inventoryType || '')}
          </Label>

          <Typography
            variant="overline"
            component="div"
            sx={{
              color: status === 'sale' ? 'error.main' : 'info.main',
            }}
          >
            {status}
          </Typography>

          <Typography variant="h5">{name}</Typography>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Rating value={totalRating} precision={0.1} readOnly />

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              ({fShortenNumber(totalReview)}
              reviews)
            </Typography>
          </Stack>

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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ height: 40, lineHeight: '40px', flexGrow: 1 }}>
              Gói
            </Typography>

            <RHFSelect
              name="packageId"
              size="small"
              onChange={handleChangePackage}
              sx={{ maxWidth: 220 }}
            >
              {packages.map((pkg) => (
                <MenuItem key={pkg.id} value={String(pkg.id)}>
                  {pkg.name} — {fCurrency(pkg.price)}
                </MenuItem>
              ))}
            </RHFSelect>
          </Stack>
        ) : (
          <>
            {colors.length > 0 && (
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Color</Typography>

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
                  Size
                </Typography>

                <RHFSelect
                  name="size"
                  size="small"
                  helperText={
                    <Link underline="always" color="inherit">
                      Size Chart
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
            <Typography variant="subtitle2">Nhập thông tin</Typography>
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
            Quantity
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
              Available: {available}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

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
            Add to Cart
          </Button>

          <Button fullWidth size="large" type="submit" variant="contained" disabled={missingRequired}>
            Buy Now
          </Button>
        </Stack>

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
