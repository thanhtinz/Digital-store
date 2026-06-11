// @mui
import { Table, TableBody, TableContainer } from '@mui/material';
// @types
import { ICheckoutCartItem } from '../../../../../@types/product';
// locales
import { useLocales } from '../../../../../locales';
// components
import Scrollbar from '../../../../../components/scrollbar';
import { TableHeadCustom } from '../../../../../components/table';
//
import CheckoutCartProduct from './CheckoutCartProduct';

// ----------------------------------------------------------------------

type Props = {
  products: ICheckoutCartItem[];
  onDelete: (id: string) => void;
  onDecreaseQuantity: (id: string) => void;
  onIncreaseQuantity: (id: string) => void;
};

export default function CheckoutCartProductList({
  products,
  onDelete,
  onIncreaseQuantity,
  onDecreaseQuantity,
}: Props) {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`checkout_page.${k}`)}`;

  const TABLE_HEAD = [
    { id: 'product', label: t('col_product') },
    { id: 'price', label: t('col_price') },
    { id: 'quantity', label: t('col_quantity') },
    { id: 'totalPrice', label: t('col_total'), align: 'right' },
    { id: '' },
  ];

  return (
    <TableContainer sx={{ overflow: 'unset' }}>
      <Scrollbar>
        <Table sx={{ minWidth: 720 }}>
          <TableHeadCustom headLabel={TABLE_HEAD} />

          <TableBody>
            {products.map((row) => (
              <CheckoutCartProduct
                key={row.id}
                row={row}
                onDelete={() => onDelete(row.id)}
                onDecrease={() => onDecreaseQuantity(row.id)}
                onIncrease={() => onIncreaseQuantity(row.id)}
              />
            ))}
          </TableBody>
        </Table>
      </Scrollbar>
    </TableContainer>
  );
}
