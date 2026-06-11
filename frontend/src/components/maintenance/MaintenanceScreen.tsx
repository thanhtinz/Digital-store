// @mui
import { Box, Button, Container, Stack, Typography } from '@mui/material';
// components
import Iconify from '../iconify';

// ----------------------------------------------------------------------

export type MaintenanceConfig = {
  on?: boolean;
  title?: string;
  message?: string;
  image?: string;
  contact?: string;
  eta?: string;
};

type Props = {
  config?: MaintenanceConfig;
  // Khi xem trước trong admin: bọc trong khung thay vì full màn hình.
  preview?: boolean;
};

export default function MaintenanceScreen({ config, preview }: Props) {
  const title = config?.title || 'Hệ thống đang bảo trì';
  const message =
    config?.message || 'Chúng tôi đang nâng cấp để phục vụ bạn tốt hơn. Vui lòng quay lại sau ít phút.';
  const image = config?.image;

  return (
    <Box
      sx={{
        ...(preview
          ? { borderRadius: 2, border: (t) => `1px dashed ${t.palette.divider}`, bgcolor: 'background.neutral' }
          : { minHeight: '100vh', bgcolor: 'background.default' }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 6, md: 10 },
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center" textAlign="center">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="maintenance" style={{ maxWidth: 320, width: '100%', height: 'auto' }} />
          ) : (
            <Box
              sx={{
                width: 120, height: 120, borderRadius: '50%', display: 'grid', placeItems: 'center',
                bgcolor: 'warning.lighter', color: 'warning.main',
              }}
            >
              <Iconify icon="solar:settings-bold-duotone" width={64} />
            </Box>
          )}

          <Typography variant="h3">{title}</Typography>

          <Typography sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>{message}</Typography>

          {config?.eta && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
              <Iconify icon="solar:clock-circle-bold" />
              <Typography variant="subtitle2">Dự kiến hoạt động lại: {config.eta}</Typography>
            </Stack>
          )}

          {config?.contact && (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral', width: 1 }}>
              <Typography variant="caption" color="text.disabled">Liên hệ hỗ trợ</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{config.contact}</Typography>
            </Box>
          )}

          {!preview && (
            <Button variant="outlined" onClick={() => window.location.reload()} startIcon={<Iconify icon="solar:refresh-bold" />}>
              Thử lại
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
