import { useEffect, useRef, useState } from 'react';
// @mui
import { Box, IconButton, Paper, Stack, TextField, Typography, Fade } from '@mui/material';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// utils
import axiosInstance from '../../utils/axios';
// components
import Iconify from '../iconify';

// ----------------------------------------------------------------------
// Trợ lý ảo Live2D: nhân vật anime ở góc + chat AI + đọc (TTS) + nhép miệng.
// Live2D tải từ CDN, model do admin cấu hình. Nếu không tải được model thì
// hiển thị avatar tĩnh dễ thương (chat + TTS vẫn hoạt động).
// ----------------------------------------------------------------------

const CDN = {
  // Cubism 2 core (cho model .model.json) + Cubism 4 core (cho .model3.json)
  core2: 'https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js',
  core4: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  pixi: 'https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js',
  // bundle hỗ trợ CẢ Cubism 2 và 4
  display: 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js',
};

// Kho model Live2D (AzharRizkiZ/Live2D-Model) phục vụ qua jsDelivr CDN.
const MODEL_CDN_BASE = 'https://cdn.jsdelivr.net/gh/AzharRizkiZ/Live2D-Model@main/assets/models';
// Model mặc định (Asuna - SAO) — admin có thể đổi.
const DEFAULT_MODEL = `${MODEL_CDN_BASE}/SAO/asuna/asuna_01/asuna_01.model.json`;

