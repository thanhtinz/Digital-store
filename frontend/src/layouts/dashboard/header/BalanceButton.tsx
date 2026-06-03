import { useEffect, useState } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { Button, Skeleton } from '@mui/material';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// utils
import axiosInstance from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// components
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------
// Nút số dư trên header: luôn hiển thị số dư, bấm để nạp tiền.

export default function BalanceButton() {
  const { isAuthenticated, user } = useAuthContext();

  const initial = Number((user as any)?.balance);
  const [balance, setBalance] = useState<number | null>(
    Number.isFinite(initial) ? initial : null
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    axiosInstance
      .get('/api/balance/me')
      .then((r) => {
        const v = Number(r.data?.balance);
        if (alive && Number.isFinite(v)) setBalance(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Button
      component={NextLink}
      href={PATH_DASHBOARD.wallet.topup}
      size="small"
      color="primary"
      variant="soft"
      startIcon={<Iconify icon="solar:wallet-money-bold-duotone" />}
      sx={{ px: 1.25, fontWeight: 700, whiteSpace: 'nowrap' }}
    >
      {balance == null ? <Skeleton width={48} /> : fCurrency(balance)}
    </Button>
  );
}
