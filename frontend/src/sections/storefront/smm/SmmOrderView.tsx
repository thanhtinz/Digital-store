import { useEffect, useMemo, useState } from 'react';
// @mui
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Container,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// utils
import axiosInstance from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';
// components
import Iconify from '../../../components/iconify';
import { useSnackbar } from '../../../components/snackbar';

// ----------------------------------------------------------------------

type Service = {
  id: number;
  name: string;
  description?: string;
  rate: number;
  min_quantity: number;
  max_quantity: number;
  service_type?: string;
  avg_time_minutes?: number | null;
  can_refill?: boolean;
  can_cancel?: boolean;
};
type Category = { id: number; name: string; services: Service[] };
type Platform = { id: number; name: string; categories: Category[] };

// Định dạng thời gian trung bình từ phút.
function fAvgTime(min?: number | null) {
  if (!min || min <= 0) return null;
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

// ----------------------------------------------------------------------

export default function SmmOrderView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();

  const [catalog, setCatalog] = useState<Platform[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [extra, setExtra] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // Drip-feed (chia nhỏ đơn)
  const [dripOn, setDripOn] = useState(false);
  const [runs, setRuns] = useState(2);
  const [interval, setIntervalMin] = useState(30);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/smm/catalog')
      .then((res) => {
        if (alive) setCatalog(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Số dư hiện tại (để cảnh báo không đủ tiền).
  const refreshBalance = () => {
    axiosInstance
      .get('/api/balance/me')
      .then((r) => {
        const v = Number(r.data?.balance);
        if (Number.isFinite(v)) setBalance(v);
      })
      .catch(() => {});
  };
  useEffect(() => {
    if (isAuthenticated) refreshBalance();
  }, [isAuthenticated]);

  const platform = catalog.find((p) => String(p.id) === platformId);
  const categories = platform?.categories || [];
  const category = categories.find((c) => String(c.id) === categoryId);
  const services = category?.services || [];
  const service = services.find((s) => String(s.id) === serviceId);

  const stype = service?.service_type || 'Default';
  const isComments = stype === 'Custom Comments';
  const isHashtag = stype === 'Mentions Hashtag';
  const isSeo = stype === 'SEO';
  const isPackage = stype === 'Package';
  const canDrip = !isComments && !isPackage; // drip-feed cho dịch vụ số lượng thường

  const effectiveQty = isComments
    ? extra.split('\n').map((l) => l.trim()).filter(Boolean).length
    : isPackage
    ? 1
    : quantity;

  const estimate = useMemo(
    () => (service ? (service.rate * effectiveQty) / 1000 : 0),
    [service, effectiveQty]
  );

  const insufficient = balance != null && estimate > balance;
  const avgTime = fAvgTime(service?.avg_time_minutes);

  const handleSubmit = async () => {
    if (!service) return;
    if (!isAuthenticated) {
      enqueueSnackbar('Vui lòng đăng nhập để đặt đơn', { variant: 'warning' });
      return;
    }
    const extras: Record<string, string> = {};
    if (isComments) extras.comments = extra;
    if (isHashtag) extras.hashtags = extra;
    if (isSeo) extras.keywords = extra;

    setSubmitting(true);
    try {
      await axiosInstance.post('/api/smm/orders', {
        service_id: service.id,
        link,
        quantity: effectiveQty,
        extras,
        repeat_count: dripOn && canDrip ? runs : 0,
        repeat_interval: dripOn && canDrip ? interval : 0,
      });
      enqueueSnackbar('Đặt đơn thành công!');
      setLink('');
      setExtra('');
      refreshBalance(); // cập nhật số dư sau khi trừ tiền
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Đặt đơn thất bại', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container sx={{ pb: 6 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ my: 3, gap: 1 }}
      >
        <Typography variant="h4">Đặt đơn dịch vụ</Typography>
        {isAuthenticated && (
          <Chip
            color="primary"
            variant="soft"
            icon={<Iconify icon="solar:wallet-money-bold-duotone" />}
            label={`Số dư: ${balance == null ? '…' : fCurrency(balance)}`}
          />
        )}
      </Stack>

      <Card sx={{ p: 3, maxWidth: 640 }}>
        <Stack spacing={2.5}>
          <TextField
            select
            label="Nền tảng"
            value={platformId}
            onChange={(e) => {
              setPlatformId(e.target.value);
              setCategoryId('');
              setServiceId('');
            }}
          >
            {catalog.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Danh mục"
            value={categoryId}
            disabled={!platform}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setServiceId('');
            }}
          >
            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Dịch vụ"
            value={serviceId}
            disabled={!category}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name} — {fCurrency(s.rate)}/1000
              </MenuItem>
            ))}
          </TextField>

          {service && (
            <>
              {/* Thông tin dịch vụ */}
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 1, mb: service.description ? 1.5 : 0 }}>
                  <Chip size="small" variant="soft" label={`Giá ${fCurrency(service.rate)}/1000`} />
                  <Chip size="small" variant="soft" label={`Tối thiểu ${service.min_quantity.toLocaleString()}`} />
                  <Chip size="small" variant="soft" label={`Tối đa ${service.max_quantity.toLocaleString()}`} />
                  {avgTime && (
                    <Chip
                      size="small"
                      variant="soft"
                      color="info"
                      icon={<Iconify icon="solar:clock-circle-bold" />}
                      label={`~${avgTime}`}
                    />
                  )}
                  {service.can_refill && (
                    <Chip size="small" variant="soft" color="success" icon={<Iconify icon="solar:refresh-bold" />} label="Bảo hành" />
                  )}
                  {service.can_cancel && (
                    <Chip size="small" variant="soft" color="warning" label="Có thể huỷ" />
                  )}
                </Stack>
                {service.description && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                    {service.description}
                  </Typography>
                )}
              </Box>

              <TextField
                label="Link"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />

              {isComments || isHashtag || isSeo ? (
                <TextField
                  label={isComments ? 'Bình luận (mỗi dòng 1)' : isHashtag ? 'Hashtag' : 'Từ khoá SEO'}
                  multiline
                  minRows={3}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              ) : (
                <TextField
                  label="Số lượng"
                  type="number"
                  value={quantity}
                  disabled={isPackage}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 0))}
                  helperText={`Tối thiểu ${service.min_quantity} - tối đa ${service.max_quantity}`}
                />
              )}

              {/* Drip-feed (chia nhỏ đơn) */}
              {canDrip && (
                <Box sx={{ border: (t) => `dashed 1px ${t.palette.divider}`, borderRadius: 1.5, p: 2 }}>
                  <FormControlLabel
                    control={<Switch checked={dripOn} onChange={(e) => setDripOn(e.target.checked)} />}
                    label="Drip-feed (giao dần để tăng tự nhiên)"
                  />
                  <Collapse in={dripOn}>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Số lần (runs)"
                        value={runs}
                        onChange={(e) => setRuns(Math.max(2, Number(e.target.value) || 2))}
                        helperText="Giao thành nhiều lần"
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Cách nhau (phút)"
                        value={interval}
                        onChange={(e) => setIntervalMin(Math.max(1, Number(e.target.value) || 1))}
                        helperText="Khoảng cách mỗi lần"
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                      Mỗi lần giao {effectiveQty.toLocaleString()}, tổng {runs} lần, cách nhau {interval} phút.
                    </Typography>
                  </Collapse>
                </Box>
              )}

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Tạm tính</Typography>
                <Typography variant="subtitle1" color="primary.main">
                  {fCurrency(estimate)}
                </Typography>
              </Stack>

              {insufficient && (
                <Alert severity="warning">
                  Số dư không đủ. Cần {fCurrency(estimate)}, hiện có {fCurrency(balance || 0)}. Vui lòng nạp thêm.
                </Alert>
              )}

              <Button
                size="large"
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || !link || effectiveQty < 1 || insufficient}
              >
                Đặt đơn
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
