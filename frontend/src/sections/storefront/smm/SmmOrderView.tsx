import { useEffect, useMemo, useState } from 'react';
// @mui
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// utils
import axiosInstance from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';
// components
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
};
type Category = { id: number; name: string; services: Service[] };
type Platform = { id: number; name: string; categories: Category[] };

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

  const effectiveQty = isComments
    ? extra.split('\n').map((l) => l.trim()).filter(Boolean).length
    : isPackage
    ? 1
    : quantity;

  const estimate = useMemo(
    () => (service ? (service.rate * effectiveQty) / 1000 : 0),
    [service, effectiveQty]
  );

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
      });
      enqueueSnackbar('Đặt đơn thành công!');
      setLink('');
      setExtra('');
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Đặt đơn thất bại', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Đặt đơn dịch vụ
      </Typography>

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
              {service.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {service.description}
                </Typography>
              )}

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

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Tạm tính</Typography>
                <Typography variant="subtitle1" color="primary.main">
                  {fCurrency(estimate)}
                </Typography>
              </Stack>

              <Button
                size="large"
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || !link || effectiveQty < 1}
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
