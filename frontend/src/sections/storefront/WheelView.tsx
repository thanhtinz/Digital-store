import { useEffect, useRef, useState } from 'react';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Card, Container, Stack, Typography, Divider } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

type Prize = { id: number; label: string; color: string; type: string };
type Config = {
  enabled: boolean;
  cost_points: number;
  free_daily: number;
  free_left: number;
  my_points: number;
  can_spin: boolean;
  prizes: Prize[];
};

export default function WheelView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const load = () => {
    axiosInstance.get('/api/wheel/config').then((r) => setCfg(r.data)).catch(() => {});
    axiosInstance.get('/api/wheel/history').then((r) => setHistory(r.data?.items || [])).catch(() => {});
  };

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  const prizes = cfg?.prizes || [];
  const seg = prizes.length ? 360 / prizes.length : 0;

  // Vẽ vòng quay bằng conic-gradient.
  const gradient = prizes.length
    ? `conic-gradient(${prizes
        .map((p, i) => `${p.color} ${i * seg}deg ${(i + 1) * seg}deg`)
        .join(', ')})`
    : '#eee';

  const doSpin = async () => {
    if (spinning || !cfg?.can_spin) return;
    setSpinning(true);
    try {
      const r = await axiosInstance.post('/api/wheel/spin');
      const prize = r.data?.prize;
      const idx = prizes.findIndex((p) => p.id === prize?.id);
      // Quay nhiều vòng + dừng ở giữa ô trúng (kim ở đỉnh = 0deg/360).
      const target = idx >= 0 ? 360 * 6 + (360 - (idx * seg + seg / 2)) : 360 * 6;
      setAngle((prev) => prev - (prev % 360) + target);
      setTimeout(() => {
        setSpinning(false);
        if (prize) {
          if (prize.type === 'voucher' && prize.voucher_code) {
            enqueueSnackbar(`🎉 Trúng ${prize.label}! Mã: ${prize.voucher_code}`, { variant: 'success' });
          } else if (prize.type === 'none') {
            enqueueSnackbar('Chúc bạn may mắn lần sau!');
          } else {
            enqueueSnackbar(`🎉 Bạn trúng: ${prize.label}`, { variant: 'success' });
          }
        }
        load();
      }, 4200);
    } catch (e: any) {
      setSpinning(false);
      enqueueSnackbar(e?.detail || e?.message || 'Quay thất bại', { variant: 'error' });
    }
  };

  if (!isAuthenticated) {
    return (
      <Container sx={{ py: 6 }}>
        <Typography>Vui lòng đăng nhập để tham gia vòng quay.</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Vòng quay may mắn
      </Typography>

      {cfg && !cfg.enabled && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Tính năng vòng quay hiện đang tắt.</Typography>
        </Card>
      )}

      {cfg?.enabled && (
        <Stack spacing={3}>
          <Card sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 3 }} flexWrap="wrap">
              <Stat label="Điểm của bạn" value={cfg.my_points} />
              <Stat label="Lượt quay free hôm nay" value={cfg.free_left} />
              <Stat label="Phí mỗi lượt" value={cfg.cost_points > 0 ? `${cfg.cost_points} điểm` : 'Miễn phí'} />
            </Stack>

            <Box sx={{ position: 'relative', width: 320, height: 320, mx: 'auto', maxWidth: '100%' }}>
              {/* Kim chỉ */}
              <Box
                sx={{
                  position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
                  borderTop: '24px solid #FF3030', zIndex: 3,
                }}
              />
              <Box
                ref={wheelRef}
                sx={{
                  width: 320, height: 320, borderRadius: '50%', maxWidth: '100%',
                  background: gradient,
                  border: '8px solid #fff',
                  boxShadow: '0 8px 24px rgba(0,0,0,.25)',
                  transition: spinning ? 'transform 4s cubic-bezier(.17,.67,.32,1.34)' : 'none',
                  transform: `rotate(${angle}deg)`,
                  position: 'relative',
                }}
              >
                {prizes.map((p, i) => (
                  <Typography
                    key={p.id}
                    variant="caption"
                    sx={{
                      position: 'absolute', top: '50%', left: '50%', color: '#fff', fontWeight: 700,
                      transformOrigin: '0 0',
                      transform: `rotate(${i * seg + seg / 2}deg) translate(70px, -6px)`,
                      whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.4)',
                      maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {p.label}
                  </Typography>
                ))}
              </Box>
              {/* Trục giữa */}
              <Box
                sx={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  width: 48, height: 48, borderRadius: '50%', bgcolor: '#fff', zIndex: 2,
                  display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
                }}
              >
                <Iconify icon="solar:star-bold" sx={{ color: 'warning.main' }} width={26} />
              </Box>
            </Box>

            <LoadingButton
              variant="contained" size="large" loading={spinning}
              disabled={!cfg.can_spin} onClick={doSpin} sx={{ mt: 4, minWidth: 200 }}
            >
              {cfg.free_left > 0 ? 'Quay miễn phí' : cfg.cost_points > 0 ? `Quay (-${cfg.cost_points} điểm)` : 'Quay'}
            </LoadingButton>
            {!cfg.can_spin && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Bạn đã hết lượt quay hoặc không đủ điểm.
              </Typography>
            )}
          </Card>

          {history.length > 0 && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Lịch sử quay</Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack divider={<Divider />}>
                {history.map((h) => (
                  <Stack key={h.id} direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                    <Typography variant="body2">{h.prize_label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(h.created_at).toLocaleString('vi-VN')}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          )}
        </Stack>
      )}
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5">{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
