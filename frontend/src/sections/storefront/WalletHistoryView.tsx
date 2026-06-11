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
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

const statusColor = (s: string): any =>
  ({ completed: 'success', success: 'success', pending: 'warning', failed: 'error', rejected: 'error' }[s] || 'default');

export default function WalletHistoryView() {
  const { isAuthenticated } = useAuthContext();
  const { translate } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const t = (k: string) => `${translate(`wallet_history_page.${k}`)}`;
  const [exporting, setExporting] = useState(false);

  // Xuất toàn bộ lịch sử ra file CSV (mở được bằng Excel).
  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await axiosInstance.get('/api/balance/history', { params: { page: 1, limit: 1000 } });
      const rows = r.data?.items || [];
      const header = ['Thời gian', 'Loại', 'Mô tả', 'Số tiền', 'Số dư sau', 'Trạng thái'];
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = rows.map((it: any) =>
        [
          it.createdAt ? new Date(it.createdAt).toLocaleString('vi-VN') : '',
          it.type,
          it.description || '',
          it.amount,
          it.balanceAfter,
          it.status,
        ].map(esc).join(',')
      );
      const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lich-su-vi-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xuất thất bại', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">{t('title')}</Typography>
        {isAuthenticated && items.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:file-download-bold" />}
            onClick={exportCsv}
            disabled={exporting}
          >
            Xuất CSV
          </Button>
        )}
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
