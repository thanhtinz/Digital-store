import { useEffect, useRef, useState } from 'react';
// @mui
import { Box, IconButton, Paper, Stack, TextField, Typography, Fade } from '@mui/material';
import { alpha } from '@mui/material/styles';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../iconify';

// ----------------------------------------------------------------------
// Trợ lý ảo Live2D: nhân vật anime + chat AI + đọc (TTS) + nhép miệng.
// - Click vào nhân vật: chỉ tương tác (đổi động tác + câu thoại), KHÔNG mở chat.
// - Bấm icon chat: mở KHUNG LỚN — trái là tin nhắn, phải là nhân vật đang tương tác.
// - Lời thoại AI hiện dần như đang nói chuyện (typewriter) + miệng cử động theo từng chữ.
// - Tính cách & lời thoại idle do AI tự sinh khi admin quét model (lưu sẵn trong settings).
// ----------------------------------------------------------------------

const CDN = {
  core2: 'https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js',
  core4: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  pixi: 'https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js',
  display: 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js',
};

const MODEL_CDN_BASE = 'https://cdn.jsdelivr.net/gh/AzharRizkiZ/Live2D-Model@main/assets/models';
const DEFAULT_MODEL = `${MODEL_CDN_BASE}/SAO/asuna/asuna_01/asuna_01.model.json`;

