import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Label from '../../components/label';
import Iconify from '../../components/iconify';
import ConfirmDialog from '../../components/confirm-dialog';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------

function useSnack() {
  const { enqueueSnackbar } = useSnackbar();
  return {
    ok: (m: string) => enqueueSnackbar(m),
    err: (e: any, fb = 'Có lỗi xảy ra') => enqueueSnackbar(e?.detail || e?.message || fb, { variant: 'error' }),
  };
}
const Loading = () => (
  <Stack alignItems="center" sx={{ py: 8 }}>
    <CircularProgress />
  </Stack>
);

export default function AdminIntegrationsView() {
  const [tab, setTab] = useState('telegram');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Tích hợp
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="telegram" label="Telegram Bot" icon={<Iconify icon="solar:bell-bing-bold" />} iconPosition="start" />
        <Tab value="email" label="Email / SMTP" icon={<Iconify icon="solar:letter-bold" />} iconPosition="start" />
        <Tab value="oauth" label="Đăng nhập OAuth" icon={<Iconify icon="solar:key-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'telegram' && <TelegramTab />}
      {tab === 'email' && <EmailTab />}
      {tab === 'oauth' && <OAuthTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// TELEGRAM

const BOT_EMPTY = { id: 0, name: '', department: 'custom', bot_token: '', chat_id: '', notify_types: [] as string[], receive_reports: false, is_active: true };

function TelegramTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof BOT_EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([axiosInstance.get('/api/telegram/bots'), axiosInstance.get('/api/telegram/notify-types').catch(() => ({ data: [] }))])
      .then(([b, t]) => {
        setRows(b.data || []);
        const tt = Array.isArray(t.data) ? t.data : t.data?.types || [];
        setTypes(tt.map((x: any) => (typeof x === 'string' ? x : x.value || x.key)));
      })
      .catch(err)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.bot_token.trim() || !form.chat_id.trim()) {
      err({}, 'Nhập tên, token và chat ID');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      department: form.department,
      bot_token: form.bot_token,
      chat_id: form.chat_id,
      notify_types: form.notify_types,
      receive_reports: form.receive_reports,
      is_active: form.is_active,
    };
    try {
      if (form.id) await axiosInstance.put(`/api/telegram/bots/${form.id}`, payload);
      else await axiosInstance.post('/api/telegram/bots', payload);
      ok('Đã lưu bot');
      setForm(null);
      load();
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };
  const action = async (id: number, kind: 'test' | 'test-message' | 'set-webhook') => {
    try {
      const r = await axiosInstance.post(`/api/telegram/bots/${id}/${kind}`);
      ok(r.data?.message || 'Thành công');
    } catch (e) {
      err(e);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/telegram/bots/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...BOT_EMPTY })}>
          Thêm bot
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Bộ phận</TableCell>
              <TableCell>Chat ID</TableCell>
              <TableCell align="center">Báo cáo</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{b.name}</TableCell>
                <TableCell>
                  <Label variant="soft">{b.department}</Label>
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{b.chat_id || b.chatId}</TableCell>
                <TableCell align="center">{b.receive_reports || b.receiveReports ? '✓' : '—'}</TableCell>
                <TableCell align="center">
                  <Label color={b.is_active ?? b.isActive ? 'success' : 'default'}>{(b.is_active ?? b.isActive) ? 'Bật' : 'Tắt'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton title="Test kết nối" onClick={() => action(b.id, 'test')}>
                    <Iconify icon="solar:plug-circle-bold" />
                  </IconButton>
                  <IconButton title="Gửi tin test" onClick={() => action(b.id, 'test-message')}>
                    <Iconify icon="solar:plain-bold" />
                  </IconButton>
                  <IconButton title="Đăng ký webhook" onClick={() => action(b.id, 'set-webhook')}>
                    <Iconify icon="solar:link-circle-bold" />
                  </IconButton>
                  <IconButton onClick={() => setForm({ id: b.id, name: b.name, department: b.department, bot_token: '', chat_id: b.chat_id || b.chatId, notify_types: b.notify_types || b.notifyTypes || [], receive_reports: b.receive_reports ?? b.receiveReports, is_active: b.is_active ?? b.isActive })}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton color="error" onClick={() => setToDelete(b)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có bot
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? 'Sửa bot' : 'Thêm bot'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tên bot" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Bộ phận (order/support/custom…)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <TextField label={form.id ? 'Bot token (trống = giữ nguyên)' : 'Bot token'} value={form.bot_token} onChange={(e) => setForm({ ...form, bot_token: e.target.value })} />
              <TextField label="Chat ID" value={form.chat_id} onChange={(e) => setForm({ ...form, chat_id: e.target.value })} />
              {types.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Loại thông báo nhận
                  </Typography>
                  <Select
                    multiple
                    fullWidth
                    size="small"
                    value={form.notify_types}
                    onChange={(e) => setForm({ ...form, notify_types: e.target.value as string[] })}
                    input={<OutlinedInput />}
                    renderValue={(sel) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(sel as string[]).map((v) => (
                          <Chip key={v} label={v} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {types.map((tp) => (
                      <MenuItem key={tp} value={tp}>
                        <Checkbox checked={form.notify_types.indexOf(tp) > -1} />
                        <ListItemText primary={tp} />
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              )}
              <FormControlLabel control={<Checkbox checked={form.receive_reports} onChange={(e) => setForm({ ...form, receive_reports: e.target.checked })} />} label="Nhận báo cáo định kỳ" />
              <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Kích hoạt" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setForm(null)}>
            Huỷ
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá bot"
        content={`Xoá bot "${toDelete?.name}"?`}
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Xoá
          </Button>
        }
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// EMAIL / SMTP

function EmailTab() {
  const { ok, err } = useSnack();
  const [cfg, setCfg] = useState<any>({ smtp_server: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    axiosInstance.get('/api/admin/bot-config/settings').then((r) => setCfg(r.data)).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/admin/bot-config/settings', cfg);
      ok('Đã lưu cấu hình email');
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };
  const test = async () => {
    if (!testTo.trim()) {
      err({}, 'Nhập email nhận');
      return;
    }
    try {
      const r = await axiosInstance.post('/api/admin/bot-config/test-mail', { to_email: testTo.trim() });
      ok(r.data?.message || 'Đã gửi');
    } catch (e) {
      err(e);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card sx={{ maxWidth: 560 }}>
      <CardHeader title="Cấu hình SMTP" subheader="Máy chủ gửi email hệ thống" />
      <CardContent>
        <Stack spacing={2.5}>
          <TextField label="SMTP server" value={cfg.smtp_server} onChange={(e) => setCfg({ ...cfg, smtp_server: e.target.value })} />
          <TextField label="Port" value={cfg.smtp_port} onChange={(e) => setCfg({ ...cfg, smtp_port: e.target.value })} />
          <TextField label="Username" value={cfg.smtp_user} onChange={(e) => setCfg({ ...cfg, smtp_user: e.target.value })} />
          <TextField label="Password" type="password" placeholder={cfg.smtp_pass === '••••••••' ? '••••••••' : ''} onChange={(e) => setCfg({ ...cfg, smtp_pass: e.target.value })} />
          <TextField label="From (email gửi)" value={cfg.smtp_from} onChange={(e) => setCfg({ ...cfg, smtp_from: e.target.value })} />
          <Button variant="contained" onClick={save} disabled={saving}>
            Lưu
          </Button>
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth size="small" label="Gửi mail test tới" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <Button variant="outlined" onClick={test} startIcon={<Iconify icon="solar:plain-bold" />}>
              Gửi test
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// OAUTH

function OAuthTab() {
  const { ok, err } = useSnack();
  const [cfg, setCfg] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/admin/oauth/config').then((r) => setCfg(r.data || {})).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const saveProvider = async (provider: string) => {
    const p = cfg[provider];
    setSaving(provider);
    try {
      await axiosInstance.put(`/api/admin/oauth/config/${provider}`, {
        clientId: p.clientId || '',
        clientSecret: p.clientSecret || '',
        enabled: !!p.enabled,
      });
      ok(`Đã lưu ${provider}`);
      load();
    } catch (e) {
      err(e);
    } finally {
      setSaving('');
    }
  };

  if (loading) return <Loading />;
  const providers = Object.keys(cfg);
  return (
    <Grid container spacing={3}>
      {providers.map((prov) => {
        const p = cfg[prov] || {};
        return (
          <Grid item xs={12} md={6} key={prov}>
            <Card>
              <CardHeader
                title={prov.charAt(0).toUpperCase() + prov.slice(1)}
                action={
                  <Switch
                    checked={!!p.enabled}
                    onChange={(e) => setCfg({ ...cfg, [prov]: { ...p, enabled: e.target.checked } })}
                  />
                }
              />
              <CardContent>
                <Stack spacing={2}>
                  <TextField label="Client ID" size="small" value={p.clientId || ''} onChange={(e) => setCfg({ ...cfg, [prov]: { ...p, clientId: e.target.value } })} />
                  <TextField label="Client Secret" size="small" placeholder={p.hasSecret ? '•••• (đã lưu)' : ''} onChange={(e) => setCfg({ ...cfg, [prov]: { ...p, clientSecret: e.target.value } })} />
                  <Button variant="contained" size="small" onClick={() => saveProvider(prov)} disabled={saving === prov}>
                    Lưu
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
      {!providers.length && (
        <Grid item xs={12}>
          <Typography align="center" sx={{ color: 'text.secondary', py: 4 }}>
            Không có provider OAuth
          </Typography>
        </Grid>
      )}
    </Grid>
  );
}
