import { useEffect, useState } from 'react';
// @mui
import {
  Button,
  Card,
  CircularProgress,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// locales
import { useLocales } from '../../locales';
// utils
import axiosInstance from '../../utils/axios';
import { fCurrency } from '../../utils/formatNumber';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import EmptyContent from '../../components/empty-content';

// ----------------------------------------------------------------------

const statusColor = (s: string): any =>
  ({ completed: 'success', success: 'success', pending: 'warning', failed: 'error', rejected: 'error' }[s] || 'default');

export default function WalletHistoryView() {
  const { isAuthenticated } = useAuthContext();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`wallet_history_page.${k}`)}`;

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axiosInstance
      .get('/api/balance/history', { params: { page, limit } })
      .then((r) => {
        setItems(r.data?.items || []);
        setTotal(r.data?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, page]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <Container sx={{ pt: { xs: 3, md: 5 }, pb: 8 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
        <Iconify icon="solar:wallet-bold" width={28} sx={{ color: 'primary.main' }} />
        <Typography variant="h4">{t('title')}</Typography>
      </Stack>

      {!isAuthenticated ? (
        <EmptyContent title={t('login_required')} img="/assets/illustrations/illustration_empty_cart.svg" />
      ) : loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : !items.length ? (
        <EmptyContent title={t('empty')} img="/assets/illustrations/illustration_empty_content.svg" />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell>{t('type')}</TableCell>
                  <TableCell>{t('description')}</TableCell>
                  <TableCell align="right">{t('amount')}</TableCell>
                  <TableCell align="right">{t('balance_after')}</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => {
                  const positive = (it.amount || 0) >= 0;
                  return (
                    <TableRow key={it.id} hover>
                      <TableCell sx={{ fontSize: 13 }}>
                        {it.createdAt ? new Date(it.createdAt).toLocaleString('vi-VN') : '-'}
                      </TableCell>
                      <TableCell>
                        <Label variant="soft">{it.type}</Label>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, maxWidth: 280 }}>{it.description || '-'}</TableCell>
                      <TableCell align="right" sx={{ color: positive ? 'success.main' : 'error.main', fontWeight: 600 }}>
                        {positive ? '+' : ''}
                        {fCurrency(it.amount)}
                      </TableCell>
                      <TableCell align="right">{fCurrency(it.balanceAfter)}</TableCell>
                      <TableCell align="center">
                        <Label color={statusColor(it.status)} variant="soft">
                          {it.status}
                        </Label>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {pages > 1 && (
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ p: 2 }}>
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('prev')}
              </Button>
              <Typography variant="body2">
                {page}/{pages}
              </Typography>
              <Button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                {t('next')}
              </Button>
            </Stack>
          )}
        </Card>
      )}
    </Container>
  );
}