// Câu vu vơ khi chạm/tương tác với nhân vật (KHÔNG mở chat).
const INTERACTIONS = [
  'Hí hí, đừng chọc mình mà~ 😳',
  'Bạn cần mình tư vấn mua tài khoản không nè? 💖',
  'Bấm vào biểu tượng chat để nói chuyện với mình nha! 💬',
  'Hôm nay shop có nhiều ưu đãi lắm đó~ ✨',
  'Mình luôn ở đây nếu bạn cần giúp đỡ nha! 🥰',
  'Ưi~ nhột quá à! 🙈',
  'Bạn muốn xem vòng quay may mắn không? 🎡',
  'Mua sắm vui vẻ nha bạn ơi! 🛍️',
  'Có gì thắc mắc cứ hỏi mình nhé! 😊',
  'Chúc bạn một ngày thật tuyệt vời! 🌟',
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
  // Cho phép dán URL đầy đủ HOẶC đường dẫn tương đối trong kho model (vd "SAO/asuna/asuna_01/asuna_01.model.json").
  const rawModel = (settings?.live2d_model_url || '').trim();
  const modelUrl = !rawModel
    ? DEFAULT_MODEL
    : /^https?:\/\//i.test(rawModel)
      ? rawModel
      : `${MODEL_CDN_BASE}/${rawModel.replace(/^\/+/, '')}`;
  const scale = Number(settings?.live2d_scale) || 0.16;
  const greeting = settings?.assistant_greeting || 'Xin chào! Mình có thể giúp gì cho bạn? 💬';
  const tips: string[] = String(settings?.assistant_tips || '')
    .split('\n').map((s) => s.trim()).filter(Boolean);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const mouthTimer = useRef<any>(null);
  const bubbleTimer = useRef<any>(null);
  const tickerFnRef = useRef<any>(null);
  const interactRef = useRef<() => void>(() => {});
  const utterRef = useRef<any[]>([]); // giữ ref utterance chống bị GC (Chrome cắt giữa chừng)
  const keepAlive = useRef<any>(null);
  const [live2dReady, setLive2dReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [bubble, setBubble] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Ref đồng bộ trạng thái cho các vòng lặp/ticker (tránh đóng băng giá trị cũ).
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
        // Cubism 2 core có thể lỗi tải ở vài mạng -> không chặn (model cubism4 vẫn chạy).
        await loadScript(CDN.core2).catch(() => {});
        await loadScript(CDN.core4).catch(() => {});
        await loadScript(CDN.pixi);
        await loadScript(CDN.display);
        if (cancelled || !canvasRef.current) return;
        const PIXI = (window as any).PIXI;
        const Live2DModel = PIXI?.live2d?.Live2DModel;
        if (!PIXI || !Live2DModel) return;
        const app = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0,
          width: 220,
          height: 300,
        });
        appRef.current = app;
        const model = await Live2DModel.from(modelUrl);
        if (cancelled) { app.destroy(); return; }
        model.scale.set(scale);
        model.anchor.set(0.5, 0);
        model.position.set(110, 0);
        app.stage.addChild(model);
        modelRef.current = model;
        setLive2dReady(true);
        // Áp giá trị miệng MỖI FRAME sau khi model tự update (model auto-update đăng ký
        // trên Ticker.shared trước, callback này thêm sau -> chạy sau -> không bị reset).
        const fn = () => { if (speakingRef.current) setMouth(mouthRef.current); };
        PIXI.Ticker.shared.add(fn);
        tickerFnRef.current = fn;
        // chạm vào nhân vật -> chỉ tương tác (đổi động tác + nói câu vu vơ), KHÔNG mở chat
        model.on('hit', () => interactRef.current());
      } catch {
        /* tải Live2D thất bại -> dùng avatar fallback */
      }
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

  // ── Chào 1 lần; sau đó CHỈ luân phiên lời thoại (tips) nếu có ──
  useEffect(() => {
    let hideT: any;
    const showOnce = (text: string) => {
      if (openRef.current || sendingRef.current) return;
      setBubble(text);
      clearTimeout(hideT);
      hideT = setTimeout(() => setBubble(''), 6000);
    };
    const greetT = setTimeout(() => showOnce(greeting), 1500); // chào đúng 1 lần
    let iv: any;
    if (tips.length) {
      let i = 0;
      iv = setInterval(() => { showOnce(tips[i % tips.length]); i += 1; }, 16000);
    }
    return () => { clearTimeout(greetT); clearTimeout(hideT); if (iv) clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, tips.join('|')]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // ── Nhép miệng (hỗ trợ cả Cubism 2 & 4) ──
  function setMouth(v: number) {
    try {
      const core = modelRef.current?.internalModel?.coreModel;
      if (!core) return;
      if (typeof core.setParameterValueById === 'function') {
        core.setParameterValueById('ParamMouthOpenY', v); // Cubism 4
      } else if (typeof core.setParamFloat === 'function') {
        core.setParamFloat('PARAM_MOUTH_OPEN_Y', v);       // Cubism 2
      }
    } catch { /* noop */ }
  }
  const startLipSync = () => {
    stopLipSync();
    speakingRef.current = true;
    // Cập nhật biên độ miệng; ticker sẽ áp giá trị mỗi frame.
    mouthTimer.current = setInterval(() => { mouthRef.current = Math.random() * 0.8 + 0.15; }, 110);
  };
  const stopLipSync = () => {
    if (mouthTimer.current) { clearInterval(mouthTimer.current); mouthTimer.current = null; }
    speakingRef.current = false;
    mouthRef.current = 0;
    setMouth(0);
  };

  // ── Tương tác: chạm nhân vật -> đổi động tác + nói câu vu vơ (KHÔNG mở chat) ──
  const playRandomMotion = () => {
    const m = modelRef.current;
    if (!m) return;
    try {
      const mm = m.internalModel?.motionManager;
      const defs = mm?.definitions || mm?.motionGroups || {};
      const groups = Object.keys(defs || {});
      if (groups.length) {
        // ưu tiên nhóm chạm thân nếu có
        const prefer = groups.find((g) => /tap|body|touch|click|flick/i.test(g));
        m.motion(prefer || groups[Math.floor(Math.random() * groups.length)]);
      }
      const exps = m.internalModel?.settings?.expressions;
      if (Array.isArray(exps) && exps.length) m.expression(Math.floor(Math.random() * exps.length));
    } catch { /* noop */ }
  };

  const popBubble = (text: string, ms = 5000) => {
    if (openRef.current) return;
    setBubble(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble((b) => (b === text ? '' : b)), ms);
  };

  const interact = () => {
    playRandomMotion();
    popBubble(INTERACTIONS[Math.floor(Math.random() * INTERACTIONS.length)]);
  };
  useEffect(() => { interactRef.current = interact; });

  // ── Đọc bằng TTS (chia câu + chống Chrome cắt giữa chừng) ──
  const speak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      clearInterval(keepAlive.current);
      const vi = synth.getVoices().find((v) => /vi|vietnam/i.test(v.lang) || /vi/i.test(v.name));
      // Tách thành câu ngắn -> tránh lỗi Chrome dừng sau ~15s với câu dài.
      const chunks = (text.match(/[^.!?…\n]+[.!?…]*/g) || [text]).map((s) => s.trim()).filter(Boolean);
      utterRef.current = [];
      chunks.forEach((chunk, idx) => {
        const u = new SpeechSynthesisUtterance(chunk);
        if (vi) u.voice = vi;
        u.lang = vi?.lang || 'vi-VN';
        u.rate = 1; u.pitch = 1.1;
        if (idx === 0) u.onstart = () => startLipSync();
        if (idx === chunks.length - 1) u.onend = () => { stopLipSync(); clearInterval(keepAlive.current); };
        u.onerror = () => { stopLipSync(); clearInterval(keepAlive.current); };
        utterRef.current.push(u); // giữ tham chiếu chống GC
        synth.speak(u);
      });
      // Keep-alive: định kỳ pause/resume để Chrome không tự dừng.
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
    setBubble('...');
    try {
      const r = await axiosInstance.post('/api/assistant/chat', {
        message: text,
        history: next.slice(-8),
      });
      const reply = r.data?.reply || 'Mình chưa rõ ý bạn lắm 😅';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      setBubble(reply);
      speak(reply);
    } catch (e: any) {
      const msg = e?.detail || 'Trợ lý đang bận, thử lại sau nhé!';
      setMessages((m) => [...m, { role: 'assistant', content: msg }]);
      setBubble(msg);
    } finally {
      setSending(false);
    }
  };

  // Đã ẩn -> chỉ hiện nút nhỏ để gọi trợ lý quay lại.
  if (hidden) {
    return (
      <Box sx={{ position: 'fixed', right: { xs: 12, md: 24 }, bottom: { xs: 12, md: 24 }, zIndex: (t) => t.zIndex.speedDial }}>
        <IconButton
          onClick={() => setHidden(false)}
          sx={{ bgcolor: 'primary.main', color: 'common.white', boxShadow: 6, '&:hover': { bgcolor: 'primary.dark' } }}
        >
          <Iconify icon="solar:user-heart-rounded-bold" width={26} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'fixed', right: { xs: 12, md: 24 }, bottom: { xs: 12, md: 24 }, zIndex: (t) => t.zIndex.speedDial }}>
      {/* Bong bóng thoại */}
      <Fade in={!!bubble && !open}>
        <Paper
          elevation={6}
          sx={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, maxWidth: 240, p: 1.5,
            borderRadius: 2, fontSize: 14, '&::after': {
              content: '""', position: 'absolute', bottom: -8, right: 28, borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent', borderTop: (th) => `8px solid ${th.palette.background.paper}`,
            },
          }}
        >
          <Typography variant="body2">{bubble}</Typography>
        </Paper>
      </Fade>

      {/* Khung chat */}
      <Fade in={open} unmountOnExit>
        <Paper
          elevation={10}
          sx={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, width: { xs: 'min(86vw, 340px)', sm: 340 },
            height: 420, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, bgcolor: 'primary.main', color: 'common.white' }}>
            <Iconify icon="solar:chat-round-dots-bold" />
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Trợ lý {settings?.site_name || ''}</Typography>
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
        </Paper>
      </Fade>

      {/* Nhân vật + thanh công cụ nổi */}
      <Box sx={{ position: 'relative', '&:hover .live2d-toolbar': { opacity: 1, pointerEvents: 'auto' } }}>
        {/* Thanh công cụ: chat / đổi động tác / ẩn */}
        <Stack
          className="live2d-toolbar"
          direction="column"
          spacing={0.5}
          sx={{
            position: 'absolute', left: -8, bottom: 8, transform: 'translateX(-100%)',
            opacity: { xs: 1, md: 0 }, pointerEvents: { xs: 'auto', md: 'none' }, transition: 'opacity .2s',
          }}
        >
          <IconButton
            size="small" title="Trò chuyện với trợ lý"
            onClick={() => setOpen((o) => !o)}
            sx={{ bgcolor: 'primary.main', color: 'common.white', boxShadow: 3, '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <Iconify icon="solar:chat-round-dots-bold" width={18} />
          </IconButton>
          <IconButton
            size="small" title="Đổi động tác"
            onClick={interact}
            sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}
          >
            <Iconify icon="solar:magic-stick-3-bold" width={18} />
          </IconButton>
          <IconButton
            size="small" title="Ẩn trợ lý"
            onClick={() => { setOpen(false); setHidden(true); }}
            sx={{ bgcolor: 'background.paper', boxShadow: 3, '&:hover': { bgcolor: 'background.neutral' } }}
          >
            <Iconify icon="solar:eye-closed-bold" width={18} />
          </IconButton>
        </Stack>

        {/* Chạm vào nhân vật -> chỉ tương tác (không mở chat) */}
        <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={interact}>
          {modelUrl ? (
            <canvas ref={canvasRef} width={220} height={300} style={{ width: 160, height: 220, display: live2dReady ? 'block' : 'none' }} />
          ) : null}
          {(!modelUrl || !live2dReady) && (
            <Box
              sx={{
                width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center',
                bgcolor: 'primary.main', color: 'common.white', boxShadow: 6,
              }}
            >
              <Iconify icon="solar:user-heart-rounded-bold" width={36} />
            </Box>
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
          maxWidth: '80%', px: 1.5, py: 1, borderRadius: 2, fontSize: 14,
          bgcolor: me ? 'primary.main' : 'background.paper',
          color: me ? 'common.white' : 'text.primary',
          boxShadow: 1,
        }}
      >
        <Typography variant="body2">{text}</Typography>
      </Box>
    </Stack>
  );
}
