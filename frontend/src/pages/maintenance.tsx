// next
import Head from 'next/head';
// hooks
import useSiteSettings from '../hooks/useSiteSettings';
// components
import MaintenanceScreen from '../components/maintenance/MaintenanceScreen';

// ----------------------------------------------------------------------

export default function MaintenancePage() {
  const settings = useSiteSettings();
  return (
    <>
      <Head>
        <title> Bảo trì | Digital Store</title>
      </Head>
      <MaintenanceScreen config={settings?.maintenance} />
    </>
  );
}
