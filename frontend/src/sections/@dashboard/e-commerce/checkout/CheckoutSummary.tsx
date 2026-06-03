import { useState } from 'react';
// @mui
import {
  Box,
  Card,
  Stack,
  Button,
  Divider,
  TextField,
  CardHeader,
  Typography,
  CardContent,
  InputAdornment,
} from '@mui/material';
// utils
import axiosInstance from '../../../../utils/axios';
import { fCurrency } from '../../../../utils/formatNumber';
// locales
import { useLocales } from '../../../../locales';
// components
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';

// ----------------------------------------------------------------------

type Props = {
  total: number;
  discount?: number;
  subtotal: number;
  shipping?: number;
  onEdit?: VoidFunction;
  enableEdit?: boolean;
  onApplyDiscount?: (discount: number, code?: string) => void;
  enableDiscount?: boolean;
};

export default function CheckoutSummary({
  total,
  onEdit,
  discount,
  subtotal,
  shipping,
  onApplyDiscount,
  enableEdit = false,
  enableDiscount = false,
}: Props) {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`checkout_page.${k}`)}`;
  const { enqueueSnackbar } = useSnackbar();

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const applied = !!discount && discount > 0;

  const displayShipping = shipping !== null ? t('free') : '-';

  const handleApply = async () => {
    if (!onApplyDiscount) return;
    if (applied) {
      // Bỏ mã đang áp dụng
      onApplyDiscount(0, '');
      setCode('');
      return;
    }
    if (!code.trim()) return;
    setApplying(true);
    const normalized = code.trim().toUpperCase();
    try {
      const r = await axiosInstance.post('/api/gift-codes/quote', {
        code: normalized,
        subtotal,
      });
      const value = Number(r.data?.discount) || 0;
      if (r.data?.valid && value > 0) {
        onApplyDiscount(value, normalized);
        enqueueSnackbar(`${t('coupon_applied')}: -${fCurrency(value)}`);
      } else {
        enqueueSnackbar(t('coupon_invalid'), { variant: 'error' });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || t('coupon_invalid'), { variant: 'error' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={t('order_summary')}
        action={
          enableEdit && (
            <Button size="small" onClick={onEdit} startIcon={<Iconify icon="eva:edit-fill" />}>
              {t('edit')}
            </Button>
          )
        }
      />

      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('sub_total')}
            </Typography>
            <Typography variant="subtitle2">{fCurrency(subtotal)}</Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('discount')}
            </Typography>
            <Typography variant="subtitle2">{discount ? fCurrency(-discount) : '-'}</Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('shipping')}
            </Typography>
            <Typography variant="subtitle2">{shipping ? fCurrency(shipping) : displayShipping}</Typography>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1">{t('total')}</Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle1" sx={{ color: 'error.main' }}>
                {fCurrency(total)}
              </Typography>
              <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                {t('vat_note')}
              </Typography>
            </Box>
          </Stack>

          {enableDiscount && onApplyDiscount && (
            <TextField
              fullWidth
              value={code}
              disabled={applied}
              placeholder={t('coupon_placeholder')}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={handleApply} disabled={applying} sx={{ mr: -0.5 }}>
                      {applied ? t('remove') : t('apply')}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
