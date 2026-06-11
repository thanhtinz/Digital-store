// @mui
import { Typography, Stack } from '@mui/material';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// locales
import { useLocales } from '../../locales';
// components
import Logo from '../../components/logo';
import Image from '../../components/image';
//
import { StyledRoot, StyledSectionBg, StyledSection, StyledContent } from './styles';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  illustration?: string;
  children: React.ReactNode;
};

export default function LoginLayout({ children, illustration, title }: Props) {
  const settings = useSiteSettings();
  const { translate } = useLocales();
  const siteLogo = settings?.site_logo;

  return (
    <StyledRoot>
      <Logo
        sx={{
          zIndex: 9,
          position: 'absolute',
          mt: { xs: 1.5, md: 5 },
          ml: { xs: 2, md: 5 },
        }}
      />

      <StyledSection>
        <Typography variant="h3" sx={{ mb: 10, maxWidth: 480, textAlign: 'center' }}>
          {title || `${translate('auth.welcome_back')}`}
        </Typography>

        {/* Logo thương hiệu lấy từ backend (nếu có cấu hình), nếu không dùng ảnh minh hoạ mặc định. */}
        {siteLogo ? (
          <Image
            disabledEffect
            visibleByDefault
            alt={settings?.site_name || 'logo'}
            src={siteLogo}
            sx={{ maxWidth: 200, mx: 'auto' }}
          />
        ) : (
          <Image
            disabledEffect
            visibleByDefault
            alt="auth"
            src={illustration || '/assets/illustrations/illustration_dashboard.png'}
            sx={{ maxWidth: 720 }}
          />
        )}

        <StyledSectionBg />
      </StyledSection>

      <StyledContent>
        <Stack sx={{ width: 1 }}> {children} </Stack>
      </StyledContent>
    </StyledRoot>
  );
}
