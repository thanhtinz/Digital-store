// form
import { Controller, useFormContext } from 'react-hook-form';
// @mui
import { alpha } from '@mui/material/styles';
import {
  Box,
  Radio,
  Stack,
  Input,
  Badge,
  Button,
  Drawer,
  Rating,
  Divider,
  IconButton,
  Typography,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
// config
import { NAV } from '../../../../config-global';
// locales
import { useLocales } from '../../../../locales';
// components
import Iconify from '../../../../components/iconify';
import Scrollbar from '../../../../components/scrollbar';
import { RHFRadioGroup, RHFSlider } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

export type CategoryOption = { label: string; value: string };

export const FILTER_RATING_OPTIONS = ['up4Star', 'up3Star', 'up2Star', 'up1Star'];

// Phân loại sản phẩm để tách nhóm trên trang gian hàng.
export const PRODUCT_TYPE_VALUES = [
  { value: 'premium', label: 'Tài khoản Premium' },
  { value: 'game', label: 'Nạp game' },
  { value: 'giftcard', label: 'Giftcard' },
  { value: 'source', label: 'Mã nguồn & Theme' },
];

type Props = {
  open: boolean;
  isDefault: boolean;
  categories: CategoryOption[];
  maxPrice: number;
  onOpen: VoidFunction;
  onClose: VoidFunction;
  onResetFilter: VoidFunction;
};

export default function ShopFilterDrawer({
  open,
  onOpen,
  onClose,
  isDefault,
  categories,
  maxPrice,
  onResetFilter,
}: Props) {
  const { control } = useFormContext();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`shop_page.${k}`)}`;

  const options = [{ label: t('all'), value: 'All' }, ...categories];
  const typeOptions = [{ label: t('all'), value: 'All' }, ...PRODUCT_TYPE_VALUES];

  // Mốc giá cho slider (chia 4 nhãn).
  const step = Math.max(1000, Math.round(maxPrice / 100 / 1000) * 1000);
  const fmt = (v: number) => `${(v || 0).toLocaleString('vi-VN')}đ`;

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        endIcon={<Iconify icon="ic:round-filter-list" />}
        onClick={onOpen}
      >
        {t('filters')}
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        BackdropProps={{ invisible: true }}
        PaperProps={{ sx: { width: NAV.W_BASE } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pl: 2, pr: 1, py: 2 }}
        >
          <Typography variant="subtitle1">{t('filters')}</Typography>

          <IconButton onClick={onClose}>
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>

        <Divider />

        <Scrollbar>
          <Stack spacing={3} sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1">Loại sản phẩm</Typography>
              <RHFRadioGroup name="productType" options={typeOptions} />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('category')}</Typography>
              <RHFRadioGroup name="category" options={options} />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('price')}</Typography>

              <Stack direction="row" spacing={2}>
                <InputRange type="min" max={maxPrice} />
                <InputRange type="max" max={maxPrice} />
              </Stack>

              <RHFSlider
                name="priceRange"
                step={step}
                min={0}
                max={maxPrice || 1000000}
                getAriaValueText={(v) => fmt(v)}
                valueLabelFormat={(v) => fmt(v)}
                sx={{ alignSelf: 'center', width: `calc(100% - 20px)` }}
              />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('rating')}</Typography>

              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field}>
                    {FILTER_RATING_OPTIONS.map((item, index) => (
                      <FormControlLabel
                        key={item}
                        value={item}
                        control={
                          <Radio
                            disableRipple
                            color="default"
                            icon={<Rating readOnly value={4 - index} />}
                            checkedIcon={<Rating readOnly value={4 - index} />}
                            sx={{ '&:hover': { bgcolor: 'transparent' } }}
                          />
                        }
                        label={t('and_up')}
                        sx={{
                          my: 0.5,
                          borderRadius: 1,
                          '&:hover': { opacity: 0.48 },
                          ...(field.value === item && { bgcolor: 'action.selected' }),
                        }}
                      />
                    ))}
                  </RadioGroup>
                )}
              />
            </Stack>
          </Stack>
        </Scrollbar>

        <Box sx={{ p: 2.5 }}>
          <Badge
            color="error"
            variant="dot"
            anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            invisible={isDefault}
            sx={{ width: 1 }}
          >
            <Button
              fullWidth
              size="large"
              type="submit"
              color="inherit"
              variant="outlined"
              onClick={onResetFilter}
              startIcon={<Iconify icon="eva:trash-2-outline" />}
            >
              {t('clear')}
            </Button>
          </Badge>
        </Box>
      </Drawer>
    </>
  );
}

// ----------------------------------------------------------------------

function InputRange({ type, max }: { type: 'min' | 'max'; max: number }) {
  const { control, setValue } = useFormContext();
  const { translate } = useLocales();

  const clamp = (value: [number, number]) => {
    let [lo, hi] = value;
    if (lo < 0) lo = 0;
    if (max && hi > max) hi = max;
    setValue('priceRange', [lo, hi]);
  };

  return (
    <Controller
      name="priceRange"
      control={control}
      render={({ field }) => {
        const isMin = type === 'min';
        const lo = field.value[0];
        const hi = field.value[1];

        return (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: 1 }}>
            <Typography
              variant="caption"
              sx={{ flexShrink: 0, color: 'text.disabled', fontWeight: 'fontWeightBold' }}
            >
              {isMin ? `${translate('shop_page.from')}` : `${translate('shop_page.to')}`}
            </Typography>

            <Input
              disableUnderline
              fullWidth
              size="small"
              value={isMin ? lo : hi}
              onChange={(e) =>
                isMin
                  ? field.onChange([Number(e.target.value), hi])
                  : field.onChange([lo, Number(e.target.value)])
              }
              onBlur={() => clamp(field.value)}
              inputProps={{ step: 1000, min: 0, max, type: 'number' }}
              sx={{
                pr: 1,
                py: 0.5,
                borderRadius: 0.75,
                typography: 'body2',
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
                '& .MuiInput-input': { p: 0, textAlign: 'right' },
              }}
            />
          </Stack>
        );
      }}
    />
  );
}
