import { getAppUrl, getSettings } from './settings';

// Tell search engines the sitemap changed (fired after publishing news).
// IndexNow covers Bing/Yandex/Seznam; the Google sitemap ping is retired,
// so Google simply re-crawls the sitemap on its own schedule.
export async function pingSearchEngines(changedPath?: string): Promise<void> {
  try {
    const appUrl = await getAppUrl();
    if (!appUrl.startsWith('https://')) return; // localhost/dev — nothing to ping
    const { indexnow_key: key } = await getSettings(['indexnow_key']);
    if (!key) return;
    const host = new URL(appUrl).host;
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${appUrl}/indexnow.txt`,
        urlList: [changedPath ? `${appUrl}${changedPath}` : `${appUrl}/sitemap.xml`],
      }),
    }).catch(() => {});
  } catch {
    // best-effort only
  }
}
