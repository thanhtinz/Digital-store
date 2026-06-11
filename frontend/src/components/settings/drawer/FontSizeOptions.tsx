// @mui
import { Box, Slider, Typography } from '@mui/material';
//
import { useSettingsContext } from '../SettingsContext';

// ----------------------------------------------------------------------

export default function FontSizeOptions() {
  const { themeFontSize, onChangeFontSize } = useSettingsContext();

  return (
    <Box sx={{ px: 1.5 }}>
      <Slider
        value={themeFontSize || 16}
        min={12}
        max={20}
        step={1}
        marks
        valueLabelDisplay="auto"
        onChange={(_, value) => onChangeFontSize(value as number)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Aa 12
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 16 }}>
          Aa 20
        </Typography>
      </Box>
    </Box>
  );
}
