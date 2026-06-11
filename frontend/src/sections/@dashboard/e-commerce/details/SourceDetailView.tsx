import { useEffect, useState } from 'react';
// @mui
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Grid,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../../../utils/axios';
import { fDateTime } from '../../../../utils/formatTime';
// @types
import { IProduct, ICheckoutCartItem } from '../../../../@types/product';
// components
import Iconify from '../../../../components/iconify';
import Markdown from '../../../../components/markdown';
//
import ProductDetailsCarousel from './ProductDetailsCarousel';
import ProductDetailsSummary from './ProductDetailsSummary';
import ProductDetailsReview from './ProductDetailsReview';

// ----------------------------------------------------------------------

type Props = {
  product: IProduct;
  cart: ICheckoutCartItem[];
  onAddCart: (cartProduct: ICheckoutCartItem) => void;
  onGotoStep: (step: number) => void;
};

type Version = {
  id: number;
  version: string;
  changelog?: string | null;
  fileSize?: string | null;
  isLatest: boolean;
  releasedAt?: string;
};

export default function SourceDetailView({ product, cart, onAddCart, onGotoStep }: Props) {
  const p: any = product;
  // Đọc phòng thủ: sourceMeta có thể là object (bình thường) hoặc chuỗi JSON
  // (nếu bị double-encode ở đâu đó) — parse lại để không bị mất hết thông số.
  const meta: any = (() => {
    const raw = p.sourceMeta;
    if (raw && typeof raw === 'string') {
      try {
        return JSON.parse(raw) || {};
      } catch {
        return {};
      }
    }
    return raw || {};
  })();
  // techStack có thể là mảng hoặc chuỗi "React, Next.js" — chuẩn hoá về mảng.
  const tech: string[] = Array.isArray(meta.techStack)
    ? meta.techStack
    : typeof meta.techStack === 'string'
      ? meta.techStack.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  const [versions, setVersions] = useState<Version[]>([]);
  const [tab, setTab] = useState('description');

  // Nhập license → lấy link tải.
  const [licenseKey, setLicenseKey] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);

  useEffect(() => {
    if (!p.id) return;
    axiosInstance
      .get(`/api/source/${p.id}/versions`)
      .then((r) => setVersions(r.data?.items || []))
      .catch(() => {});
  }, [p.id]);

  const latest = versions.find((v) => v.isLatest) || versions[0];

  const redeem = async () => {
    if (!licenseKey.trim()) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const r = await axiosInstance.post('/api/source/redeem', { license_key: licenseKey.trim() });
      setRedeemMsg({ type: 'success', text: `Link tải sẵn sàng (hết hạn ${fDateTime(r.data?.expires_at)})`, url: r.data?.download_url });
    } catch (e: any) {
      setRedeemMsg({ type: 'error', text: e?.detail || e?.response?.data?.detail || 'Không tạo được link' });
    } finally {
      setRedeeming(false);
    }
  };

  const SpecRow = ({ label, value }: { label: string; value?: React.ReactNode }) =>
    value ? (
      <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
        <Box sx={{ textAlign: 'right', maxWidth: '60%' }}>{value}</Box>
      </Stack>
    ) : null;

  // Tab "Mô tả": mô tả + thông số kỹ thuật + khu vực tải bằng license (gộp chung).
  const descriptionTab = (
    <Stack spacing={4}>
      {product.description && <Markdown children={product.description} />}

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>Thông số kỹ thuật</Typography>
        {!!tech.length && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.5 }}>
            {tech.map((t) => (
              <Chip key={t} size="small" label={t} variant="soft" color="primary" />
            ))}
          </Stack>
        )}
        <Divider sx={{ mb: 1 }} />
        {(() => {
          const rows = [
            { label: 'Ngôn ngữ', value: meta.language },
            { label: 'Phiên bản mới nhất', value: latest ? `v${latest.version}` : null },
            { label: 'Cập nhật', value: latest?.releasedAt ? fDateTime(latest.releasedAt) : null },
            { label: 'Dung lượng', value: latest?.fileSize },
            { label: 'Tương thích', value: meta.compatibility },
            {
              label: 'Tài liệu',
              value: meta.documentationUrl ? (
                <Link href={meta.documentationUrl} target="_blank" rel="noopener">Xem tài liệu</Link>
              ) : null,
            },
          ];
          const hasAny = tech.length > 0 || rows.some((r) => r.value);
          return hasAny ? (
            rows.map((r) => <SpecRow key={r.label} label={r.label} value={r.value} />)
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Chưa cập nhật thông số kỹ thuật.
            </Typography>
          );
        })()}
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>Tải mã nguồn</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Đã mua? Nhập license key để lấy link tải. Link dùng một lần và sẽ hết hạn — bạn cũng có thể vào{' '}
          <Link href="/dashboard/downloads">Tải xuống của tôi</Link>.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="stretch" sx={{ maxWidth: 480 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="VD: A1B2-C3D4-E5F6-7G8H"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={redeem}
            disabled={redeeming || !licenseKey.trim()}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap', px: 2.5 }}
          >
            Lấy link
          </Button>
        </Stack>
        {redeemMsg && (
          <Alert severity={redeemMsg.type} sx={{ mt: 1.5, maxWidth: 480 }}>
            {redeemMsg.text}
            {redeemMsg.url && (
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="contained" href={redeemMsg.url} startIcon={<Iconify icon="solar:download-bold" />}>
                  Tải xuống
                </Button>
              </Box>
            )}
            {redeemMsg.type === 'error' && /hết lượt|ticket/i.test(redeemMsg.text) && (
              <Box sx={{ mt: 1 }}>
                <Button size="small" href="/dashboard/support" startIcon={<Iconify icon="solar:ticket-bold" />}>
                  Tạo ticket hỗ trợ
                </Button>
              </Box>
            )}
          </Alert>
        )}
      </Box>
    </Stack>
  );

  const TABS = [
    { value: 'description', label: 'Mô tả', component: descriptionTab },
    {
      value: 'changelog',
      label: `Changelog (${versions.length})`,
      component: (
        <Stack spacing={2}>
          {versions.map((v) => (
            <Box key={v.id}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">v{v.version}</Typography>
                {v.isLatest && <Chip size="small" color="success" variant="soft" label="mới nhất" />}
                {v.releasedAt && (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>{fDateTime(v.releasedAt)}</Typography>
                )}
              </Stack>
              {v.changelog && (
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', mt: 0.5 }}>
                  {v.changelog}
                </Typography>
              )}
            </Box>
          ))}
          {!versions.length && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Chưa có phiên bản.</Typography>
          )}
        </Stack>
      ),
    },
    {
      value: 'requirements',
      label: 'Yêu cầu',
      component: (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary' }}>
          {meta.requirements || 'Không có yêu cầu đặc biệt.'}
        </Typography>
      ),
    },
    {
      value: 'reviews',
      label: `Đánh giá (${product.reviews?.length || 0})`,
      component: <ProductDetailsReview product={product} />,
    },
  ];

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={7}>
          <ProductDetailsCarousel product={product} />

          {meta.demoUrl && (
            <Button
              fullWidth
              size="large"
              variant="contained"
              color="info"
              href={meta.demoUrl}
              target="_blank"
              rel="noopener"
              startIcon={<Iconify icon="solar:eye-bold" />}
              sx={{ mt: 2 }}
            >
              Xem demo trực tiếp
            </Button>
          )}
        </Grid>

        <Grid item xs={12} md={6} lg={5}>
          <ProductDetailsSummary product={product} cart={cart} onAddCart={onAddCart} onGotoStep={onGotoStep} />
        </Grid>
      </Grid>

      <Card sx={{ mt: 5 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: 3, bgcolor: 'background.neutral' }}>
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
        <Divider />
        {TABS.map(
          (t) =>
            t.value === tab && (
              <Box key={t.value} sx={{ ...(tab !== 'reviews' && { p: 3 }) }}>
                {t.component}
              </Box>
            )
        )}
      </Card>
    </>
  );
}
