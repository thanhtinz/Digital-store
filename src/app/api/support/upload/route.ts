import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

// Image uploads for support tickets (screenshots of errors, receipts…).
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('ticket-upload', 20, 60 * 60, String(user.id));
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError(400, 'No file uploaded');
  if (!ALLOWED.includes(file.type)) return jsonError(400, 'Only JPEG, PNG, WebP or GIF images are allowed');
  if (file.size > MAX_BYTES) return jsonError(400, 'Image must be under 5 MB');

  const data = Buffer.from(await file.arrayBuffer());
  const media = await prisma.mediaFile.create({
    data: { fileName: file.name.slice(0, 255), mimeType: file.type, data },
  });
  return NextResponse.json({ ok: true, url: `/api/media/${media.id}` });
});
