import { useCallback, useEffect, useState } from 'react';
// @mui
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Quản lý phiên bản mã nguồn/theme cho 1 sản phẩm: thêm/sửa/xoá version,
// gắn Google Drive fileId, changelog, đánh dấu bản mới nhất.
// Phát version mới → backend tự cộng 1 lượt tải cho khách đã mua.
// ----------------------------------------------------------------------

type Version = {
  id: number;
  version: string;
  changelog?: string | null;
  driveFileId?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  isLatest: boolean;
  releasedAt?: string;
};

type Props = { productId: number };

const empty = { version: '', changelog: '', drive_file_id: '', file_name: '', file_size: '', is_latest: true };

export default function AdminSourceVersions({ productId }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<Version[]>([]);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveOk, setDriveOk] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    axiosInstance
      .get(`/api/admin/source/${productId}/versions`)
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {});
    axiosInstance
      .get('/api/admin/source/drive-status')
      .then((r) => {
        setDriveOk(!!r.data?.configured);
        setDriveEmail(r.data?.service_account_email || null);
      })
      .catch(() => {});
  }, [productId]);

  useEffect(() => load(), [load]);

  const save = async () => {
    if (!editing?.version?.trim()) {
      enqueueSnackbar('Nhập số phiên bản', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await axiosInstance.patch(`/api/admin/source/versions/${editing.id}`, editing);
        enqueueSnackbar('Đã cập nhật phiên bản');
      } else {
        const r = await axiosInstance.post(`/api/admin/source/${productId}/versions`, editing);
        enqueueSnackbar(`Đã thêm phiên bản${r.data?.granted ? ` — +${r.data.granted} lượt tải cho khách đã mua` : ''}`);
      }
      setEditing(null);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Lưu thất bại', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: Version) => {
    if (!window.confirm(`Xoá phiên bản ${v.version}?`)) return;
    try {
      await axiosInstance.delete(`/api/admin/source/versions/${v.id}`);
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || 'Xoá thất bại', { variant: 'error' });
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1">Phiên bản &amp; file tải</Typography>
        <Button size="small" variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setEditing({ ...empty })}>
          Thêm phiên bản
        </Button>
      </Stack>

      {!driveOk ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Chưa kết nối Google Drive. Vào <b>Cấu hình → Mã nguồn/Drive</b> dán JSON service account.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          Share folder Drive cho email: <b>{driveEmail}</b> rồi dán <b>fileId</b> của từng bản vào đây.
        </Alert>
      )}

      <Stack spacing={1}>
        {items.map((v) => (
          <Box
            key={v.id}
            sx={{ p: 1.5, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">
                v{v.version} {v.isLatest && <Typography component="span" variant="caption" sx={{ color: 'success.main' }}>· mới nhất</Typography>}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }} noWrap>
                {v.fileName || '—'} {v.fileSize ? `· ${v.fileSize}` : ''} {v.driveFileId ? '· ✓ Drive' : '· ⚠ chưa có fileId'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setEditing({
              id: v.id, version: v.version, changelog: v.changelog || '', drive_file_id: v.driveFileId || '',
              file_name: v.fileName || '', file_size: v.fileSize || '', is_latest: v.isLatest,
            })}>
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => remove(v)}>
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Box>
        ))}
        {!items.length && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
            Chưa có phiên bản nào.
          </Typography>
        )}
      </Stack>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.id ? 'Sửa phiên bản' : 'Thêm phiên bản'}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2}>
              <TextField label="Số phiên bản (vd 1.0.0)" value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} size="small" fullWidth />
              <TextField label="Google Drive File ID" value={editing.drive_file_id} onChange={(e) => setEditing({ ...editing, drive_file_id: e.target.value })} size="small" fullWidth placeholder="vd 1AbC...xyz" helperText="Mở file trên Drive → Chia sẻ cho service account → copy ID trong URL" />
              <Stack direction="row" spacing={2}>
                <TextField label="Tên file" value={editing.file_name} onChange={(e) => setEditing({ ...editing, file_name: e.target.value })} size="small" fullWidth placeholder="theme-v1.0.0.zip" />
                <TextField label="Dung lượng" value={editing.file_size} onChange={(e) => setEditing({ ...editing, file_size: e.target.value })} size="small" sx={{ width: 160 }} placeholder="12 MB" />
              </Stack>
              <TextField label="Changelog" value={editing.changelog} onChange={(e) => setEditing({ ...editing, changelog: e.target.value })} size="small" fullWidth multiline minRows={3} placeholder="- Sửa lỗi…&#10;- Thêm tính năng…" />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Đặt làm bản mới nhất</Typography>
                <Switch checked={!!editing.is_latest} onChange={(e) => setEditing({ ...editing, is_latest: e.target.checked })} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setEditing(null)}>Huỷ</Button>
          <Button variant="contained" onClick={save} disabled={saving}>Lưu</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
