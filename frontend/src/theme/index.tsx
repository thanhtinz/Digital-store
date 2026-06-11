import { useMemo } from 'react';
// @mui
import { CssBaseline, GlobalStyles as MuiGlobalStyles } from '@mui/material';
import { createTheme, ThemeOptions, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
// components
import { useSettingsContext } from '../components/settings';
//
import palette from './palette';
import typography, { getFontFamily } from './typography';
import shadows from './shadows';
import componentsOverride from './overrides';
import customShadows from './customShadows';
import GlobalStyles from './globalStyles';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const { themeMode, themeDirection, themeFontFamily, themeFontSize } = useSettingsContext();

  const themeOptions: ThemeOptions = useMemo(
    () => ({
      palette: palette(themeMode),
      typography: { ...typography, fontFamily: getFontFamily(themeFontFamily) },
      shape: { borderRadius: 8 },
      direction: themeDirection,
      shadows: shadows(themeMode),
      customShadows: customShadows(themeMode),
    }),
    [themeDirection, themeMode, themeFontFamily]
  );

  const theme = createTheme(themeOptions);

  theme.components = componentsOverride(theme);

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      {/* Cỡ chữ tổng thể: đổi font-size gốc của html (mọi rem co giãn theo). */}
      <MuiGlobalStyles styles={{ html: { fontSize: `${((themeFontSize || 16) / 16) * 100}%` } }} />
      {children}
    </MUIThemeProvider>
  );
}
