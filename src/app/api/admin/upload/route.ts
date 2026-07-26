import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 5 * 1024 * 1024;

// Accepts multipart form uploads from the admin panel and stores the image
// in the database. Returns a stable URL served by /api/media/[id].
export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError(400, 'No file uploaded');
  if (!ALLOWED.includes(file.type)) return jsonError(400, 'Only JPEG, PNG, WebP, GIF or SVG images are allowed');
  if (file.size > MAX_BYTES) return jsonError(400, 'Image must be under 5 MB');

  const data = Buffer.from(await file.arrayBuffer());
  const media = await prisma.mediaFile.create({
    data: { fileName: file.name.slice(0, 255), mimeType: file.type, data },
  });
  return NextResponse.json({ ok: true, url: `/api/media/${media.id}` });
});
