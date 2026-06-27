import { useEffect, useRef, useState, useCallback } from 'react';
// next
import NextLink from 'next/link';
// @mui
import { useTheme } from '@mui/material/styles';
import {
  Avatar,
  Box,
  Fab,
  IconButton,
  InputBase,
  Paper,
  Slide,
  Stack,
  Typography,
  Button,
  Badge,
} from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// routes
import { PATH_AUTH } from '../../routes/paths';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../iconify';

// ----------------------------------------------------------------------
// Khung chat hỗ trợ trực tuyến (nội bộ) — mở ngay tại chỗ dưới dạng bong bóng
// chat, KHÔNG điều hướng sang trang riêng.
// API: GET /api/chat/my (tải), POST /api/chat/send (gửi), GET /api/chat/poll
// (nhận tin mới). Yêu cầu đăng nhập; khách chưa đăng nhập sẽ thấy lời mời đăng nhập.
//
// Có thể mở từ nơi khác (nút "Liên hệ trực tiếp", footer…) bằng cách phát sự kiện:
//   window.dispatchEvent(new Event('open-livechat'))
// ----------------------------------------------------------------------

type Msg = { id: number; sender: string; body: string; created_at?: string };

const POLL_MS = 4000;

export default function LiveChatPanel() {
  const theme = useTheme();
  const { isAuthenticated } = useAuthContext();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  // Số tin chưa đọc khi khung đang đóng -> hiển thị badge trên nút nổi.
  const [unread, setUnread] = useState(0);

  const lastIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setMsgs = useCallback((list: Msg[]) => {
    setMessages(list);
    if (list.length) lastIdRef.current = list[list.length - 1].id;
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setUnread(0);
  }, []);

  // Cho phép mở khung chat từ nơi khác (footer/support…) qua sự kiện toàn cục.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('open-livechat', handleOpen);
    return () => window.removeEventListener('open-livechat', handleOpen);
  }, [handleOpen]);

  // Cuộn xuống cuối khi có tin mới / mở khung.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Tải hội thoại khi mở khung.
  useEffect(() => {
    if (!open || !isAuthenticated) return undefined;
    let alive = true;
    setLoading(true);
    axiosInstance
      .get('/api/chat/my')
      .then((res) => {
        if (alive) setMsgs(res.data?.messages || []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, isAuthenticated, setMsgs]);

  // Poll tin nhắn mới — chạy cả khi đóng để cập nhật badge chưa đọc.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        // Lần poll đầu (chưa có mốc) chỉ để lấy mốc + số chưa đọc từ server,
        // KHÔNG cộng dồn cả lịch sử cũ vào badge.
        const seeding = lastIdRef.current === 0;
        const res = await axiosInstance.get('/api/chat/poll', {
          params: { after: lastIdRef.current },
        });
        const fresh: Msg[] = res.data?.messages || [];
        if (!alive) return;
        if (fresh.length) lastIdRef.current = fresh[fresh.length - 1].id;
        if (seeding) {
          if (!open) setUnread(res.data?.unread || 0);
          return;
        }
        if (fresh.length === 0) return;
        setMessages((prev) => [...prev, ...fresh]);
        if (!open) {
          const adminNew = fresh.filter((m) => m.sender === 'admin').length;
          if (adminNew) setUnread((u) => u + adminNew);
        }
      } catch {
        /* bỏ qua lỗi poll */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isAuthenticated, open]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await axiosInstance.post('/api/chat/send', { message: body });
      const msg: Msg | undefined = res.data?.message;
      if (msg) {
        lastIdRef.current = msg.id;
        setMessages((prev) => [...prev, msg]);
      }
    } catch {
      setText(body); // khôi phục nội dung nếu gửi lỗi
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Nút nổi (khi đóng).
  if (!open) {
    return (
      <Fab
        color="primary"
        aria-label="Hỗ trợ trực tuyến"
        onClick={handleOpen}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.speedDial,
        }}
      >
        <Badge badgeContent={unread} color="error" max={9}>
          <Iconify icon="solar:chat-round-dots-bold" width={26} />
        </Badge>
      </Fab>
    );
  }

  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          zIndex: theme.zIndex.speedDial,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: theme.customShadows.z24,
          bgcolor: 'background.paper',
          bottom: { xs: 0, sm: 24 },
          right: { xs: 0, sm: 24 },
          left: { xs: 0, sm: 'auto' },
          top: { xs: 0, sm: 'auto' },
          width: { xs: '100%', sm: 380 },
          height: { xs: '100%', sm: 560 },
          maxHeight: { sm: '80vh' },
          borderRadius: { xs: 0, sm: 2 },
        }}
      >
        {/* HEADER */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            p: 2,
            color: 'common.white',
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          }}
        >
          <Avatar sx={{ bgcolor: 'common.white', color: 'primary.main', width: 40, height: 40 }}>
            <Iconify icon="solar:headphones-round-sound-bold" width={24} />
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              Hỗ trợ trực tuyến
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Thường trả lời trong vài phút
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'common.white' }}>
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>

        {/* BODY */}
        {!isAuthenticated ? (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ flexGrow: 1, p: 4, textAlign: 'center' }}>
            <Iconify icon="solar:chat-round-dots-bold-duotone" width={64} sx={{ color: 'text.disabled' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Vui lòng đăng nhập để trò chuyện với bộ phận hỗ trợ.
            </Typography>
            <Button component={NextLink} href={PATH_AUTH.login} variant="contained">
              Đăng nhập
            </Button>
          </Stack>
        ) : (
          <>
            <Box
              ref={scrollRef}
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: 'background.neutral',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {!loading && messages.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
                  Xin chào! 👋 Bạn cần hỗ trợ gì không?
                </Typography>
              )}
              {messages.map((m) => {
                const mine = m.sender === 'user';
                return (
                  <Box
                    key={m.id}
                    sx={{
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                      px: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      typography: 'body2',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      bgcolor: mine ? 'primary.main' : 'background.paper',
                      color: mine ? 'common.white' : 'text.primary',
                      boxShadow: mine ? 'none' : theme.customShadows.z1,
                    }}
                  >
                    {m.body}
                  </Box>
                );
              })}
            </Box>

            {/* INPUT */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ p: 1.5, borderTop: `solid 1px ${theme.palette.divider}` }}
            >
              <InputBase
                fullWidth
                multiline
                maxRows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn…"
                sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: 'background.neutral' }}
              />
              <IconButton color="primary" onClick={handleSend} disabled={!text.trim() || sending}>
                <Iconify icon="solar:plain-bold" width={24} />
              </IconButton>
            </Stack>
          </>
        )}
      </Paper>
    </Slide>
  );
}
