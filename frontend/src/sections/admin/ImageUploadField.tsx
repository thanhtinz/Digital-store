import { useRef, useState } from 'react';
// @mui
import { Box, Button, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
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

// ----------------------------------------------------------------------
// Album nhiều ảnh (dùng cho sản phẩm tài khoản premium...)

export function GalleryField({
  label = 'Album ảnh',
  value,
  onChange,
  markCover = false,
}: {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  // markCover: đánh dấu ảnh đầu tiên là "Ảnh bìa" + cho phép đặt ảnh khác làm bìa.
  markCover?: boolean;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const list = Array.isArray(value) ? value : [];

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        const r = await axiosInstance.post('/api/banners/admin/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (r.data?.url) urls.push(r.data.url);
      }
      onChange([...list, ...urls]);
      enqueueSnackbar(`Đã thêm ${urls.length} ảnh`);
    } catch (err: any) {
      enqueueSnackbar(err?.detail || 'Tải ảnh thất bại', { variant: 'error' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => onChange([list[i], ...list.filter((_, idx) => idx !== i)]);

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label} ({list.length})
        </Typography>
        <Button
          size="small"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : <Iconify icon="solar:gallery-add-bold" />}
        >
          Thêm ảnh
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      </Stack>
      {list.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {list.map((url, i) => (
            <Box key={i} sx={{ position: 'relative', width: 72, height: 72 }}>
              <Image
                src={url}
                sx={{
                  width: 1,
                  height: 1,
                  borderRadius: 1,
                  ...(markCover && i === 0 && { border: (t) => `2px solid ${t.palette.primary.main}` }),
                }}
              />
              {markCover && i === 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    fontSize: 9,
                    lineHeight: '14px',
                    textAlign: 'center',
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                  }}
                >
                  Ảnh bìa
                </Box>
              )}
              {markCover && i !== 0 && (
                <IconButton
                  size="small"
                  title="Đặt làm ảnh bìa"
                  onClick={() => makeCover(i)}
                  sx={{ position: 'absolute', bottom: -8, left: -8, bgcolor: 'background.paper', boxShadow: 1, p: 0.25, '&:hover': { bgcolor: 'background.neutral' } }}
                >
                  <Iconify icon="solar:star-bold" width={14} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => remove(i)}
                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'common.white', p: 0.25, '&:hover': { bgcolor: 'error.dark' } }}
              >
                <Iconify icon="eva:close-fill" width={14} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
}
