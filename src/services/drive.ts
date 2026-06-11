/**
 * Google Drive (Service Account) — phục vụ file mã nguồn/theme.
 *
 * Cấu hình lưu trong SiteConfig:
 *   - google_service_account_json : nội dung JSON của service account
 *   - source_drive_folder_id      : (tùy chọn) id folder gốc chứa src
 *
 * Admin chỉ cần share folder Drive cho email của service account
 * (client_email trong JSON) là hệ thống đọc được file.
 *
 * Link Drive thật KHÔNG bao giờ lộ ra ngoài: file luôn được stream qua server.
 */
import prisma from '../db';

let cachedKey = '';
let cachedClient: any = null;

async function getConfig(key: string): Promise<string | null> {
  const row = await prisma.siteConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

/** Email service account (để hiển thị cho admin biết share folder cho ai). */
export async function getServiceAccountEmail(): Promise<string | null> {
  const raw = (await getConfig('google_service_account_json')) || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (!raw) return null;
  try {
    return JSON.parse(raw).client_email || null;
  } catch {
    return null;
  }
}

/** Khởi tạo Drive client từ service account (cache theo nội dung JSON). */
async function getDrive(): Promise<any> {
  const raw = (await getConfig('google_service_account_json')) || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (!raw) throw new Error('DRIVE_NOT_CONFIGURED');

  if (cachedClient && cachedKey === raw) return cachedClient;

  // googleapis nạp động: chỉ cần khi tính năng mã nguồn được dùng.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let google: any;
  try {
    google = require('googleapis').google;
  } catch {
    throw new Error('GOOGLEAPIS_NOT_INSTALLED');
  }

  let creds: any;
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error('DRIVE_BAD_CREDENTIALS');
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });
  cachedClient = drive;
  cachedKey = raw;
  return drive;
}

export type DriveFileMeta = { id: string; name: string; size?: string; mimeType?: string };

/** Lấy metadata file (tên, dung lượng) — dùng để hiển thị + đặt header tải. */
export async function getDriveFileMeta(fileId: string): Promise<DriveFileMeta> {
  const drive = await getDrive();
  const r = await drive.files.get({
    fileId,
    fields: 'id, name, size, mimeType',
    supportsAllDrives: true,
  });
  return r.data as DriveFileMeta;
}

/**
 * Stream file Drive trực tiếp về response Express (proxy).
 * Tự đặt Content-Disposition để trình duyệt tải xuống.
 */
export async function streamDriveFile(fileId: string, res: any, suggestedName?: string): Promise<void> {
  const drive = await getDrive();
  let meta: DriveFileMeta | null = null;
  try {
    meta = await getDriveFileMeta(fileId);
  } catch {
    /* vẫn thử stream nếu không lấy được meta */
  }
  const name = suggestedName || meta?.name || `download-${fileId}`;
  if (meta?.size) res.setHeader('Content-Length', meta.size);
  res.setHeader('Content-Type', meta?.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);

  const driveRes = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );
  await new Promise<void>((resolve, reject) => {
    driveRes.data
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err))
      .pipe(res);
  });
}