// Lời thoại dự phòng nếu nhân vật chưa có lời thoại do AI tạo.
const DEFAULT_QUOTES = [
  'Bạn cần mình tư vấn mua tài khoản không nè? 💖',
  'Bấm vào biểu tượng chat để nói chuyện với mình nha! 💬',
  'Hôm nay shop có nhiều ưu đãi lắm đó~ ✨',
  'Mình luôn ở đây nếu bạn cần giúp đỡ nha! 🥰',
  'Bạn muốn xem vòng quay may mắn không? 🎡',
  'Mua sắm vui vẻ nha bạn ơi! 🛍️',
  'Có gì thắc mắc cứ hỏi mình nhé! 😊',
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as any)._loaded) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject());
      return undefined;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => { (s as any)._loaded = true; resolve(); };
    s.onerror = () => reject();
    document.body.appendChild(s);
    return undefined;
  });
}

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Live2dWidget() {
  const settings = useSiteSettings();
  const rawModel = (settings?.live2d_model_url || '').trim();
  const modelUrl = !rawModel
    ? DEFAULT_MODEL
    : /^https?:\/\//i.test(rawModel)
      ? rawModel
      : `${MODEL_CDN_BASE}/${rawModel.replace(/^\/+/, '')}`;
  const scale = Number(settings?.live2d_scale) || 0.16;
  const greeting = settings?.assistant_greeting || 'Xin chào! Mình có thể giúp gì cho bạn? 💬';
  // Lời thoại idle: ưu tiên câu do AI tạo (live2d_quotes), fallback mặc định.
  const quotes: string[] = (() => {
    try {
      const a = JSON.parse(String(settings?.live2d_quotes || '[]'));
      if (Array.isArray(a) && a.length) return a.map((s) => String(s)).filter(Boolean);
    } catch { /* noop */ }
    return DEFAULT_QUOTES;
  })();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const bubbleTimer = useRef<any>(null);
  const typingTimer = useRef<any>(null);
  const lastBubbleAt = useRef(0);   // chặn tips chạy song song
  const interactLock = useRef(0);   // chống spam click
  const tickerFnRef = useRef<any>(null);
  const interactRef = useRef<() => void>(() => {});
  const utterRef = useRef<any[]>([]); // chống GC utterance
  const keepAlive = useRef<any>(null);
  const [live2dReady, setLive2dReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [bubble, setBubble] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const openRef = useRef(open);
  const sendingRef = useRef(sending);
  const speakingRef = useRef(false);
  const mouthRef = useRef(0);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { sendingRef.current = sending; }, [sending]);

  // ── Live2D init ──
  useEffect(() => {
    let cancelled = false;
    if (!modelUrl) return undefined;
    (async () => {
      try {
        await loadScript(CDN.core2).catch(() => {});
        await loadScript(CDN.core4).catch(() => {});
        await loadScript(CDN.pixi);
        await loadScript(CDN.display);
        if (cancelled || !canvasRef.current) return;
        const PIXI = (window as any).PIXI;
        const Live2DModel = PIXI?.live2d?.Live2DModel;
        if (!PIXI || !Live2DModel) return;
        const app = new PIXI.Application({ view: canvasRef.current, autoStart: true, backgroundAlpha: 0, width: 220, height: 300 });
        appRef.current = app;
        const model = await Live2DModel.from(modelUrl);
        if (cancelled) { app.destroy(); return; }
        model.scale.set(scale);
        model.anchor.set(0.5, 0);
        model.position.set(110, 0);
        app.stage.addChild(model);
        modelRef.current = model;
        setLive2dReady(true);
        // Áp giá trị miệng MỖI FRAME sau khi model tự update.
        const fn = () => { if (speakingRef.current) setMouth(mouthRef.current); };
        PIXI.Ticker.shared.add(fn);
        tickerFnRef.current = fn;
        // Chạm vào nhân vật -> chỉ tương tác, KHÔNG mở chat.
        model.on('hit', () => interactRef.current());
      } catch { /* tải Live2D thất bại -> avatar fallback */ }
    })();
    return () => {
      cancelled = true;
      try {
        const PIXI = (window as any).PIXI;
        if (tickerFnRef.current && PIXI?.Ticker?.shared) PIXI.Ticker.shared.remove(tickerFnRef.current);
      } catch { /* noop */ }
      try { appRef.current?.destroy(true); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ── Chào 1 lần; sau đó luân phiên lời thoại idle khi rảnh ──
  useEffect(() => {
    let hideT: any;
    const showOnce = (text: string) => {
      if (openRef.current || sendingRef.current || speakingRef.current) return;
      if (Date.now() - lastBubbleAt.current < 12000) return;
      setBubble(text);
      clearTimeout(hideT);
      hideT = setTimeout(() => setBubble(''), 6000);
    };
    const greetT = setTimeout(() => showOnce(greeting), 1500);
    const iv = setInterval(() => { showOnce(quotes[Math.floor(Math.random() * quotes.length)]); }, 16000);
    return () => { clearTimeout(greetT); clearTimeout(hideT); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, quotes.join('|')]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // ── Nhép miệng (Cubism 2 & 4) ──
  function setMouth(v: number) {
    try {
      const core = modelRef.current?.internalModel?.coreModel;
      if (!core) return;
      if (typeof core.setParameterValueById === 'function') core.setParameterValueById('ParamMouthOpenY', v);
      else if (typeof core.setParamFloat === 'function') core.setParamFloat('PARAM_MOUTH_OPEN_Y', v);
    } catch { /* noop */ }
  }

  // ── Đổi động tác + biểu cảm ngẫu nhiên ──
  const playRandomMotion = () => {
    const m = modelRef.current;
    if (!m) return;
    try {
      const mm = m.internalModel?.motionManager;
      const defs = mm?.definitions || mm?.motionGroups || {};
      const groups = Object.keys(defs || {});
      if (groups.length) {
        const prefer = groups.find((g) => /tap|body|touch|click|flick/i.test(g));
        m.motion(prefer || groups[Math.floor(Math.random() * groups.length)]);
      }
      const exps = m.internalModel?.settings?.expressions;
      if (Array.isArray(exps) && exps.length) m.expression(Math.floor(Math.random() * exps.length));
    } catch { /* noop */ }
  };

  const popBubble = (text: string, ms = 5000) => {
    if (openRef.current) return;
    lastBubbleAt.current = Date.now();
    setBubble(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble((b) => (b === text ? '' : b)), ms);
  };

  const interact = () => {
    const now = Date.now();
    if (now - interactLock.current < 1600) return; // chống spam
    interactLock.current = now;
    playRandomMotion();
    popBubble(quotes[Math.floor(Math.random() * quotes.length)]);
  };
  useEffect(() => { interactRef.current = interact; });

  // ── Hiện chữ dần như đang nói + miệng cử động theo TỪNG CHỮ ──
  const typewrite = (full: string) => {
    clearInterval(typingTimer.current);
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);
    let i = 0;
    speakingRef.current = true;
    typingTimer.current = setInterval(() => {
      i += 1;
      const slice = full.slice(0, i);
      setMessages((m) => {
        const c = m.slice();
        for (let k = c.length - 1; k >= 0; k -= 1) { if (c[k].role === 'assistant') { c[k] = { role: 'assistant', content: slice }; break; } }
        return c;
      });
      if (!openRef.current) setBubble(slice);
      const ch = full[i - 1] || '';
      mouthRef.current = /\s|[.,!?…:;"'-]/.test(ch) ? 0.06 : 0.25 + Math.random() * 0.6;
      if (i >= full.length) {
        clearInterval(typingTimer.current);
        speakingRef.current = false; mouthRef.current = 0; setMouth(0);
        lastBubbleAt.current = Date.now();
        if (!openRef.current) { clearTimeout(bubbleTimer.current); bubbleTimer.current = setTimeout(() => setBubble((b) => (b === full ? '' : b)), 6000); }
      }
    }, 42);
  };

  // ── Đọc bằng TTS (audio; miệng do typewriter điều khiển) ──
  const speak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      clearInterval(keepAlive.current);
      const vi = synth.getVoices().find((v) => /vi|vietnam/i.test(v.lang) || /vi/i.test(v.name));
      const chunks = (text.match(/[^.!?…\n]+[.!?…]*/g) || [text]).map((s) => s.trim()).filter(Boolean);
      utterRef.current = [];
      chunks.forEach((chunk) => {
        const u = new SpeechSynthesisUtterance(chunk);
        if (vi) u.voice = vi;
        u.lang = vi?.lang || 'vi-VN';
        u.rate = 1; u.pitch = 1.15;
        utterRef.current.push(u);
        synth.speak(u);
      });
      keepAlive.current = setInterval(() => {
        if (!synth.speaking) { clearInterval(keepAlive.current); return; }
        try { synth.pause(); synth.resume(); } catch { /* noop */ }
      }, 8000);
    } catch { /* noop */ }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setSending(true);
    if (!openRef.current) setBubble('...');
    try {
      const r = await axiosInstance.post('/api/assistant/chat', { message: text, history: next.slice(-8) });
      const reply = r.data?.reply || 'Mình chưa rõ ý bạn lắm 😅';
      setSending(false);
      speak(reply);
      typewrite(reply);
    } catch (e: any) {
      setSending(false);
      const msg = e?.detail || 'Trợ lý đang bận, thử lại sau nhé!';
      setMessages((m) => [...m, { role: 'assistant', content: msg }]);
      if (!openRef.current) setBubble(msg);
    }
  };

  // Đã ẩn -> nút nhỏ gọi trợ lý quay lại.
  if (hidden) {
    return (
      <Box sx={{ position: 'fixed', right: { xs: 12, md: 24 }, bottom: { xs: 12, md: 24 }, zIndex: (t) => t.zIndex.speedDial }}>
        <IconButton onClick={() => setHidden(false)} sx={{ bgcolor: 'primary.main', color: 'common.white', boxShadow: 6, '&:hover': { bgcolor: 'primary.dark' } }}>
          <Iconify icon="solar:user-heart-rounded-bold" width={26} />
        </IconButton>
      </Box>
    );
  }

  const canvasEl = modelUrl ? (
    <canvas
      ref={canvasRef}
      width={220}
      height={300}
      style={open
        ? { width: '100%', height: '100%', objectFit: 'contain', display: live2dReady ? 'block' : 'none' }
        : { height: 220, width: 'auto', display: live2dReady ? 'block' : 'none' }}
    />
  ) : null;

  const avatarFallback = (!modelUrl || !live2dReady) && (
    <Box sx={{ width: open ? 96 : 72, height: open ? 96 : 72, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'common.white', boxShadow: 6 }}>
      <Iconify icon="solar:user-heart-rounded-bold" width={open ? 48 : 36} />
    </Box>
  );

  return (
    <Box sx={{ position: 'fixed', right: { xs: 12, md: 24 }, bottom: { xs: 12, md: 24 }, zIndex: (t) => t.zIndex.speedDial }}>
      {/* Bong bóng thoại (chỉ khi đóng) */}
      <Fade in={!!bubble && !open}>
        <Paper
          elevation={6}
          sx={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, maxWidth: 240, p: 1.5, borderRadius: 2, fontSize: 14,
            '&::after': {
              content: '""', position: 'absolute', bottom: -8, right: 28, borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent', borderTop: (th) => `8px solid ${th.palette.background.paper}`,
            },
          }}
        >
          <Typography variant="body2">{bubble}</Typography>
        </Paper>
      </Fade>

      {/* Khung chính: nở thành cửa sổ lớn khi mở */}
      <Box
        sx={open
          ? {
              position: 'absolute', bottom: 0, right: 0,
              display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' },
              width: { xs: '92vw', sm: 640 }, height: { xs: '72vh', sm: 460 }, maxWidth: '95vw',
              bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', boxShadow: 24,
            }
          : { position: 'relative' }}
      >
        {/* Cột trái: tin nhắn (chỉ khi mở) */}
        {open && (
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, bgcolor: 'primary.main', color: 'common.white' }}>
              <Iconify icon="solar:chat-round-dots-bold" />
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Trợ lý {settings?.site_name || ''}</Typography>
              <IconButton size="small" sx={{ color: 'common.white' }} title="Đổi động tác" onClick={interact}>
                <Iconify icon="solar:magic-stick-3-bold" />
              </IconButton>
              <IconButton size="small" sx={{ color: 'common.white' }} onClick={() => setOpen(false)}>
                <Iconify icon="eva:close-fill" />
              </IconButton>
            </Stack>

            <Box ref={listRef} sx={{ flexGrow: 1, p: 1.5, overflowY: 'auto', bgcolor: 'background.neutral' }}>
              <Bubble role="assistant" text={greeting} />
              {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} />)}
              {sending && <Bubble role="assistant" text="..." />}
            </Box>

            <Stack direction="row" spacing={1} sx={{ p: 1 }}>
              <TextField
                fullWidth size="small" placeholder="Nhập câu hỏi..." value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <IconButton color="primary" onClick={send} disabled={sending}>
                <Iconify icon="solar:plain-bold" />
              </IconButton>
            </Stack>
          </Box>
        )}

        {/* Sân khấu nhân vật (LUÔN là phần tử cuối -> canvas không bị remount) */}
        <Box
          onClick={open ? undefined : interact}
          sx={open
            ? {
                position: 'relative', flexShrink: 0,
                width: { xs: '100%', sm: 240 }, height: { xs: '40%', sm: 'auto' },
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden',
                background: (t) => `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.10)}, ${alpha(t.palette.primary.light, 0.04)})`,
              }
            : { position: 'relative', cursor: 'pointer', '&:hover .live2d-toolbar': { opacity: 1, pointerEvents: 'auto' } }}
        >
          {canvasEl}
          {avatarFallback}

          {/* Thanh công cụ (chỉ khi đóng) — góc phải nhân vật */}
          {!open && (
            <Stack
              className="live2d-toolbar"
              direction="column"
              spacing={0.5}
              sx={{
                position: 'absolute', right: 0, top: 4, zIndex: 1,
                opacity: { xs: 1, md: 0 }, pointerEvents: { xs: 'auto', md: 'none' }, transition: 'opacity .2s',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton size="small" title="Trò chuyện với trợ lý" onClick={() => setOpen(true)}
                sx={{ bgcolor: 'primary.main', color: 'common.white', boxShadow: 3, '&:hover': { bgcolor: 'primary.dark' } }}>
                <Iconify icon="solar:chat-round-dots-bold" width={18} />
              </IconButton>
              <IconButton size="small" title="Đổi động tác" onClick={interact}
                sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}>
                <Iconify icon="solar:magic-stick-3-bold" width={18} />
              </IconButton>
              <IconButton size="small" title="Ẩn trợ lý" onClick={() => { setOpen(false); setHidden(true); }}
                sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}>
                <Iconify icon="solar:eye-closed-bold" width={18} />
              </IconButton>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const me = role === 'user';
  return (
    <Stack direction="row" justifyContent={me ? 'flex-end' : 'flex-start'} sx={{ mb: 1 }}>
      <Box
        sx={{
          maxWidth: '82%', px: 1.5, py: 1, borderRadius: 2, fontSize: 14,
          bgcolor: me ? 'primary.main' : 'background.paper',
          color: me ? 'common.white' : 'text.primary',
          boxShadow: 1,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{text}</Typography>
      </Box>
    </Stack>
  );
}
