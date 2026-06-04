import { useEffect, useState } from 'react';
// next
import { useRouter } from 'next/router';
// @mui
import {
  Box,
  Card,
  Stack,
  Button,
  Rating,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// utils
import axiosInstance from '../../../../utils/axios';
import { fCurrency, fShortenNumber } from '../../../../utils/formatNumber';
// @types
import { IProduct, ICheckoutCartItem } from '../../../../@types/product';
// components
import Image from '../../../../components/image';
import Label from '../../../../components/label';
import Iconify from '../../../../components/iconify';
import Markdown from '../../../../components/markdown';
import { IncrementerButton } from '../../../../components/custom-input';
import { useSnackbar } from '../../../../components/snackbar';
// auth + locales
import { useAuthContext } from '../../../../auth/useAuthContext';
import { useLocales } from '../../../../locales';

// ----------------------------------------------------------------------
// Trang chi tiết RIÊNG cho sản phẩm TOPUP (game) và GIFT CARD — dựng lại
// theo thiết kế storefront gốc (Python port), KHÔNG dùng layout premium.
//   - Game: header ngang (thumb + TOP UP + UID/Login + server).
//   - Giftcard: tên lớn ở giữa.
//   - Lưới thẻ gói chọn được (ảnh, badge SALE/hết hàng), form nhập thông tin,
//     số lượng, tạm tính, nút Mua ngay / Thêm giỏ.
// ----------------------------------------------------------------------

type Props = {
  product: IProduct;
  cart: ICheckoutCartItem[];
  onAddCart: (item: ICheckoutCartItem) => void;
  onGotoStep: (step: number) => void;
};

export default function TopupGiftcardDetailView({ product, onAddCart, onGotoStep }: Props) {
  const { push } = useRouter();
  const { translate } = useLocales();
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const tp = (k: string) => `${translate(`product_page.${k}`)}`;

  const p: any = product;
  const isGiftcard = p.productType === 'giftcard';
  const topupType: string | null = p.topupType || null;
  const serverRegion: string | null = p.serverRegion || null;
  const cover: string = p.cover || p.imageUrl || '';
  const packages: any[] = Array.isArray(p.packages) ? p.packages : [];

  const pkgPrice = (pkg: any) => (pkg?.flashSale?.salePrice ?? pkg?.price) || 0;

  const [packageId, setPackageId] = useState<string>(packages[0] ? String(packages[0].id) : '');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);

  useEffect(() => {
    setPackageId(packages[0] ? String(packages[0].id) : '');
    setCustomFields({});
    setQuantity(1);
    setAlerted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  const selectedPackage = packages.find((pk) => String(pk.id) === packageId);
  const packageFields: any[] = selectedPackage?.fields || [];
  const unitPrice = selectedPackage ? pkgPrice(selectedPackage) : 0;
  const selectedOOS =
    !!selectedPackage && selectedPackage.isStockManaged && (selectedPackage.stockQuantity || 0) <= 0;
  const maxQty = selectedPackage?.isStockManaged ? selectedPackage.stockQuantity || 0 : 99;
  const missingRequired = packageFields
    .filter((f) => f.isRequired)
    .some((f) => !(customFields[f.fieldName] || '').trim());
  const subtotal = unitPrice * quantity;

  const inStock = packages.some(
    (pk) => pk.isActive !== false && (!pk.isStockManaged || (pk.stockQuantity || 0) > 0)
  );

  const selectPkg = (pkg: any) => {
    setPackageId(String(pkg.id));
    setCustomFields({});
    setQuantity(1);
    setAlerted(false);
  };

  const buildItem = (): ICheckoutCartItem =>
    ({
      id: p.id,
      name: p.name,
      cover,
      available: maxQty,
      price: unitPrice,
      colors: [],
      size: '',
      quantity,
      subtotal,
      packageId,
      packageName: selectedPackage?.name,
      customFields,
    } as ICheckoutCartItem);

  const handleAdd = () => {
    if (missingRequired || !selectedPackage) return;
    onAddCart(buildItem());
  };

  const handleBuy = () => {
    if (missingRequired || !selectedPackage) return;
    onAddCart(buildItem());
    onGotoStep(0);
    push(PATH_DASHBOARD.eCommerce.checkout);
  };

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

  return (
    <Stack spacing={3}>
      {/* ── HEADER ───────────────────────────────────────── */}
      {isGiftcard ? (
        <Card sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
          <Label color="info" variant="filled" sx={{ mb: 1.5 }}>
            <Iconify icon="solar:gift-bold" sx={{ mr: 0.5 }} /> GIFT CARD
          </Label>
          <Typography variant="h3">{p.name}</Typography>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 1 }}>
            <Rating value={p.totalRating || p.rating || 0} precision={0.1} readOnly size="small" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              ({fShortenNumber(p.totalReview || p.ratingCount || 0)} {tp('reviews')})
            </Typography>
          </Stack>
        </Card>
      ) : (
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
            {cover ? (
              <Image
                src={cover}
                alt={p.name}
                sx={{
                  flexShrink: 0,
                  borderRadius: 2,
                  width: { xs: '100%', sm: 150 },
                  height: { xs: 200, sm: 150 },
                }}
              />
            ) : (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  flexShrink: 0,
                  borderRadius: 2,
                  width: { xs: '100%', sm: 150 },
                  height: { xs: 200, sm: 150 },
                  bgcolor: 'background.neutral',
                  color: 'text.disabled',
                }}
              >
                <Iconify icon="solar:gamepad-bold" width={48} />
              </Stack>
            )}

            <Stack spacing={1.25}>
              <Label variant="filled" color="warning" sx={{ mr: 'auto' }}>
                <Iconify icon="solar:gamepad-bold" sx={{ mr: 0.5 }} /> TOP UP
              </Label>
              <Typography variant="h4">{p.name}</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Rating value={p.totalRating || p.rating || 0} precision={0.1} readOnly size="small" />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ({fShortenNumber(p.totalReview || p.ratingCount || 0)} {tp('reviews')})
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {topupType && (
                  <Label
                    variant="soft"
                    color="default"
                    startIcon={
                      <Iconify icon={topupType === 'uid' ? 'solar:user-id-bold' : 'solar:login-3-bold'} />
                    }
                  >
                    {topupType === 'uid' ? 'UID' : 'Đăng nhập'}
                  </Label>
                )}
                {serverRegion && (
                  <Label variant="soft" color="default">
                    {serverRegion === 'vietnam' ? '🇻🇳 Việt Nam' : '🌐 Quốc tế'}
                  </Label>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Card>
      )}

      {/* ── PURCHASE CARD ────────────────────────────────── */}
      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          {/* Packages */}
          {packages.length > 0 ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">{tp('package')}</Typography>
              <Box
                display="grid"
                gap={1.5}
                gridTemplateColumns={{
                  xs: 'repeat(2, 1fr)',
                  sm: isGiftcard ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
                  md: isGiftcard ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                }}
              >
                {packages.map((pkg: any) => {
                  const selected = String(pkg.id) === packageId;
                  const oos = pkg.isStockManaged && (pkg.stockQuantity || 0) <= 0;
                  const eff = pkgPrice(pkg);
                  const hasFlash = !!pkg.flashSale?.salePrice && pkg.price > eff;
                  const showImg = !!pkg.imageUrl;
                  return (
                    <Box
                      key={pkg.id}
                      onClick={() => !oos && selectPkg(pkg)}
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
                        <Label
                          color="error"
                          variant="filled"
                          sx={{ position: 'absolute', top: 6, left: 6, zIndex: 9 }}
                        >
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
                      <Stack direction="row" spacing={0.5} alignItems="baseline" sx={{ flexWrap: 'wrap' }}>
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
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tp('out_of_stock')}
            </Typography>
          )}

          {/* Custom fields */}
          {packageFields.length > 0 && (
            <Stack spacing={2}>
              <Typography variant="subtitle1">{tp('enter_info')}</Typography>
              {packageFields.map((f: any) => {
                const isSelect = f.fieldType === 'select';
                const opts = (f.options || '')
                  .split(/[\n,]/)
                  .map((o: string) => o.trim())
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
                    onChange={(e) => setCustomFields((prev) => ({ ...prev, [f.fieldName]: e.target.value }))}
                  >
                    {isSelect &&
                      opts.map((o: string) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                  </TextField>
                );
              })}
            </Stack>
          )}

          {/* Quantity */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">{tp('quantity')}</Typography>
            <Stack spacing={0.5} alignItems="flex-end">
              <IncrementerButton
                name="quantity"
                quantity={quantity}
                disabledDecrease={quantity <= 1}
                disabledIncrease={quantity >= maxQty}
                onIncrease={() => setQuantity((q) => q + 1)}
                onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
              />
              {selectedPackage?.isStockManaged && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {tp('available')}: {selectedPackage.stockQuantity || 0}
                </Typography>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          {/* Price summary */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">Tạm tính</Typography>
            <Typography variant="h4" color="primary.main">
              {fCurrency(subtotal)}
            </Typography>
          </Stack>

          {/* Actions */}
          {selectedOOS ? (
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
          ) : !inStock ? (
            <Button fullWidth size="large" variant="contained" disabled>
              {tp('out_of_stock')}
            </Button>
          ) : !isAuthenticated ? (
            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<Iconify icon="solar:login-3-bold" />}
              onClick={() => push(PATH_DASHBOARD.eCommerce.checkout)}
            >
              {tp('buy_now')}
            </Button>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                size="large"
                color="warning"
                variant="contained"
                disabled={missingRequired}
                startIcon={<Iconify icon="ic:round-add-shopping-cart" />}
                onClick={handleAdd}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {tp('add_to_cart')}
              </Button>
              <Button
                fullWidth
                size="large"
                variant="contained"
                disabled={missingRequired}
                startIcon={<Iconify icon="solar:bolt-bold" />}
                onClick={handleBuy}
              >
                {tp('buy_now')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* ── DESCRIPTION ──────────────────────────────────── */}
      {!!p.description && (
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Mô tả sản phẩm
          </Typography>
          <Markdown children={p.description} />
        </Card>
      )}
    </Stack>
  );
}
