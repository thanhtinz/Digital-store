import { useEffect, useState } from 'react';
// @mui
import {
  Card,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
// locales
import { useLocales } from '../../../locales';
// utils
import axiosInstance from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';
// components
import Scrollbar from '../../../components/scrollbar';

// ----------------------------------------------------------------------

type Row = {
  id: number;
  platform: string;
  category: string;
  name: string;
  rate: number;
  min: number;
  max: number;
};

export default function SmmServicesView() {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`smm_services.${k}`)}`;

  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/api/smm/catalog')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const flat: Row[] = [];
        data.forEach((p: any) =>
          (p.categories || []).forEach((c: any) =>
            (c.services || []).forEach((s: any) =>
              flat.push({
                id: s.id,
                platform: p.name,
                category: c.name,
                name: s.name,
                rate: s.rate,
                min: s.min_quantity,
                max: s.max_quantity,
              })
            )
          )
        );
        if (alive) setRows(flat);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Container sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        {t('title')}
      </Typography>
      <Card>
        <Scrollbar>
          <TableContainer sx={{ minWidth: 720 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('platform')}</TableCell>
                  <TableCell>{t('category')}</TableCell>
                  <TableCell>{t('service')}</TableCell>
                  <TableCell align="right">{t('rate')}</TableCell>
                  <TableCell align="right">{t('min')}</TableCell>
                  <TableCell align="right">{t('max')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.platform}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">{fCurrency(r.rate)}</TableCell>
                    <TableCell align="right">{r.min}</TableCell>
                    <TableCell align="right">{r.max}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </Card>
    </Container>
  );
}
