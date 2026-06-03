// @mui
import {
  Box,
  Stack,
  Badge,
  Button,
  Drawer,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
// config
import { NAV } from '../../../../config-global';
// locales
import { useLocales } from '../../../../locales';
// components
import Iconify from '../../../../components/iconify';
import Scrollbar from '../../../../components/scrollbar';
import { RHFRadioGroup } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

export type CategoryOption = { label: string; value: string };

type Props = {
  open: boolean;
  isDefault: boolean;
  categories: CategoryOption[];
  onOpen: VoidFunction;
  onClose: VoidFunction;
  onResetFilter: VoidFunction;
};

export default function ShopFilterDrawer({
  open,
  onOpen,
  onClose,
  isDefault,
  categories,
  onResetFilter,
}: Props) {
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`shop_page.${k}`)}`;

  const options = [{ label: t('all'), value: 'All' }, ...categories];

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        endIcon={<Iconify icon="ic:round-filter-list" />}
        onClick={onOpen}
      >
        {t('filters')}
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        BackdropProps={{ invisible: true }}
        PaperProps={{ sx: { width: NAV.W_BASE } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pl: 2, pr: 1, py: 2 }}
        >
          <Typography variant="subtitle1">{t('filters')}</Typography>

          <IconButton onClick={onClose}>
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>

        <Divider />

        <Scrollbar>
          <Stack spacing={3} sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('category')}</Typography>
              <RHFRadioGroup name="category" options={options} />
            </Stack>
          </Stack>
        </Scrollbar>

        <Box sx={{ p: 2.5 }}>
          <Badge
            color="error"
            variant="dot"
            anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            invisible={isDefault}
            sx={{ width: 1 }}
          >
            <Button
              fullWidth
              size="large"
              type="submit"
              color="inherit"
              variant="outlined"
              onClick={onResetFilter}
              startIcon={<Iconify icon="eva:trash-2-outline" />}
            >
              {t('clear')}
            </Button>
          </Badge>
        </Box>
      </Drawer>
    </>
  );
}
