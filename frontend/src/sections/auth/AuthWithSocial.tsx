import { useEffect, useState } from 'react';
// @mui
import { Divider, IconButton, Stack, Tooltip } from '@mui/material';
// config
import { HOST_API_KEY } from '../../config-global';
// utils
import axios from '../../utils/axios';
// components
import Iconify from '../../components/iconify';

// ----------------------------------------------------------------------

type OAuthConfig = {
  google_enabled?: boolean;
  github_enabled?: boolean;
  facebook_enabled?: boolean;
  tiktok_enabled?: boolean;
};

// Provider nào backend đã hỗ trợ luồng đăng nhập thực tế.
const PROVIDERS = [
  { key: 'google_enabled', provider: 'google', label: 'Google', icon: 'eva:google-fill', color: '#DF3E30' },
  { key: 'github_enabled', provider: 'github', label: 'GitHub', icon: 'eva:github-fill', color: 'inherit' },
  { key: 'facebook_enabled', provider: 'facebook', label: 'Facebook', icon: 'eva:facebook-fill', color: '#1877F2' },
  { key: 'tiktok_enabled', provider: 'tiktok', label: 'TikTok', icon: 'ic:baseline-tiktok', color: 'inherit' },
] as const;

export default function AuthWithSocial() {
  const [config, setConfig] = useState<OAuthConfig | null>(null);

  useEffect(() => {
    let active = true;
    axios
      .get('/api/auth/config')
      .then((res) => {
        if (active) setConfig(res.data || {});
      })
      .catch(() => {
        if (active) setConfig({});
      });
    return () => {
      active = false;
    };
  }, []);

  // Chuyển hướng sang backend để bắt đầu luồng OAuth thực tế (không còn mockup).
  const handleLogin = (provider: string) => {
    window.location.href = `${HOST_API_KEY}/api/auth/${provider}`;
  };

  const enabled = PROVIDERS.filter((p) => config?.[p.key]);

  // Chưa bật provider nào thì ẩn hẳn khối đăng nhập MXH.
  if (!config || enabled.length === 0) {
    return null;
  }

  return (
    <div>
      <Divider
        sx={{
          my: 2.5,
          typography: 'overline',
          color: 'text.disabled',
          '&::before, ::after': {
            borderTopStyle: 'dashed',
          },
        }}
      >
        OR
      </Divider>

      <Stack direction="row" justifyContent="center" spacing={2}>
        {enabled.map((p) => (
          <Tooltip key={p.provider} title={p.label}>
            <IconButton
              color={p.color === 'inherit' ? 'inherit' : undefined}
              onClick={() => handleLogin(p.provider)}
            >
              <Iconify icon={p.icon} color={p.color === 'inherit' ? undefined : p.color} />
            </IconButton>
          </Tooltip>
        ))}
      </Stack>
    </div>
  );
}
