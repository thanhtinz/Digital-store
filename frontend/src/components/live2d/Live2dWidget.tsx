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
  const [live2dReady, setLive2dReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

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
        // chạm vào nhân vật -> mở chat
        model.on('hit', () => setOpen((o) => !o));
      } catch {
        /* tải Live2D thất bại -> dùng avatar fallback */
      }
    })();
    return () => {
      cancelled = true;
      try { appRef.current?.destroy(true); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ── Lời chào + tip ngẫu nhiên ──
  useEffect(() => {
    const t0 = setTimeout(() => setBubble(greeting), 1500);
    let i = 0;
    const iv = setInterval(() => {
      if (open || sending) return;
      if (tips.length) {
        setBubble(tips[i % tips.length]);
        i += 1;
        setTimeout(() => setBubble((b) => (b === tips[(i - 1) % tips.length] ? '' : b)), 6000);
      }
    }, 20000);
    return () => { clearTimeout(t0); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, tips.length, open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // ── Nhép miệng theo trạng thái nói ──
  const setMouth = (v: number) => {
    try {
      const core = modelRef.current?.internalModel?.coreModel;
      core?.setParameterValueById?.('ParamMouthOpenY', v);
    } catch { /* noop */ }
  };
  const startLipSync = () => {
    stopLipSync();
    mouthTimer.current = setInterval(() => setMouth(Math.random() * 0.8 + 0.1), 120);
  };
  const stopLipSync = () => {
    if (mouthTimer.current) { clearInterval(mouthTimer.current); mouthTimer.current = null; }
    setMouth(0);
  };

  // ── Đọc bằng TTS ──
  const speak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const vi = synth.getVoices().find((v) => /vi|vietnam/i.test(v.lang) || /vi/i.test(v.name));
      if (vi) u.voice = vi;
      u.lang = vi?.lang || 'vi-VN';
      u.rate = 1; u.pitch = 1.1;
      u.onstart = () => startLipSync();
      u.onend = () => stopLipSync();
      u.onerror = () => stopLipSync();
      synth.speak(u);
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

      {/* Nhân vật */}
      <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
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
