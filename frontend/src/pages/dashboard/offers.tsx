import { useEffect, useState } from 'react';
// next
import Head from 'next/head';
// @mui
import {
  Box, Button, Container, Dialog, Divider, IconButton, LinearProgress, Stack, Typography,
} from '@mui/material';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Iconify from '../../components/iconify';
import EmptyContent from '../../components/empty-content';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

OffersPage.getLayout = (page: React.ReactElement) => <DashboardLayout disableGuard>{page}</DashboardLayout>;

type Coupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  description?: string;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number;
  usage_count?: number;
  usage_remaining?: number | null;
  scope_type?: string;
  scope_label?: string;
  payment_scope?: string;
  payment_label?: string;
  allowed_ranks?: string[];
};

const discountText = (c: Coupon) =>
  c.discount_type === 'percent' ? `Giảm ${c.discount_value}%` : `Giảm ${fCurrency(c.discount_value)}`;

export default function OffersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Coupon | null>(null);

  useEffect(() => {
    axiosInstance
      .get('/api/gift-codes/public')
      .then((c) => setCoupons(Array.isArray(c.data) ? c.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    enqueueSnackbar(`Đã sao chép mã ${code}`);
  };

  return (
    <>
      <Head>
        <title> Ưu đãi | Digital Store</title>
      </Head>

      <Container sx={{ pb: 6 }}>
        <Typography variant="h4" sx={{ my: 3 }}>Ưu đãi</Typography>

        {loading && <LinearProgress />}

        {!loading && coupons.length === 0 ? (
          <EmptyContent title="Chưa có ưu đãi nào" img="/assets/illustrations/illustration_empty_content.svg" />
        ) : (
          <Stack spacing={2.5}>
            {coupons.map((c) => (
              <VoucherTicket key={c.code} coupon={c} onClick={() => setSelected(c)} />
            ))}
          </Stack>
        )}
      </Container>

      <VoucherDialog coupon={selected} onClose={() => setSelected(null)} onCopy={copy} />
    </>
  );
}

// ── Vé ưu đãi (ảnh 1) ──────────────────────────────────
function VoucherTicket({ coupon, onClick }: { coupon: Coupon; onClick: () => void }) {
  const remaining = coupon.usage_remaining;
  const total = coupon.usage_limit || 0;
  const usedPct = total > 0 && remaining != null ? ((total - remaining) / total) * 100 : 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', borderRadius: 2, overflow: 'hidden', cursor: 'pointer', bgcolor: 'background.paper',
        boxShadow: (t) => t.customShadows.z8, transition: (t) => t.transitions.create('box-shadow'),
        '&:hover': { boxShadow: (t) => t.customShadows.z16 },
      }}
    >
      {/* Cột trái xanh */}
      <Box
        sx={{
          width: 120, flexShrink: 0, color: 'common.white', position: 'relative',
          display: 'grid', placeItems: 'center', textAlign: 'center', py: 3,
          background: 'linear-gradient(160deg, #1f8f4e 0%, #2e7d32 100%)',
        }}
      >
        <Box>
          <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 1, borderRadius: '50%', border: '2px solid rgba(255,255,255,.9)', display: 'grid', placeItems: 'center' }}>
            <Iconify icon="solar:gift-bold" width={30} />
          </Box>
          <Typography variant="overline" sx={{ lineHeight: 1.2, display: 'block', fontWeight: 700 }}>VOUCHER<br />SPECIAL</Typography>
        </Box>
        {/* khuyết răng cưa */}
        <Box sx={{ position: 'absolute', right: -6, top: 0, bottom: 0, width: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {[...Array(7)].map((_, i) => (
            <Box key={i} sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'background.paper' }} />
          ))}
        </Box>
      </Box>

      {/* Nội dung */}
      <Box sx={{ flexGrow: 1, p: 2.5, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          {remaining != null ? (
            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 5, bgcolor: 'success.lighter', color: 'success.dark' }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Còn {remaining}/{total} lượt</Typography>
            </Box>
          ) : <Box />}
          {coupon.expires_at && (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {new Date(coupon.expires_at).toLocaleDateString('vi-VN')}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h4">{discountText(coupon)}</Typography>
          {coupon.min_order > 0 && (
            <Typography variant="body2" color="text.secondary">từ {fCurrency(coupon.min_order)}</Typography>
          )}
        </Stack>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
          {coupon.max_discount ? `Giảm tối đa ${fCurrency(coupon.max_discount)}` : coupon.description || 'Ưu đãi đặc biệt'}
          {coupon.payment_label && coupon.payment_scope !== 'all' ? ` khi ${coupon.payment_label.toLowerCase()}.` : '.'}
        </Typography>

        {remaining != null && total > 0 && (
          <LinearProgress variant="determinate" value={usedPct} sx={{ mt: 2, height: 6, borderRadius: 3 }} />
        )}
      </Box>
    </Box>
  );
}

// ── Popup chi tiết (ảnh 2) ─────────────────────────────
function VoucherDialog({ coupon, onClose, onCopy }: { coupon: Coupon | null; onClose: () => void; onCopy: (c: string) => void }) {
  return (
    <Dialog open={!!coupon} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, overflow: 'visible' } }}>
      {coupon && (
        <Box>
          {/* Header xanh */}
          <Box sx={{ position: 'relative', p: 3, color: 'common.white', borderRadius: '12px 12px 0 0', background: 'linear-gradient(160deg, #1f8f4e 0%, #2e7d32 60%, #f1a832 160%)' }}>
            <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, color: 'common.white', bgcolor: 'rgba(255,255,255,.2)' }} size="small">
              <Iconify icon="eva:close-fill" />
            </IconButton>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid rgba(255,255,255,.9)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Iconify icon="solar:gift-bold" width={30} />
              </Box>
              <Box sx={{ bgcolor: 'common.white', borderRadius: 2, p: 1.5, flexGrow: 1 }}>
                {coupon.usage_remaining != null && (
                  <Box sx={{ display: 'inline-block', px: 1.5, py: 0.25, borderRadius: 5, bgcolor: 'success.lighter', color: 'success.dark', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Số lượng có hạn</Typography>
                  </Box>
                )}
                <Typography variant="h5" color="text.primary">{discountText(coupon)}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {coupon.min_order > 0 ? `cho đơn từ ${fCurrency(coupon.min_order)}` : 'cho mọi đơn hàng'}
                </Typography>
                <Box sx={{ mt: 1, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle1" color="success.dark" sx={{ letterSpacing: 1 }}>{coupon.code}</Typography>
                </Box>
              </Box>
            </Stack>
          </Box>

          {/* Thân */}
          <Box sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'warning.main', mb: 2 }}>
              <Iconify icon="solar:info-circle-bold" />
              <Typography variant="subtitle1">Lưu mã ngay hôm nay!</Typography>
            </Stack>

            <Section label="HẠN SỬ DỤNG MÃ">
              {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn'}
            </Section>

            <Section label="ƯU ĐÃI">
              {coupon.description || `${coupon.code} ${discountText(coupon).toLowerCase()}${coupon.min_order > 0 ? `, áp dụng từ đơn hàng ${fCurrency(coupon.min_order)}` : ''}.`}
            </Section>

            <Section label="ÁP DỤNG CHO SẢN PHẨM">
              <Typography variant="body2">{coupon.scope_label || 'Áp dụng cho tất cả sản phẩm / dịch vụ'}</Typography>
              <Typography variant="body2">Đơn tối thiểu: <b style={{ color: '#7635dc' }}>{coupon.min_order > 0 ? fCurrency(coupon.min_order) : 'Không'}</b></Typography>
              {coupon.max_discount ? (
                <Typography variant="body2">Giảm tối đa: <b style={{ color: '#7635dc' }}>{fCurrency(coupon.max_discount)}</b></Typography>
              ) : null}
            </Section>

            <Section label="CƠ CHẾ ÁP DỤNG">
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="solar:wallet-bold" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2">{coupon.payment_label || 'Mọi hình thức thanh toán'}</Typography>
                </Stack>
                {coupon.usage_remaining != null && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:ticket-bold" sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2">Còn {coupon.usage_remaining}/{coupon.usage_limit} lượt</Typography>
                  </Stack>
                )}
                {coupon.allowed_ranks && coupon.allowed_ranks.length > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:crown-bold" sx={{ color: 'warning.main' }} />
                    <Typography variant="body2">Dành cho hạng: {coupon.allowed_ranks.join(', ')}</Typography>
                  </Stack>
                )}
              </Stack>
            </Section>

            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

            <Button fullWidth variant="outlined" size="large" onClick={() => onCopy(coupon.code)} startIcon={<Iconify icon="solar:copy-bold" />} sx={{ mb: 1.5 }}>
              Sao chép mã
            </Button>
            <Button fullWidth variant="contained" size="large" color="success" onClick={onClose}>
              Đồng ý
            </Button>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: 0.5 }}>{label}</Typography>
      <Box sx={{ mt: 0.5, color: 'text.primary' }}>
        {typeof children === 'string' ? <Typography variant="body2">{children}</Typography> : children}
      </Box>
    </Box>
  );
}
