import { useEffect, useRef, useState } from 'react';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Button, Card, Container, Stack, Typography, Divider, Dialog, DialogContent } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

type Prize = { id: number; label: string; color: string; type: string; segment_index?: number; image_url?: string };
type Config = {
  enabled: boolean;
  cost_points: number;
  free_daily: number;
  free_left: number;
  my_points: number;
  can_spin: boolean;
  image_url?: string;
  segments?: number;
  prizes: Prize[];
};

export default function WheelView() {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<any>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const load = () => {
    axiosInstance.get('/api/wheel/config').then((r) => setCfg(r.data)).catch(() => {});
    axiosInstance.get('/api/wheel/history').then((r) => setHistory(r.data?.items || [])).catch(() => {});
  };

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  const prizes = cfg?.prizes || [];
  // Vòng quay ảnh tải lên: số ô theo cấu hình segments; nếu không, theo số phần thưởng.
  const useImage = !!cfg?.image_url;
  const segCount = useImage ? (cfg?.segments || prizes.length || 1) : (prizes.length || 1);
  const seg = 360 / segCount;

  // Vẽ vòng quay bằng conic-gradient (khi không dùng ảnh).
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
      // Vị trí ô trúng: ảnh -> segment_index của phần thưởng; gradient -> chỉ số trong danh sách.
      const slot = useImage
        ? (prizes.find((p) => p.id === prize?.id)?.segment_index ?? 0)
        : prizes.findIndex((p) => p.id === prize?.id);
      const idx = slot >= 0 ? slot : 0;
      // Ảnh tải lên: ô 0 căn giữa đỉnh (kim) -> không cộng nửa ô.
      // Conic-gradient: mỗi ô bắt đầu từ đỉnh -> tâm ô lệch nửa ô.
      const centerOffset = useImage ? 0 : seg / 2;
      const target = 360 * 6 + (360 - (idx * seg + centerOffset));
      setAngle((prev) => prev - (prev % 360) + target);
      setTimeout(() => {
        setSpinning(false);
        if (prize) setResult(prize);
        load();
      }, 4200);
    } catch (e: any) {
      setSpinning(false);
      enqueueSnackbar(e?.detail || e?.message || 'Quay thất bại', { variant: 'error' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    enqueueSnackbar(`Đã sao chép mã ${code}`);
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
                  ...(useImage
                    ? { backgroundImage: `url(${cfg.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: gradient }),
                  border: '8px solid #fff',
                  boxShadow: '0 8px 24px rgba(0,0,0,.25)',
                  transition: spinning ? 'transform 4s cubic-bezier(.17,.67,.32,1.34)' : 'none',
                  transform: `rotate(${angle}deg)`,
                  position: 'relative',
                }}
              >
                {!useImage && prizes.map((p, i) => (
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

      {/* Kết quả quay */}
      <Dialog open={!!result} onClose={() => setResult(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {result && (
            <>
              <Typography sx={{ fontSize: 56 }}>{result.type === 'none' ? '🍀' : '🎉'}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {result.type === 'none' ? 'Chúc bạn may mắn lần sau!' : `Bạn trúng: ${result.label}`}
              </Typography>
              {result.type === 'balance' && (
                <Typography color="success.main" sx={{ mt: 1 }}>Đã cộng {result.value?.toLocaleString('vi-VN')}đ vào ví.</Typography>
              )}
              {result.type === 'points' && (
                <Typography color="success.main" sx={{ mt: 1 }}>Đã cộng {result.value} điểm.</Typography>
              )}
              {result.type === 'product' && (
                <Typography color="text.secondary" sx={{ mt: 1 }}>Phần thưởng sản phẩm sẽ xuất hiện trong đơn hàng của bạn.</Typography>
              )}
              {result.type === 'voucher' && result.voucher_code && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ letterSpacing: 1 }}>{result.voucher_code}</Typography>
                  </Box>
                  <Button variant="outlined" startIcon={<Iconify icon="solar:copy-bold" />} onClick={() => copyCode(result.voucher_code)}>
                    Sao chép mã
                  </Button>
                </Box>
              )}
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" onClick={() => setResult(null)}>Đóng</Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
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
