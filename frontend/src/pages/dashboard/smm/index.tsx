import { useEffect } from 'react';
// next
import { useRouter } from 'next/router';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';

// ----------------------------------------------------------------------

export default function SmmIndex() {
  const { replace } = useRouter();
  useEffect(() => {
    replace(PATH_DASHBOARD.smm.order);
  }, [replace]);
  return null;
}
