// @mui
import { Dialog, DialogProps, useMediaQuery, useTheme } from '@mui/material';

// ----------------------------------------------------------------------
// Dialog tự chuyển full màn hình trên mobile để form không bị tràn/khó dùng.
// Dùng thay cho <Dialog> thông thường.
// ----------------------------------------------------------------------

export default function ResponsiveDialog(props: DialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return <Dialog fullScreen={fullScreen} {...props} />;
}
