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
// locales
import { useLocales } from '../../../locales';
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

// ----------------------------------------------------------------------

export default function SmmOrderView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`smm_order.${k}`)}`;

  // Định dạng thời gian trung bình từ phút (đơn vị theo ngôn ngữ).
  const fAvgTime = (min?: number | null) => {
    if (!min || min <= 0) return null;
    if (min < 60) return `${min} ${t('minutes')}`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} ${t('hours')} ${m} ${t('minutes')}` : `${h} ${t('hours')}`;
  };

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
  // VAT + đặt lịch
  const [taxRate, setTaxRate] = useState(0);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  useEffect(() => {
    axiosInstance
      .get('/api/settings')
      .then((r) => {
        const tr = Number(r.data?.tax_rate);
        if (Number.isFinite(tr)) setTaxRate(tr);
      })
      .catch(() => {});
  }, []);

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

  const taxAmount = Math.round((estimate * taxRate) / 100);
  const total = estimate + taxAmount;
  const insufficient = balance != null && total > balance;
  const avgTime = fAvgTime(service?.avg_time_minutes);

  const handleSubmit = async () => {
    if (!service) return;
    if (!isAuthenticated) {
      enqueueSnackbar(t('login_required'), { variant: 'warning' });
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
        scheduled_at: scheduleOn && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
      });
      enqueueSnackbar(t('success'));
      setLink('');
      setExtra('');
      refreshBalance(); // cập nhật số dư sau khi trừ tiền
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || t('submit_failed'), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        {t('title')}
      </Typography>

      <Card sx={{ p: 3, maxWidth: 640 }}>
        <Stack spacing={2.5}>
          <TextField
            select
            label={t('platform')}
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
            label={t('category')}
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
            label={t('service')}
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
                  <Chip size="small" variant="soft" color="primary" label={`#${(service as any).display_id || service.id}`} />
                  <Chip size="small" variant="soft" label={`${t('price_label')} ${fCurrency(service.rate)}/1000`} />
                  <Chip size="small" variant="soft" label={`${t('min_label')} ${service.min_quantity.toLocaleString()}`} />
                  <Chip size="small" variant="soft" label={`${t('max_label')} ${service.max_quantity.toLocaleString()}`} />
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
                    <Chip size="small" variant="soft" color="success" icon={<Iconify icon="solar:refresh-bold" />} label={t('warranty')} />
                  )}
                  {service.can_cancel && (
                    <Chip size="small" variant="soft" color="warning" label={t('can_cancel')} />
                  )}
                </Stack>
                {service.description && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                    {service.description}
                  </Typography>
                )}
              </Box>

              <TextField
                label={t('link')}
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />

              {isComments || isHashtag || isSeo ? (
                <TextField
                  label={isComments ? t('comments_label') : isHashtag ? t('hashtag_label') : t('seo_label')}
                  multiline
                  minRows={3}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              ) : (
                <TextField
                  label={t('quantity')}
                  type="number"
                  value={quantity}
                  disabled={isPackage}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 0))}
                  helperText={`${translate('smm_order.quantity_helper', {
                    min: service.min_quantity,
                    max: service.max_quantity,
                  })}`}
                />
              )}

              {/* Drip-feed (chia nhỏ đơn) */}
              {canDrip && (
                <Box sx={{ border: (t) => `dashed 1px ${t.palette.divider}`, borderRadius: 1.5, p: 2 }}>
                  <FormControlLabel
                    control={<Switch checked={dripOn} onChange={(e) => setDripOn(e.target.checked)} />}
                    label={t('drip_label')}
                  />
                  <Collapse in={dripOn}>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label={t('runs_label')}
                        value={runs}
                        onChange={(e) => setRuns(Math.max(2, Number(e.target.value) || 2))}
                        helperText={t('runs_helper')}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label={t('interval_label')}
                        value={interval}
                        onChange={(e) => setIntervalMin(Math.max(1, Number(e.target.value) || 1))}
                        helperText={t('interval_helper')}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                      {`${translate('smm_order.drip_summary', {
                        qty: effectiveQty.toLocaleString(),
                        runs,
                        interval,
                      })}`}
                    </Typography>
                  </Collapse>
                </Box>
              )}

              {/* Đặt lịch chạy đơn */}
              <Box sx={{ border: (th) => `dashed 1px ${th.palette.divider}`, borderRadius: 1.5, p: 2 }}>
                <FormControlLabel
                  control={<Switch checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} />}
                  label="Đặt lịch chạy"
                />
                <Collapse in={scheduleOn}>
                  <TextField
                    type="datetime-local"
                    fullWidth
                    sx={{ mt: 2 }}
                    label="Thời gian chạy"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Collapse>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('subtotal')}
                </Typography>
                <Typography variant="body2">{fCurrency(estimate)}</Typography>
              </Stack>
              {taxRate > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {`VAT ${taxRate}%`}
                  </Typography>
                  <Typography variant="body2">{fCurrency(taxAmount)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">Tổng cộng</Typography>
                <Typography variant="h6" color="primary.main">
                  {fCurrency(total)}
                </Typography>
              </Stack>

              {insufficient && (
                <Alert severity="warning">
                  {`${translate('smm_order.insufficient', { amount: fCurrency(total) })}`}
                </Alert>
              )}

              <Button
                size="large"
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || !link || effectiveQty < 1 || insufficient}
              >
                {t('submit')}
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
