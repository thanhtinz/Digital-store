import { useState } from 'react';
// @mui
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

// ----------------------------------------------------------------------
// Loader dùng chung toàn site. Hiển thị GIF tại /assets/loading.gif.
// Nếu chưa có file GIF (404) thì tự fallback sang thanh loading CSS cùng phong cách.
//  - fullscreen: phủ toàn màn hình (route/auth/Suspense).
//  - size: chiều rộng GIF (px).
// ----------------------------------------------------------------------

const slide = keyframes`
  0% { left: -40%; }
  100% { left: 100%; }
`;

function CssFallback() {
  return (
    <Box sx={{ width: 240, maxWidth: '80vw', textAlign: 'center' }}>
      <Box
        sx={{
          position: 'relative', height: 18, borderRadius: 9, overflow: 'hidden',
          border: '2px solid #e0b15a', bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            position: 'absolute', top: 0, bottom: 0, width: '40%', borderRadius: 9,
            background: 'linear-gradient(90deg, #f6c244, #e8a33d)',
            animation: `${slide} 1.1s ease-in-out infinite`,
          }}
        />
      </Box>
      <Typography sx={{ mt: 1.5, color: '#9a6a3a', fontWeight: 600, letterSpacing: 1 }}>
        Loading......
      </Typography>
    </Box>
  );
}

type Props = {
  fullscreen?: boolean;
  size?: number;
};

export default function AppLoader({ fullscreen, size = 140 }: Props) {
  const [failed, setFailed] = useState(false);

  const content = failed ? (
    <CssFallback />
  ) : (
    <Box
      component="img"
      src="/assets/loading.gif"
      alt="Đang tải..."
      onError={() => setFailed(true)}
      sx={{ width: size, height: 'auto', maxWidth: '70vw' }}
    />
  );

  if (fullscreen) {
    return (
      <Box
        sx={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, width: 1 }}>
      {content}
    </Box>
  );
}
