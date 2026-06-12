import { useEffect, useRef, useState } from 'react';
// @mui
import { Box, Chip, IconButton, Menu, Paper, Stack, TextField, Typography, Fade, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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

// Map thẻ cảm xúc (AI trả về) -> từ khoá tìm expression/motion trong model.
const EMO_KEYS: Record<string, string[]> = {
  'vui': ['happy', 'smile', 'joy', 'fun', 'laugh'],
  'buồn': ['sad', 'cry', 'down', 'tear'],
  'ngại': ['shy', 'blush', 'embarrass'],
  'ngạc nhiên': ['surprise', 'shock', 'wow'],
  'giận': ['angry', 'mad', 'anger'],
  'bình thường': ['normal', 'default', 'neutral', 'idle'],
};

function parseEmotion(raw: string): { emotion: string; text: string } {
  const m = String(raw || '').match(/^\s*\[([^\]]{1,24})\]\s*/);
  if (m) return { emotion: m[1].trim().toLowerCase(), text: raw.slice(m[0].length) };
  return { emotion: '', text: raw };
}

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  const quoteQueue = useRef<string[]>([]);  // hàng đợi đã xáo trộn -> không lặp lại tới khi hết
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
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  const [ttsMuted, setTtsMuted] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const ttsMutedRef = useRef(false);
  useEffect(() => { ttsMutedRef.current = ttsMuted; }, [ttsMuted]);
  const recRef = useRef<any>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
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
        const app = new PIXI.Application({ view: canvasRef.current, autoStart: true, backgroundAlpha: 0, width: 220, height: 300, preserveDrawingBuffer: true });
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
    quoteQueue.current = []; // dùng bộ câu mới khi đổi nhân vật
    const greetT = setTimeout(() => showOnce(greeting), 1500);
    const iv = setInterval(() => { showOnce(pickQuote()); }, 16000);
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
    lastBubbleAt.current = Date.now();
    setBubble(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble((b) => (b === text ? '' : b)), ms);
  };

  // Lấy câu thoại theo hàng đợi đã xáo trộn -> đi hết 100 câu mới lặp lại.
  const pickQuote = () => {
    if (!quoteQueue.current.length) quoteQueue.current = [...quotes].sort(() => Math.random() - 0.5);
    return quoteQueue.current.pop() || quotes[0] || '';
  };

  const interact = () => {
    const now = Date.now();
    if (now - interactLock.current < 1600) return; // chống spam
    interactLock.current = now;
    playRandomMotion();
    popBubble(pickQuote());
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

  // ── Cảm xúc -> biểu cảm + động tác (giống emotion engine N.E.K.O.) ──
  const playEmotion = (emo: string) => {
    const m = modelRef.current;
    if (!m || !emo) return;
    const keys = EMO_KEYS[emo] || [];
    if (!keys.length) return;
    try {
      const exps = m.internalModel?.settings?.expressions;
      if (Array.isArray(exps) && exps.length) {
        const idx = exps.findIndex((e: any) => keys.some((k) => String(e?.Name || e?.name || e?.file || e?.File || '').toLowerCase().includes(k)));
        if (idx >= 0) m.expression(idx);
      }
      const mm = m.internalModel?.motionManager;
      const groups = Object.keys(mm?.definitions || mm?.motionGroups || {});
      const g = groups.find((grp) => keys.some((k) => grp.toLowerCase().includes(k)));
      if (g) m.motion(g);
    } catch { /* noop */ }
  };

  // ── Nhận giọng nói (Web Speech API) -> gửi câu hỏi ──
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { popBubble('Trình duyệt không hỗ trợ nhận giọng nói 😢'); return; }
    if (listening && recRef.current) { try { recRef.current.stop(); } catch { /* noop */ } return; }
    const rec = new SR();
    rec.lang = 'vi-VN'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => { const t = e?.results?.[0]?.[0]?.transcript || ''; if (t) send(t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  // ── Đọc bằng TTS (audio; miệng do typewriter điều khiển) ──
  const speak = (text: string) => {
    try {
      if (ttsMutedRef.current) return;
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

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setSuggestions([]);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setSending(true);
    if (!openRef.current) setBubble('...');
    try {
      const r = await axiosInstance.post('/api/assistant/chat', { message: text, history: next.slice(-8) });
      const raw = r.data?.reply || '[bình thường] Mình chưa rõ ý bạn lắm 😅';
      const { emotion, text: reply } = parseEmotion(raw);
      setSending(false);
      playEmotion(emotion);
      speak(reply);
      typewrite(reply);
      if (Array.isArray(r.data?.suggestions)) setSuggestions(r.data.suggestions.slice(0, 3));
    } catch (e: any) {
      setSending(false);
      const msg = e?.detail || 'Trợ lý đang bận, thử lại sau nhé!';
      setMessages((m) => [...m, { role: 'assistant', content: msg }]);
      if (!openRef.current) setBubble(msg);
    }
  };

  // Chụp ảnh nhân vật (tải xuống) — giống nút camera của N.E.K.O.
  const screenshot = () => {
    try {
      const url = canvasRef.current?.toDataURL('image/png');
      if (!url) return;
      const a = document.createElement('a');
      a.href = url; a.download = `assistant_${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { /* noop */ }
  };

  const clearChat = () => { setMessages([]); setSuggestions([]); setBubble(''); };
  const addEmoji = (emo: string) => { setInput((v) => v + emo); setEmojiAnchor(null); };

  // Kéo thả panel chat.
  const onDragMove = (e: PointerEvent) => {
    if (!dragRef.current) return;
    const left = dragRef.current.ox + (e.clientX - dragRef.current.sx);
    const top = dragRef.current.oy + (e.clientY - dragRef.current.sy);
    setPanelPos({ left: Math.max(4, left), top: Math.max(4, top) });
  };
  const onDragEnd = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  };
  const onDragStart = (e: any) => {
    const r = panelRef.current?.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r?.left || 0, oy: r?.top || 0 };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
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
        ? { height: '100%', width: 'auto', objectFit: 'contain', display: live2dReady ? 'block' : 'none' }
        : { height: 220, width: 'auto', display: live2dReady ? 'block' : 'none' }}
    />
  ) : null;

  const avatarFallback = (!modelUrl || !live2dReady) && (
    <Box sx={{ width: open ? 140 : 72, height: open ? 140 : 72, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'common.white', boxShadow: 6 }}>
      <Iconify icon="solar:user-heart-rounded-bold" width={open ? 64 : 36} />
    </Box>
  );

  return (
    <>
      {/* ── Nhân vật (cố định góc/phải; khi mở chat thì cao gần nguyên màn) ── */}
      <Box
        onClick={interact}
        sx={!open
          ? {
              position: 'fixed', right: { xs: 12, md: 24 }, bottom: { xs: 12, md: 24 }, zIndex: (t) => t.zIndex.speedDial,
              cursor: 'pointer', '&:hover .live2d-toolbar': { opacity: 1, pointerEvents: 'auto' },
            }
          : isMobile
            ? {
                // Mobile mở: nhân vật nằm trong "sân khấu" trên cùng của khung toàn màn hình.
                position: 'fixed', top: 52, left: 0, right: 0, height: '34vh', zIndex: (t) => t.zIndex.speedDial + 2,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', cursor: 'pointer',
              }
            : {
                // Desktop mở: nhân vật cao bên phải.
                position: 'fixed', right: 0, bottom: 0, height: 'min(86vh, 760px)', zIndex: (t) => t.zIndex.speedDial,
                display: 'flex', alignItems: 'flex-end', cursor: 'pointer',
                '&:hover .live2d-toolbar': { opacity: 1, pointerEvents: 'auto' },
              }}
      >
        {canvasEl}
        {avatarFallback}

        {/* Bong bóng thoại (lời chào/ý/tương tác) phía trên đầu nhân vật */}
        <Fade in={!!bubble}>
          <Paper
            elevation={6}
            sx={{
              position: 'absolute', top: open ? 8 : 'auto', bottom: open ? 'auto' : 'calc(100% + 8px)',
              right: open ? 'auto' : 0, left: open ? '50%' : 'auto', transform: open ? 'translateX(-50%)' : 'none',
              maxWidth: 260, p: 1.25, borderRadius: 2, bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
              pointerEvents: 'none', zIndex: 2,
            }}
          >
            <Typography variant="body2">{bubble}</Typography>
          </Paper>
        </Fade>

        {/* Thanh công cụ nổi cạnh nhân vật (ẩn khi mở trên mobile vì panel đã có đủ) */}
        <Stack
          className="live2d-toolbar"
          direction="column"
          spacing={0.5}
          sx={{
            position: 'absolute', left: open ? 4 : 'auto', right: open ? 'auto' : 0, top: open ? '32%' : 4, zIndex: 3,
            display: open && isMobile ? 'none' : 'flex',
            opacity: { xs: 1, md: 0 }, pointerEvents: { xs: 'auto', md: 'none' }, transition: 'opacity .2s',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton size="small" title={open ? 'Ẩn/hiện khung chat' : 'Trò chuyện với trợ lý'} onClick={() => setOpen((o) => !o)}
            sx={{ bgcolor: 'primary.main', color: 'common.white', boxShadow: 3, '&:hover': { bgcolor: 'primary.dark' } }}>
            <Iconify icon="solar:chat-round-dots-bold" width={18} />
          </IconButton>
          {open && (
            <IconButton size="small" title={listening ? 'Đang nghe...' : 'Nói bằng giọng nói'} onClick={toggleVoice}
              sx={{ bgcolor: listening ? 'error.main' : 'background.paper', color: listening ? 'common.white' : 'inherit', boxShadow: 3 }}>
              <Iconify icon="solar:microphone-3-bold" width={18} />
            </IconButton>
          )}
          <IconButton size="small" title="Đổi động tác" onClick={interact}
            sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}>
            <Iconify icon="solar:magic-stick-3-bold" width={18} />
          </IconButton>
          {open && (
            <IconButton size="small" title="Chụp ảnh nhân vật" onClick={screenshot}
              sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}>
              <Iconify icon="solar:camera-bold" width={18} />
            </IconButton>
          )}
          <IconButton size="small" title="Ẩn trợ lý" onClick={() => { setOpen(false); setHidden(true); }}
            sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}>
            <Iconify icon="solar:eye-closed-bold" width={18} />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Panel chat kính mờ, kéo thả được ── */}
      {open && (
        <Paper
          ref={panelRef}
          elevation={0}
          sx={isMobile
            ? {
                // Mobile: khung TOÀN MÀN HÌNH (che hẳn trang) — sân khấu nhân vật ở trên, chat ở dưới.
                position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: (t) => t.zIndex.speedDial + 1,
                display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 0,
                bgcolor: 'background.default',
              }
            : {
                // Desktop: panel kính mờ nổi góc trái, kéo thả được.
                position: 'fixed', zIndex: (t) => t.zIndex.speedDial + 1,
                ...(panelPos ? { left: panelPos.left, top: panelPos.top, bottom: 'auto', right: 'auto' } : { left: 32, bottom: 40 }),
                width: 380, height: 500, maxWidth: '95vw',
                display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden',
                bgcolor: (t) => alpha(t.palette.background.paper, 0.82), backdropFilter: 'blur(12px)',
                border: (t) => `1px solid ${alpha(t.palette.common.white, 0.25)}`, boxShadow: 24,
              }}
        >
          <Stack
            direction="row" alignItems="center" spacing={1}
            onPointerDown={isMobile ? undefined : onDragStart}
            sx={{ p: 1.5, color: 'common.white', cursor: isMobile ? 'default' : 'move', bgcolor: (t) => alpha(t.palette.primary.main, 0.92), touchAction: 'none', flexShrink: 0 }}
          >
            <Iconify icon="solar:chat-round-dots-bold" />
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Trợ lý {settings?.site_name || ''}</Typography>
            <IconButton size="small" sx={{ color: 'common.white' }} title="Ẩn trợ lý" onClick={() => { setOpen(false); setHidden(true); }}>
              <Iconify icon="solar:eye-closed-bold" />
            </IconButton>
            <IconButton size="small" sx={{ color: 'common.white' }} onClick={() => setOpen(false)}>
              <Iconify icon="eva:close-fill" />
            </IconButton>
          </Stack>

          {/* Mobile: chừa "sân khấu" trên cùng để nhân vật đứng (nhân vật là lớp nổi phía trên) */}
          {isMobile && <Box sx={{ height: '34vh', flexShrink: 0 }} />}

          <Box ref={listRef} sx={{ flexGrow: 1, minHeight: 0, p: 1.5, overflowY: 'auto' }}>
            <Bubble role="assistant" text={greeting} />
            {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} />)}
            {sending && <Bubble role="assistant" text="..." />}
          </Box>

          {/* Gợi ý trả lời A/B/C */}
          {!!suggestions.length && (
            <Stack spacing={0.5} sx={{ px: 1.5, pb: 0.5 }}>
              {suggestions.map((s, i) => (
                <Chip
                  key={i} clickable variant="outlined" size="small"
                  label={`${'ABC'[i] || '•'}. ${s}`} onClick={() => send(s)}
                  sx={{ justifyContent: 'flex-start', height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
                />
              ))}
            </Stack>
          )}

          {/* Thanh công cụ panel (kiểu N.E.K.O.) */}
          <Stack direction="row" spacing={0.25} sx={{ px: 1, pt: 0.5 }} alignItems="center">
            <IconButton size="small" title="Chèn emoji" onClick={(e) => setEmojiAnchor(e.currentTarget)}>
              <Iconify icon="solar:emoji-funny-circle-bold" width={20} />
            </IconButton>
            <IconButton size="small" title="Đổi động tác" onClick={interact}>
              <Iconify icon="solar:magic-stick-3-bold" width={20} />
            </IconButton>
            <IconButton size="small" title="Chụp ảnh nhân vật" onClick={screenshot}>
              <Iconify icon="solar:camera-bold" width={20} />
            </IconButton>
            <IconButton size="small" title={ttsMuted ? 'Bật đọc giọng' : 'Tắt đọc giọng'} onClick={() => setTtsMuted((m) => !m)}>
              <Iconify icon={ttsMuted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold'} width={20} />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton size="small" color="error" title="Xoá hội thoại" onClick={clearChat}>
              <Iconify icon="solar:trash-bin-trash-bold" width={20} />
            </IconButton>
          </Stack>
          <Menu anchorEl={emojiAnchor} open={!!emojiAnchor} onClose={() => setEmojiAnchor(null)}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', px: 1, py: 0.5 }}>
              {['😊', '😍', '😂', '👍', '❤️', '🎁', '🛒', '💎', '🔥', '✨'].map((e) => (
                <IconButton key={e} size="small" onClick={() => addEmoji(e)}><span style={{ fontSize: 18 }}>{e}</span></IconButton>
              ))}
            </Box>
          </Menu>

          <Stack direction="row" spacing={0.5} sx={{ p: 1, pt: 0.5 }} alignItems="center">
            <IconButton
              color={listening ? 'error' : 'default'} onClick={toggleVoice}
              title={listening ? 'Đang nghe... bấm để dừng' : 'Nói chuyện bằng giọng nói'}
              sx={listening ? { animation: 'l2dpulse 1s infinite', '@keyframes l2dpulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } } : undefined}
            >
              <Iconify icon={listening ? 'solar:microphone-bold' : 'solar:microphone-3-bold'} />
            </IconButton>
            <TextField
              fullWidth size="small" placeholder={listening ? 'Đang nghe...' : 'Nhập câu hỏi...'} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <IconButton color="primary" onClick={() => send()} disabled={sending}>
              <Iconify icon="solar:plain-bold" />
            </IconButton>
          </Stack>
        </Paper>
      )}
    </>
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
