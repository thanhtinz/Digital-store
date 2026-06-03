import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Alert,
  AlertTitle,
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
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

/** Lấy App base URL đã cấu hình (fallback origin trình duyệt). */
function useAppBaseUrl() {
  const [base, setBase] = useState('');
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    axiosInstance
      .get('/api/admin/payment/config')
      .then((r) => setBase((r.data?.app_base_url || '').replace(/\/$/, '') || origin))
      .catch(() => setBase(origin));
  }, []);
  return base;
}

/** Ô chỉ-đọc hiển thị URL + nút copy (cho webhook/redirect URI). */
function CopyField({ label, value }: { label: string; value: string }) {
  const { enqueueSnackbar } = useSnackbar();
  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      size="small"
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard?.writeText(value);
                enqueueSnackbar('Đã sao chép');
              }}
            >
              <Iconify icon="solar:copy-bold" />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ '& input': { fontFamily: 'monospace', fontSize: 13 } }}
    />
  );
}

export default function AdminIntegrationsView() {
  const [tab, setTab] = useState('telegram');
  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Typography variant="h4" sx={{ my: 3 }}>
        Tích hợp
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        <Tab value="telegram" label="Telegram Bot" icon={<Iconify icon="solar:bell-bing-bold" />} iconPosition="start" />
        <Tab value="email" label="Email / SMTP" icon={<Iconify icon="solar:letter-bold" />} iconPosition="start" />
        <Tab value="oauth" label="Đăng nhập OAuth" icon={<Iconify icon="solar:key-bold" />} iconPosition="start" />
        <Tab value="payment" label="Thanh toán" icon={<Iconify icon="solar:card-bold" />} iconPosition="start" />
        <Tab value="providers" label="Nguồn cung cấp" icon={<Iconify icon="solar:server-square-bold" />} iconPosition="start" />
        <Tab value="ai" label="AI" icon={<Iconify icon="solar:magic-stick-3-bold" />} iconPosition="start" />
      </Tabs>
      {tab === 'telegram' && <TelegramTab />}
      {tab === 'email' && <EmailTab />}
      {tab === 'oauth' && <OAuthTab />}
      {tab === 'payment' && <PaymentTab />}
      {tab === 'providers' && <ProvidersTab />}
      {tab === 'ai' && <AiTab />}
    </Container>
  );
}

// ----------------------------------------------------------------------
// TELEGRAM

const BOT_EMPTY = { id: 0, name: '', department: 'custom', bot_token: '', chat_id: '', notify_types: [] as string[], receive_reports: false, is_active: true };

function TelegramTab() {
  const { ok, err } = useSnack();
  const base = useAppBaseUrl();
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
    <Stack spacing={3}>
      <Alert severity="info">
        <AlertTitle>Cách tạo bot Telegram</AlertTitle>
        <Box component="ol" sx={{ pl: 2, m: 0, '& li': { mb: 0.5 } }}>
          <li>Nhắn <Link href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</Link> → <b>/newbot</b> để lấy <b>Bot token</b>.</li>
          <li>Lấy <b>Chat ID</b>: thêm bot vào nhóm/kênh hoặc nhắn bot rồi mở <code>api.telegram.org/bot&lt;token&gt;/getUpdates</code>.</li>
          <li>Thêm bot bên dưới, bấm <b>Test kết nối</b> rồi <b>Gửi tin test</b>.</li>
          <li>Bấm <b>Đăng ký webhook</b> để nhận phản hồi 2 chiều (cần đã cấu hình App base URL ở tab Thanh toán).</li>
        </Box>
        {base && (
          <Box sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
            Webhook sẽ là: <code>{base}/api/telegram/webhook/&lt;token&gt;</code>
          </Box>
        )}
      </Alert>

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
    </Stack>
  );
}

// ----------------------------------------------------------------------
// EMAIL (mail nâng cao: relay / SMTP / direct + DKIM/DNS)

const MAIL_MODES = [
  { value: 'relay', label: 'Relay (mặc định, không cần cấu hình)' },
  { value: 'smtp', label: 'SMTP (máy chủ riêng)' },
  { value: 'direct', label: 'Direct (gửi trực tiếp + DKIM)' },
];

