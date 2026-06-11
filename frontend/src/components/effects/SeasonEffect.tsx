import { useMemo } from 'react';
// @mui
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';

// ----------------------------------------------------------------------
// Hiệu ứng theo mùa (cấu hình admin): tuyết rơi, hoa anh đào, lá thu, mưa...
// Overlay cố định, không chặn thao tác (pointer-events: none).
// ----------------------------------------------------------------------

const fall = keyframes`
  0% { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(108vh) translateX(40px) rotate(360deg); opacity: .9; }
`;

const ICONS: Record<string, string[]> = {
  snow: ['❄', '❅', '❆'],
  sakura: ['🌸', '🌸', '🌷'],
  leaves: ['🍂', '🍁'],
  rain: ['💧'],
  hearts: ['❤️', '💕'],
};

export default function SeasonEffect() {
  const settings = useSiteSettings();
  const type = settings?.season_effect;

  const particles = useMemo(() => {
    const icons = ICONS[type as string];
    if (!icons) return [];
    return Array.from({ length: 28 }).map((_, i) => ({
      key: i,
      icon: icons[i % icons.length],
      left: Math.random() * 100,
      size: 12 + Math.random() * 16,
      duration: 6 + Math.random() * 8,
      delay: -Math.random() * 12,
      drift: type === 'rain' ? 0 : (Math.random() - 0.5) * 80,
    }));
  }, [type]);

  if (!type || type === 'none' || !particles.length) return null;

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {particles.map((p) => (
        <Box
          key={p.key}
          component="span"
          sx={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            fontSize: p.size,
            lineHeight: 1,
            animation: `${fall} ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
          }}
        >
          {p.icon}
        </Box>
      ))}
    </Box>
  );
}
