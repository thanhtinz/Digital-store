import { useEffect, useState } from 'react';
// @mui
import { Box, Button, Divider, Stack, TextField, Typography, Avatar } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// auth
import { useAuthContext } from '../../../../auth/useAuthContext';
// utils
import axiosInstance from '../../../../utils/axios';
// components
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';

// ----------------------------------------------------------------------

type Props = { productId: string | number };

export default function ProductQuestions({ productId }: Props) {
  const { isAuthenticated } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    axiosInstance
      .get(`/api/products/${productId}/questions`)
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (productId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await axiosInstance.post(`/api/products/${productId}/questions`, { question: text.trim() });
      setText('');
      enqueueSnackbar('Đã gửi câu hỏi. Shop sẽ trả lời sớm!');
      load();
    } catch (e: any) {
      enqueueSnackbar(e?.detail || e?.message || 'Gửi thất bại', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {isAuthenticated ? (
        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            multiline
            placeholder="Đặt câu hỏi về sản phẩm này..."
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
          />
          <LoadingButton variant="contained" loading={sending} onClick={submit} sx={{ flexShrink: 0 }}>
            Gửi
          </LoadingButton>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Đăng nhập để đặt câu hỏi cho sản phẩm này.
        </Typography>
      )}

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Chưa có câu hỏi nào. Hãy là người đầu tiên!</Typography>
      ) : (
        <Stack divider={<Divider />} spacing={2}>
          {items.map((q) => (
            <Box key={q.id}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32 }}>{(q.user_name || 'K')[0]?.toUpperCase()}</Avatar>
                <Box>
                  <Typography variant="subtitle2">{q.user_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(q.created_at).toLocaleDateString('vi-VN')}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1, ml: 6 }}>{q.question}</Typography>
              {q.answer && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, ml: 6, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                  <Iconify icon="solar:chat-round-like-bold" sx={{ color: 'primary.main', flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle2" color="primary.main">{q.answered_by || 'Shop'}</Typography>
                    <Typography variant="body2">{q.answer}</Typography>
                  </Box>
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
