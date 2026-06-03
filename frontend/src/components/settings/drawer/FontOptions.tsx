// @mui
import { Box, Typography } from '@mui/material';
//
import { FONT_OPTIONS, FONT_FAMILY_MAP } from '../../../theme/typography';
import { StyledCard } from '../styles';
import { useSettingsContext } from '../SettingsContext';

// ----------------------------------------------------------------------

export default function FontOptions() {
  const { themeFontFamily, onChangeFontFamily } = useSettingsContext();

  return (
    <Box
      gap={1.5}
      display="grid"
      gridTemplateColumns="repeat(2, 1fr)"
    >
      {FONT_OPTIONS.map((font) => {
        const selected = themeFontFamily === font;
        return (
          <StyledCard
            key={font}
            selected={selected}
            onClick={() => onChangeFontFamily(font)}
            sx={{ height: 56, gap: 0.5, flexDirection: 'column' }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: FONT_FAMILY_MAP[font],
                color: selected ? 'primary.main' : 'text.secondary',
              }}
            >
              Aa
            </Typography>
            <Typography variant="caption" sx={{ color: selected ? 'text.primary' : 'text.disabled' }}>
              {font}
            </Typography>
          </StyledCard>
        );
      })}
    </Box>
  );
}
