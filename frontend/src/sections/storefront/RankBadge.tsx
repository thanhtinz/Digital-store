// @mui
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------
// Hiển thị huy hiệu cấp bậc: màu theo hạng, icon, hiệu ứng lấp lánh (sparkle),
// tên nổi bật (highlight) nếu hạng bật.
// ----------------------------------------------------------------------

const shimmer = keyframes`
  0% { background-position: -120% 0; }
  100% { background-position: 220% 0; }
`;

type RankLite = {
  name: string;
  color?: string;
  icon?: string | null;
  sparkle?: boolean;
  highlight_name?: boolean;
};

export default function RankBadge({ rank, size = 'md' }: { rank: RankLite; size?: 'sm' | 'md' | 'lg' }) {
  if (!rank) return null;
  const color = rank.color || '#00AB55';
  const px = size === 'lg' ? 1.5 : size === 'sm' ? 0.75 : 1;
  const fontSize = size === 'lg' ? 15 : size === 'sm' ? 11 : 13;
  const iconW = size === 'lg' ? 20 : size === 'sm' ? 13 : 16;

  return (
    <Box
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, px, py: 0.5, borderRadius: 5,
        bgcolor: `${color}22`, color, border: `1px solid ${color}55`,
        position: 'relative', overflow: 'hidden',
        ...(rank.sparkle && {
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,.65) 50%, transparent 70%)',
            backgroundSize: '220% 100%',
            animation: `${shimmer} 2.2s linear infinite`,
            pointerEvents: 'none',
          },
        }),
      }}
    >
      {rank.icon && rank.icon.includes(':') ? (
        <Iconify icon={rank.icon} width={iconW} />
      ) : rank.icon ? (
        <span style={{ fontSize: iconW }}>{rank.icon}</span>
      ) : (
        <Iconify icon="solar:crown-bold" width={iconW} />
      )}
      <Typography
        component="span"
        sx={{
          fontSize, fontWeight: rank.highlight_name ? 800 : 600, lineHeight: 1,
          ...(rank.highlight_name && {
            background: `linear-gradient(90deg, ${color}, #f1a832)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }),
        }}
      >
        {rank.name}
      </Typography>
    </Box>
  );
}