function EmailTab() {
  const { ok, err } = useSnack();
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [dkim, setDkim] = useState<{ name: string; value: string } | null>(null);
  const [dns, setDns] = useState<any[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/admin/mail/config').then((r) => setCfg(r.data)).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        mail_mode: cfg.mail_mode,
        mail_from_email: cfg.mail_from_email,
        mail_from_name: cfg.mail_from_name,
        mail_smtp_host: cfg.mail_smtp_host,
        mail_smtp_port: cfg.mail_smtp_port,
        mail_smtp_user: cfg.mail_smtp_user,
        mail_dkim_domain: cfg.mail_dkim_domain,
        mail_dkim_selector: cfg.mail_dkim_selector,
      };
      if (cfg.mail_smtp_pass && cfg.mail_smtp_pass !== '••••••••') payload.mail_smtp_pass = cfg.mail_smtp_pass;
      await axiosInstance.put('/api/admin/mail/config', payload);
      ok('Đã lưu cấu hình mail');
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
      const r = await axiosInstance.post('/api/admin/mail/test', { to_email: testTo.trim() });
      ok(r.data?.message || 'Đã gửi');
    } catch (e) {
      err(e);
    }
  };
  const genDkim = async () => {
    if (!cfg.mail_dkim_domain) {
      err({}, 'Nhập domain DKIM trước');
      return;
    }
    try {
      const r = await axiosInstance.post('/api/admin/mail/dkim', { domain: cfg.mail_dkim_domain, selector: cfg.mail_dkim_selector || 'default' });
      setDkim({ name: r.data?.dns_record_name, value: r.data?.dns_record_value });
      ok('Đã tạo khóa DKIM — thêm bản ghi DNS bên dưới');
      load();
    } catch (e) {
      err(e);
    }
  };
  const loadDns = async () => {
    try {
      const r = await axiosInstance.get('/api/admin/mail/dns-guide', { params: cfg.mail_dkim_domain ? { domain: cfg.mail_dkim_domain } : {} });
      setDns(r.data?.records || []);
    } catch (e) {
      err(e);
    }
  };

  if (loading || !cfg) return <Loading />;
  const mode = cfg.mail_mode || 'relay';
  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Card>
        <CardHeader title="Cấu hình Email" subheader="Hệ thống gửi email (đơn hàng, đặt lại mật khẩu…)" />
        <CardContent>
          <Stack spacing={2.5}>
            <TextField select label="Chế độ gửi" value={mode} onChange={(e) => setCfg({ ...cfg, mail_mode: e.target.value })}>
              {MAIL_MODES.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Email gửi (From)" value={cfg.mail_from_email || ''} onChange={(e) => setCfg({ ...cfg, mail_from_email: e.target.value })} />
            <TextField label="Tên hiển thị (From name)" value={cfg.mail_from_name || ''} onChange={(e) => setCfg({ ...cfg, mail_from_name: e.target.value })} />

            {mode === 'smtp' && (
              <>
                <Divider>SMTP</Divider>
                <TextField label="SMTP host" value={cfg.mail_smtp_host || ''} onChange={(e) => setCfg({ ...cfg, mail_smtp_host: e.target.value })} />
                <TextField label="SMTP port" value={cfg.mail_smtp_port || ''} onChange={(e) => setCfg({ ...cfg, mail_smtp_port: e.target.value })} />
                <TextField label="SMTP user" value={cfg.mail_smtp_user || ''} onChange={(e) => setCfg({ ...cfg, mail_smtp_user: e.target.value })} />
                <TextField label="SMTP password" type="password" placeholder={cfg.mail_smtp_pass === '••••••••' ? '•••••••• (đã lưu)' : ''} onChange={(e) => setCfg({ ...cfg, mail_smtp_pass: e.target.value })} />
              </>
            )}

            {mode === 'direct' && (
              <>
                <Divider>DKIM</Divider>
                <Alert severity="info">Chế độ Direct gửi thẳng từ máy chủ — cần thêm bản ghi DNS (DKIM/SPF) để không vào spam.</Alert>
                <TextField label="Domain DKIM" value={cfg.mail_dkim_domain || ''} onChange={(e) => setCfg({ ...cfg, mail_dkim_domain: e.target.value })} />
                <TextField label="Selector" value={cfg.mail_dkim_selector || 'default'} onChange={(e) => setCfg({ ...cfg, mail_dkim_selector: e.target.value })} />
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" onClick={genDkim} startIcon={<Iconify icon="solar:key-bold" />}>
                    {cfg.mail_dkim_private_key_set ? 'Tạo lại khóa DKIM' : 'Sinh khóa DKIM'}
                  </Button>
                  <Button variant="outlined" color="inherit" onClick={loadDns} startIcon={<Iconify icon="solar:server-bold" />}>
                    Xem bản ghi DNS
                  </Button>
                </Stack>
              </>
            )}

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

      {dkim && (
        <Card>
          <CardHeader title="Bản ghi DKIM (thêm vào DNS)" />
          <CardContent>
            <Stack spacing={2}>
              <CopyField label="Tên bản ghi (Name/Host) — loại TXT" value={dkim.name} />
              <CopyField label="Giá trị (Value)" value={dkim.value} />
            </Stack>
          </CardContent>
        </Card>
      )}

      {dns.length > 0 && (
        <Card>
          <CardHeader title="Bản ghi DNS khuyến nghị" />
          <CardContent>
            <Stack spacing={2}>
              {dns.map((rec: any, i: number) => (
                <Box key={i} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {rec.type} · {rec.name}
                  </Typography>
                  <CopyField label={`${rec.type} value`} value={rec.value} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
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
    const payload: Record<string, string> = {
      sepay_account_number: cfg.sepay_account_number || '',
      sepay_bank_code: cfg.sepay_bank_code || '',
      sepay_account_holder: cfg.sepay_account_holder || '',
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
  const base = (cfg.app_base_url || '').replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
  const webhookUrl = `${base}/api/payment/webhook/sepay`;

  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Card>
        <CardHeader title="SePay (VietQR)" subheader="Cổng nạp tiền tự động qua chuyển khoản ngân hàng" />
        <CardContent>
          <Stack spacing={2.5}>
            <TextField label="Số tài khoản" value={cfg.sepay_account_number || ''} onChange={(e) => setCfg({ ...cfg, sepay_account_number: e.target.value })} />
            <TextField label="Tên chủ tài khoản" value={cfg.sepay_account_holder || ''} onChange={(e) => setCfg({ ...cfg, sepay_account_holder: e.target.value })} />
            <TextField label="Mã ngân hàng (VietQR)" helperText="VD: MBBank, VCB, ACB, TPBank, Techcombank…" value={cfg.sepay_bank_code || ''} onChange={(e) => setCfg({ ...cfg, sepay_bank_code: e.target.value })} />
            <TextField label="SePay API Token" placeholder={cfg.sepay_api_key === '••••••••' ? '•••••••• (đã lưu)' : ''} helperText="Lấy ở SePay → API Access" onChange={(e) => setCfg({ ...cfg, sepay_api_key: e.target.value })} />
            <TextField label="Webhook secret (API Key trong cấu hình Webhook)" placeholder={cfg.sepay_webhook_secret === '••••••••' ? '•••••••• (đã lưu)' : ''} helperText="Bắt buộc — dùng để xác thực webhook (chống giả mạo)" onChange={(e) => setCfg({ ...cfg, sepay_webhook_secret: e.target.value })} />
            <TextField label="App base URL" value={cfg.app_base_url || ''} onChange={(e) => setCfg({ ...cfg, app_base_url: e.target.value })} helperText={cfg.has_env_override ? 'Đang bị ghi đè bởi biến môi trường APP_BASE_URL' : 'Tên miền hệ thống, vd https://shop.example.com'} />
            <Button variant="contained" onClick={save} disabled={saving}>
              Lưu
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="URL Webhook (khai báo trên SePay)" />
        <CardContent>
          <Stack spacing={2}>
            <CopyField label="Webhook URL" value={webhookUrl} />
            <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />}>
              <AlertTitle>Hướng dẫn cấu hình SePay</AlertTitle>
              <Box component="ol" sx={{ pl: 2, m: 0, '& li': { mb: 0.5 } }}>
                <li>Đăng nhập <Link href="https://my.sepay.vn" target="_blank" rel="noopener">my.sepay.vn</Link> → liên kết tài khoản ngân hàng.</li>
                <li>Vào <b>Cấu hình → Webhooks → Thêm Webhook</b>.</li>
                <li>Dán <b>Webhook URL</b> ở trên vào ô URL.</li>
                <li>Phần <b>Kiểu xác thực</b> chọn <b>API Key</b>, nhập một chuỗi bí mật và lưu cùng giá trị đó vào ô <b>Webhook secret</b> phía trên.</li>
                <li>Lưu lại. Khi khách chuyển khoản đúng nội dung, số dư sẽ tự cộng.</li>
              </Box>
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// AI

function AiTab() {
  const { ok, err } = useSnack();
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/api/admin/ai/config').then((r) => setCfg(r.data)).catch(err).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => load(), [load]);

  const providers: Record<string, any> = cfg?.providers || {};
  const models: string[] = cfg?.provider ? providers[cfg.provider]?.models || [] : [];

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/admin/ai/config', {
        provider: cfg.provider,
        model: cfg.model,
        custom_base_url: cfg.custom_base_url || '',
        ...(cfg.api_key && !String(cfg.api_key).includes('•') ? { api_key: cfg.api_key } : {}),
      });
      ok('Đã lưu cấu hình AI');
      load();
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };
  const test = async () => {
    setTesting(true);
    try {
      const r = await axiosInstance.post('/api/admin/ai/test');
      ok(`AI phản hồi: ${r.data?.response || 'OK'}`);
    } catch (e) {
      err(e, 'Test AI thất bại');
    } finally {
      setTesting(false);
    }
  };

  if (loading || !cfg) return <Loading />;
  return (
    <Card sx={{ maxWidth: 560 }}>
      <CardHeader title="Cấu hình AI" subheader="Dùng cho nút ✨ tạo mô tả sản phẩm / nội dung" />
      <CardContent>
        <Stack spacing={2.5}>
          <TextField select label="Nhà cung cấp" value={cfg.provider || ''} onChange={(e) => setCfg({ ...cfg, provider: e.target.value, model: providers[e.target.value]?.default_model || '' })}>
            <MenuItem value="">— Chọn —</MenuItem>
            {Object.entries(providers).map(([id, p]: [string, any]) => (
              <MenuItem key={id} value={id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          {models.length > 0 ? (
            <TextField select label="Model" value={cfg.model || ''} onChange={(e) => setCfg({ ...cfg, model: e.target.value })}>
              {models.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField label="Model" value={cfg.model || ''} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} />
          )}
          <TextField label="API key" placeholder={cfg.has_api_key ? `${cfg.api_key_masked || '••••'} (đã lưu)` : ''} onChange={(e) => setCfg({ ...cfg, api_key: e.target.value })} />
          <TextField label="Custom base URL (tuỳ chọn)" value={cfg.custom_base_url || ''} onChange={(e) => setCfg({ ...cfg, custom_base_url: e.target.value })} helperText="Dùng khi provider tương thích OpenAI nhưng khác endpoint" />
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" onClick={save} disabled={saving}>
              Lưu
            </Button>
            <Button variant="outlined" onClick={test} disabled={testing || !cfg.has_api_key} startIcon={<Iconify icon="solar:test-tube-bold" />}>
              Test
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// API PROVIDERS

// SMM panel được quản lý riêng ở trang SMM (có số dư + import) nên không liệt kê ở đây.
const PROVIDER_TYPES = [
  { value: 'giftcard', label: 'Thẻ cào / Giftcard' },
  { value: 'topup_game', label: 'Nạp game' },
  { value: 'account_premium', label: 'Tài khoản Premium' },
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
    axiosInstance
      .get('/api/api-providers')
      .then((r) => setRows((r.data || []).filter((p: any) => p.provider_type !== 'smm_panel')))
      .catch(err)
      .finally(() => setLoading(false));
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
  const base = useAppBaseUrl();
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
    <Stack spacing={3}>
      <Alert severity="info">
        <AlertTitle>Cách lấy Client ID / Secret</AlertTitle>
        Tạo ứng dụng OAuth trên trang nhà cung cấp (Google Cloud Console, Facebook Developers, GitHub Developer
        Settings…), rồi dán <b>Redirect URI</b> tương ứng (ô bên dưới mỗi nhà cung cấp) vào phần Authorized redirect URIs.
      </Alert>
      <Grid container spacing={3}>
        {providers.map((prov) => {
          const p = cfg[prov] || {};
          const redirect = `${base}/api/auth/${prov}/callback`;
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
                    <Divider />
                    <CopyField label="Redirect URI (dán vào nhà cung cấp)" value={redirect} />
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
    </Stack>
  );
}
