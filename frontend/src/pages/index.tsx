// next
import { useEffect } from 'react';
import { useRouter } from 'next/router';
// config
import { PATH_DASHBOARD } from '../routes/paths';

// ----------------------------------------------------------------------

export default function HomePage() {
  const { push } = useRouter();
  useEffect(() => {
    push(PATH_DASHBOARD.root);
  }, [push]);
  return null;
}
