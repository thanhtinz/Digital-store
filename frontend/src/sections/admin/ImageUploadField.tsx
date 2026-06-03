import { useRef, useState } from 'react';
// @mui
import { Box, Button, CircularProgress, Stack, TextField } from '@mui/material';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../../components/iconify';
import Image from '../../components/image';
import { useSnackbar } from '../../components/snackbar';

// ----------------------------------------------------------------------
// Ô upload ảnh dùng chung cho admin: tải file trực tiếp HOẶC dán URL.
// Backend: POST /api/banners/admin/upload-image (multipart 'file') -> { url }.
// ----------------------------------------------------------------------

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  height?: number;
};

export default function ImageUploadField({ label = 'Ảnh', value, onChange, height = 120 }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      setBusy(true);
      try {
        const r = await axiosInstance.post('/api/banners/admin/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (r.data?.url) {
          onChange(r.data.url);
          enqueueSnackbar('Đã tải ảnh lên');
        }
      } catch (err: any) {
        enqueueSnackbar(err?.detail || 'Tải ảnh thất bại', { variant: 'error' });
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          label={`${label} (URL hoặc tải lên)`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={pick}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} /> : <Iconify icon="solar:upload-bold" />}
          sx={{ flexShrink: 0, height: 40 }}
        >
          Tải lên
        </Button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      </Stack>
      {value && (
        <Box sx={{ borderRadius: 1, overflow: 'hidden', border: (t) => `1px solid ${t.palette.divider}` }}>
          <Image src={value} sx={{ height, width: 1 }} />
        </Box>
      )}
    </Stack>
  );
}
