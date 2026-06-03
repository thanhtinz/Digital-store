// @mui
import { Box, Stack, TableRow, TableCell, Typography, IconButton } from '@mui/material';
// utils
import { fCurrency } from '../../../../../utils/formatNumber';
// @types
import { ICheckoutCartItem } from '../../../../../@types/product';
// locales
import { useLocales } from '../../../../../locales';
// components
import Image from '../../../../../components/image';
import Label from '../../../../../components/label';
import Iconify from '../../../../../components/iconify';
import { IncrementerButton } from '../../../../../components/custom-input';

// ----------------------------------------------------------------------

type CheckoutProductListRowProps = {
  row: ICheckoutCartItem;
  onDelete: VoidFunction;
  onDecrease: VoidFunction;
  onIncrease: VoidFunction;
};

export default function CheckoutCartProduct({
  row,
  onDelete,
  onDecrease,
  onIncrease,
}: CheckoutProductListRowProps) {
  const { translate } = useLocales();
  const { name, size, price, cover, quantity, available } = row;
  const pkgLabel = (row as any).packageName || size;

  return (
    <TableRow>
      <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
        <Image
          alt="product image"
          src={cover}
          sx={{ width: 64, height: 64, borderRadius: 1.5, mr: 2 }}
        />

        <Stack spacing={0.5}>
          <Typography noWrap variant="subtitle2" sx={{ maxWidth: 240 }}>
            {name}
          </Typography>

          {pkgLabel && (
            <Stack direction="row" alignItems="center" sx={{ typography: 'body2', color: 'text.secondary' }}>
              {`${translate('product_page.package')}`}:
              <Label color="info" sx={{ ml: 0.5 }}>
                {pkgLabel}
              </Label>
            </Stack>
          )}
        </Stack>
      </TableCell>

      <TableCell>{fCurrency(price)}</TableCell>

      <TableCell>
        <Box sx={{ width: 96, textAlign: 'right' }}>
          <IncrementerButton
            quantity={quantity}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            disabledDecrease={quantity <= 1}
            disabledIncrease={quantity >= available}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {`${translate('product_page.available')}`}: {available}
          </Typography>
        </Box>
      </TableCell>

      <TableCell align="right">{fCurrency(price * quantity)}</TableCell>

      <TableCell align="right">
        <IconButton onClick={onDelete}>
          <Iconify icon="eva:trash-2-outline" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
