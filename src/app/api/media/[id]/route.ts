import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Serves images uploaded through the admin panel (stored in the database so
// they survive redeploys without external object storage).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return new NextResponse(null, { status: 404 });
  const file = await prisma.mediaFile.findUnique({ where: { id } });
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(file.data), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
      // SVGs can embed scripts — sandbox them so they render but never execute.
      ...(file.mimeType === 'image/svg+xml' ? { 'Content-Security-Policy': 'sandbox' } : {}),
    },
  });
}
