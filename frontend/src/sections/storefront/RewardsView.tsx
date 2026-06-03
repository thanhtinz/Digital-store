import { useEffect, useState } from 'react';
// @mui
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
import { fShortenNumber } from '../../utils/formatNumber';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// locales
import { useLocales } from '../../locales';
// components
import Label from '../../components/label';
import Image from '../../components/image';
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

export default function RewardsView() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`rewards_page.${k}`)}`;
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();

  const [points, setPoints] = useState(0);
  const [checkin, setCheckin] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [busy, setBusy] = useState<string>(''); // 'checkin' | reward id

  const loadAll = () => {
    axiosInstance.get('/api/loyalty/me').then((r) => setPoints(Number(r.data?.points) || 0)).catch(() => {});
    axiosInstance.get('/api/loyalty/checkin').then((r) => setCheckin(r.data)).catch(() => {});
    axiosInstance.get('/api/loyalty/rewards').then((r) => setRewards(r.data?.items || [])).catch(() => {});
  };

  useEffect(() => {
    if (isAuthenticated) loadAll();
  }, [isAuthenticated]);

  const doCheckin = async () => {
    setBusy('checkin');
    try {
      const r = await axiosInstance.post('/api/loyalty/checkin');
      enqueueSnackbar(`+${r.data?.points || 0} ${t('pts')}`);
      loadAll();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message, { variant: 'error' });
    } finally {
      setBusy('');
    }
  };

  const doRedeem = async (item: any) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('redeem_confirm').replace('{p}', String(item.points_cost)))) return;
    setBusy(String(item.id));
    try {
      const r = await axiosInstance.post(`/api/loyalty/rewards/${item.id}/redeem`);
      enqueueSnackbar(t('redeem_ok'));
      if (r.data?.delivery_data) {
        // eslint-disable-next-line no-alert
        window.alert(`${t('delivered')}:\n\n${r.data.delivery_data}`);
      }
      loadAll();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message, { variant: 'error' });
    } finally {
      setBusy('');
    }
  };

  const milestones: any[] = checkin?.milestones || [];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('title')}
      </Typography>

      <Grid container spacing={3}>
        {/* Điểm + điểm danh */}
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              p: 3,
              mb: 3,
              color: 'common.white',
              background: (th) => `linear-gradient(135deg, ${th.palette.warning.main} 0%, ${th.palette.warning.dark} 100%)`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: 0.95 }}>
              <Iconify icon="solar:star-bold-duotone" width={22} />
              <Typography variant="body2">{t('your_points')}</Typography>
            </Stack>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {fShortenNumber(points)} <Typography component="span" variant="body2">{t('pts')}</Typography>
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1">{t('checkin_title')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {t('checkin_desc')}
            </Typography>

            {checkin && !checkin.enabled ? (
              <Label color="default">{t('checkin_off')}</Label>
            ) : (
              <>
                {/* Mốc ngày */}
                <Box
                  gap={1}
                  display="grid"
                  gridTemplateColumns="repeat(7, 1fr)"
                  sx={{ mb: 2 }}
                >
                  {milestones.map((m, i) => {
                    const reached = (checkin?.streak || 0) >= m.day;
                    return (
                      <Stack
                        key={i}
                        alignItems="center"
                        sx={{
                          py: 1,
                          borderRadius: 1,
                          bgcolor: reached ? 'warning.lighter' : 'background.neutral',
                          border: (th) => `1px solid ${reached ? th.palette.warning.light : 'transparent'}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t('day')} {m.day}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.25}>
                          <Iconify icon="solar:star-bold" width={12} sx={{ color: 'warning.main' }} />
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {m.points}
                          </Typography>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Box>

                {checkin?.streak > 0 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    🔥 {t('streak').replace('{n}', String(checkin.streak))}
                  </Typography>
                )}

                <LoadingButton
                  fullWidth
                  size="large"
                  variant="contained"
                  color="warning"
                  loading={busy === 'checkin'}
                  disabled={!!checkin?.claimed_today}
                  onClick={doCheckin}
                  startIcon={<Iconify icon="solar:calendar-mark-bold" />}
                >
                  {checkin?.claimed_today
                    ? t('checkin_done')
                    : `${t('checkin_claim')} +${checkin?.next_points || 0}`}
                </LoadingButton>
              </>
            )}
          </Card>
        </Grid>

        {/* Đổi thưởng */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('rewards_title')}
          </Typography>

          {rewards.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 6, color: 'text.disabled' }} spacing={1}>
              <Iconify icon="solar:gift-bold-duotone" width={48} />
              <Typography variant="body2">{t('rewards_empty')}</Typography>
            </Stack>
          ) : (
            <Grid container spacing={2}>
              {rewards.map((it) => {
                const soldOut = it.remaining === 0;
                const cantAfford = points < it.points_cost;
                return (
                  <Grid item xs={12} sm={6} key={it.id}>
                    <Card sx={{ p: 2, height: 1 }}>
                      <Stack direction="row" spacing={2}>
                        <Image
                          src={it.image_url || ''}
                          sx={{ width: 64, height: 64, borderRadius: 1, flexShrink: 0, bgcolor: 'background.neutral' }}
                        />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="subtitle2" noWrap>{it.name}</Typography>
                          {it.description && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {it.description}
                            </Typography>
                          )}
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                            <Iconify icon="solar:star-bold" width={14} sx={{ color: 'warning.main' }} />
                            <Typography variant="subtitle2" color="warning.dark">
                              {fShortenNumber(it.points_cost)} {t('pts')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', ml: 1 }}>
                              {it.remaining === null ? t('unlimited') : `${t('remaining')}: ${it.remaining}`}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <LoadingButton
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ mt: 1.5 }}
                        loading={busy === String(it.id)}
                        disabled={soldOut || cantAfford}
                        onClick={() => doRedeem(it)}
                      >
                        {soldOut ? t('remaining') + ': 0' : t('redeem_btn')}
                      </LoadingButton>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
