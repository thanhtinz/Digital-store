import { useState } from 'react';
// form
import { Controller, useFormContext } from 'react-hook-form';
// @mui
import { Button, MenuItem, Box } from '@mui/material';
// locales
import { useLocales } from '../../../../locales';
// components
import Iconify from '../../../../components/iconify';
import MenuPopover from '../../../../components/menu-popover';

// ----------------------------------------------------------------------

const SORT_KEYS: Record<string, string> = {
  featured: 'sort_featured',
  newest: 'sort_newest',
  priceDesc: 'sort_price_high',
  priceAsc: 'sort_price_low',
};

// ----------------------------------------------------------------------

export default function ShopProductSort() {
  const { control } = useFormContext();
  const { translate } = useLocales();
  const t = (k: string) => `${translate(`shop_page.${k}`)}`;

  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  const options = Object.keys(SORT_KEYS).map((value) => ({ value, label: t(SORT_KEYS[value]) }));
  const renderLabel = (value: string) => t(SORT_KEYS[value] || 'sort_featured');

  return (
    <Controller
      name="sortBy"
      control={control}
      render={({ field }) => (
        <>
          <Button
            disableRipple
            color="inherit"
            onClick={handleOpenPopover}
            endIcon={
              <Iconify icon={openPopover ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'} />
            }
            sx={{ fontWeight: 'fontWeightMedium' }}
          >
            {t('sort_by')}
            <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
              {renderLabel(field.value)}
            </Box>
          </Button>

          <MenuPopover open={openPopover} onClose={handleClosePopover}>
            {options.map((option) => (
              <MenuItem
                key={option.value}
                selected={option.value === field.value}
                onClick={() => {
                  handleClosePopover();
                  field.onChange(option.value);
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </MenuPopover>
        </>
      )}
    />
  );
}
