import { useEffect } from 'react';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';

// ----------------------------------------------------------------------
// Hiệu ứng khi click chuột (cấu hình trong admin). Dùng Web Animations API,
// không render React -> nhẹ. type: hearts | sparkles | stars | flowers | bubbles
// ----------------------------------------------------------------------

const SETS: Record<string, string[]> = {
  hearts: ['❤️', '💕', '💖', '💗'],
  sparkles: ['✨', '⭐', '🌟', '💫'],
  stars: ['⭐', '✦', '✩', '★'],
  flowers: ['🌸', '🌺', '🌼', '🌷'],
  bubbles: ['🫧', '○', '◦', '°'],
  snowflake: ['❄️', '❅', '❆'],
};

export default function ClickEffect() {
  const settings = useSiteSettings();
  const type = settings?.click_effect;

  useEffect(() => {
    if (!type || type === 'none' || typeof document === 'undefined') return undefined;
    const list = SETS[type] || SETS.hearts;

    const onClick = (e: MouseEvent) => {
      const n = 6;
      for (let i = 0; i < n; i += 1) {
        const el = document.createElement('span');
        el.textContent = list[Math.floor(Math.random() * list.length)];
        el.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;transform:translate(-50%,-50%);pointer-events:none;z-index:99999;font-size:${14 + Math.random() * 16}px;will-change:transform,opacity;`;
        document.body.appendChild(el);
        const dx = (Math.random() - 0.5) * 140;
        const dy = -50 - Math.random() * 110;
        const rot = (Math.random() - 0.5) * 120;
        el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.25) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 750 + Math.random() * 450, easing: 'cubic-bezier(.2,.7,.3,1)' }
        ).onfinish = () => el.remove();
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [type]);

  return null;
}
