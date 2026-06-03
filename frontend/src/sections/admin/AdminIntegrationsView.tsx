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
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        <Tab value="telegram" label="Telegram Bot" icon={<Iconify icon="solar:bell-bing-bold" />} iconPosition="start" />
        <Tab value="discord" label="Discord" icon={<Iconify icon="ic:baseline-discord" />} iconPosition="start" />
        <Tab value="email" label="Email / SMTP" icon={<Iconify icon="solar:letter-bold" />} iconPosition="start" />
        <Tab value="oauth" label="Đăng nhập OAuth" icon={<Iconify icon="solar:key-bold" />} iconPosition="start" />
        <Tab value="payment" label="Thanh toán" icon={<Iconify icon="solar:card-bold" />} iconPosition="start" />
        <Tab value="providers" label="Nguồn cung cấp" icon={<Iconify icon="solar:server-square-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'telegram' && <TelegramTab />}
      {tab === 'discord' && <DiscordTab />}
      {tab === 'email' && <EmailTab />}
      {tab === 'oauth' && <OAuthTab />}
      {tab === 'payment' && <PaymentTab />}
      {tab === 'providers' && <ProvidersTab />}
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
// DISCORD

function DiscordTab() {
  const { ok, err } = useSnack();
  const [cfg, setCfg] = useState<any>({ discord_webhook_url: '', discord_enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/api/admin/bot-config/discord').then((r) => setCfg(r.data)).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/admin/bot-config/discord', {
        discord_enabled: cfg.discord_enabled,
        ...(cfg.discord_webhook_url && cfg.discord_webhook_url !== '••••••••' ? { discord_webhook_url: cfg.discord_webhook_url } : {}),
      });
      ok('Đã lưu cấu hình Discord');
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };
  const test = async () => {
    try {
      const r = await axiosInstance.post('/api/admin/bot-config/test-discord', {
        ...(cfg.discord_webhook_url && cfg.discord_webhook_url !== '••••••••' ? { discord_webhook_url: cfg.discord_webhook_url } : {}),
      });
      ok(r.data?.message || 'Đã gửi');
    } catch (e) {
      err(e);
    }
  };

  if (loading) return <Loading />;
  return (
    <Card sx={{ maxWidth: 560 }}>
      <CardHeader
        title="Discord Webhook"
        subheader="Nhận thông báo đơn hàng qua kênh Discord"
        action={<Switch checked={!!cfg.discord_enabled} onChange={(e) => setCfg({ ...cfg, discord_enabled: e.target.checked })} />}
      />
      <CardContent>
        <Stack spacing={2.5}>
          <TextField
            label="Webhook URL"
            placeholder={cfg.discord_webhook_url === '••••••••' ? '•••••••• (đã lưu)' : 'https://discord.com/api/webhooks/...'}
            onChange={(e) => setCfg({ ...cfg, discord_webhook_url: e.target.value })}
          />
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" onClick={save} disabled={saving}>
              Lưu
            </Button>
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
// PAYMENT (SePay)

function PaymentTab() {
  const { ok, err } = useSnack();
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/api/admin/payment/config').then((r) => setCfg(r.data)).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    // Bỏ qua secret đang ở dạng mask (giữ giá trị cũ).
    const payload: Record<string, string> = {
      sepay_account_number: cfg.sepay_account_number || '',
      sepay_bank_code: cfg.sepay_bank_code || '',
      app_base_url: cfg.app_base_url || '',
    };
    if (cfg.sepay_api_key && cfg.sepay_api_key !== '••••••••') payload.sepay_api_key = cfg.sepay_api_key;
    if (cfg.sepay_webhook_secret && cfg.sepay_webhook_secret !== '••••••••') payload.sepay_webhook_secret = cfg.sepay_webhook_secret;
    try {
      await axiosInstance.patch('/api/admin/settings', payload);
      ok('Đã lưu cấu hình thanh toán');
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cfg) return <Loading />;
  return (
    <Card sx={{ maxWidth: 560 }}>
      <CardHeader title="SePay (VietQR)" subheader="Cổng nạp tiền tự động qua chuyển khoản" />
      <CardContent>
        <Stack spacing={2.5}>
          <TextField label="Số tài khoản" value={cfg.sepay_account_number || ''} onChange={(e) => setCfg({ ...cfg, sepay_account_number: e.target.value })} />
          <TextField label="Mã ngân hàng (VD: MBBank, VCB)" value={cfg.sepay_bank_code || ''} onChange={(e) => setCfg({ ...cfg, sepay_bank_code: e.target.value })} />
          <TextField label="SePay API key" placeholder={cfg.sepay_api_key === '••••••••' ? '•••••••• (đã lưu)' : ''} onChange={(e) => setCfg({ ...cfg, sepay_api_key: e.target.value })} />
          <TextField label="Webhook secret" placeholder={cfg.sepay_webhook_secret === '••••••••' ? '•••••••• (đã lưu)' : ''} onChange={(e) => setCfg({ ...cfg, sepay_webhook_secret: e.target.value })} />
          <TextField label="App base URL (cho webhook)" value={cfg.app_base_url || ''} onChange={(e) => setCfg({ ...cfg, app_base_url: e.target.value })} helperText={cfg.has_env_override ? 'Đang bị ghi đè bởi biến môi trường' : ''} />
          <Button variant="contained" onClick={save} disabled={saving}>
            Lưu
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// API PROVIDERS

const PROVIDER_TYPES = [
  { value: 'giftcard', label: 'Thẻ cào / Giftcard' },
  { value: 'topup_game', label: 'Nạp game' },
  { value: 'account_premium', label: 'Tài khoản Premium' },
  { value: 'smm_panel', label: 'SMM Panel' },
];
const PROVIDER_EMPTY = {
  id: 0,
  name: '',
  provider_type: 'giftcard',
  base_url: '',
  api_key: '',
  partner_id: '',
  is_active: true,
  exchange_enabled: false,
  discount_rate: 0,
  rates_json: '',
};

function ProvidersTab() {
  const { ok, err } = useSnack();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof PROVIDER_EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/api-providers').then((r) => setRows(r.data || [])).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const openEdit = (p: any) => {
    const cr = p.card_rates || {};
    const { exchange_enabled, discount_rate, ...rest } = cr;
    setForm({
      id: p.id,
      name: p.name,
      provider_type: p.provider_type,
      base_url: p.base_url || '',
      api_key: '',
      partner_id: p.partner_id || '',
      is_active: p.is_active,
      exchange_enabled: !!exchange_enabled,
      discount_rate: Number(discount_rate) || 0,
      rates_json: Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '',
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      err({}, 'Nhập tên nguồn');
      return;
    }
    // card_rates chỉ áp cho giftcard.
    let card_rates: any;
    if (form.provider_type === 'giftcard') {
      let extra = {};
      if (form.rates_json.trim()) {
        try {
          extra = JSON.parse(form.rates_json);
        } catch {
          err({}, 'JSON tỷ lệ theo nhà mạng không hợp lệ');
          return;
        }
      }
      card_rates = { exchange_enabled: form.exchange_enabled, discount_rate: Number(form.discount_rate) || 0, ...extra };
    }
    setSaving(true);
    const payload: any = {
      name: form.name,
      provider_type: form.provider_type,
      base_url: form.base_url,
      partner_id: form.partner_id,
      is_active: form.is_active,
      ...(form.api_key ? { api_key: form.api_key } : {}),
      ...(card_rates ? { card_rates } : {}),
    };
    try {
      if (form.id) await axiosInstance.put(`/api/api-providers/${form.id}`, payload);
      else await axiosInstance.post('/api/api-providers', payload);
      ok('Đã lưu nguồn');
      setForm(null);
      load();
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await axiosInstance.delete(`/api/api-providers/${toDelete.id}`);
      ok('Đã xoá');
      load();
    } catch (e) {
      err(e);
    } finally {
      setToDelete(null);
    }
  };
  const testProvider = async (id: number) => {
    try {
      const r = await axiosInstance.post(`/api/api-providers/${id}/test`);
      ok(r.data?.message || 'Kết nối OK');
    } catch (e) {
      err(e, 'Kết nối thất bại');
    }
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={() => setForm({ ...PROVIDER_EMPTY })}>
          Thêm nguồn
        </Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Đổi thẻ</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <Label variant="soft">{PROVIDER_TYPES.find((t) => t.value === p.provider_type)?.label || p.provider_type}</Label>
                </TableCell>
                <TableCell>
                  {p.provider_type === 'giftcard' ? (
                    <Label color={p.card_rates?.exchange_enabled ? 'success' : 'default'}>
                      {p.card_rates?.exchange_enabled ? `Bật · ${p.card_rates?.discount_rate || 0}%` : 'Tắt'}
                    </Label>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="center">
                  <Label color={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Bật' : 'Tắt'}</Label>
                </TableCell>
                <TableCell align="right">
                  <IconButton title="Test kết nối" onClick={() => testProvider(p.id)}>
                    <Iconify icon="solar:plug-circle-bold" />
                  </IconButton>
                  <IconButton onClick={() => openEdit(p)}>
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton color="error" onClick={() => setToDelete(p)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Chưa có nguồn
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? 'Sửa nguồn' : 'Thêm nguồn'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField select label="Loại" value={form.provider_type} disabled={!!form.id} onChange={(e) => setForm({ ...form, provider_type: e.target.value })}>
                {PROVIDER_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Base URL" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
              <TextField label={form.id ? 'API key (trống = giữ nguyên)' : 'API key'} value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
              <TextField label="Partner ID" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} />

              {form.provider_type === 'giftcard' && (
                <>
                  <FormControlLabel
                    control={<Switch checked={form.exchange_enabled} onChange={(e) => setForm({ ...form, exchange_enabled: e.target.checked })} />}
                    label="Bật đổi thẻ cào (cho trang Nạp thẻ)"
                  />
                  <TextField label="Chiết khấu mặc định (%)" type="number" value={form.discount_rate} onChange={(e) => setForm({ ...form, discount_rate: Number(e.target.value) })} helperText="Phần trăm trừ khi đổi thẻ (vd 20 = nhận 80%)" />
                  <TextField label="Tỷ lệ theo nhà mạng (JSON, tuỳ chọn)" multiline rows={4} value={form.rates_json} onChange={(e) => setForm({ ...form, rates_json: e.target.value })} placeholder={'{\n  "VIETTEL": { "50000": 25 }\n}'} />
                </>
              )}

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
        title="Xoá nguồn"
        content={`Xoá "${toDelete?.name}"?`}
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
