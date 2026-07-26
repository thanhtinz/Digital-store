import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler, jsonError } from '@/lib/api';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id: Number(params.id) } });
  if (!post) return jsonError(404, 'Post not found');
  return NextResponse.json({ post });
});

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const b = await req.json();
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return jsonError(404, 'Post not found');

  const willPublish = b.isPublished !== undefined ? !!b.isPublished : existing.isPublished;
  const post = await prisma.post.update({
    where: { id },
    data: {
      ...(b.title !== undefined ? { title: String(b.title).trim().slice(0, 200) } : {}),
      ...(b.slug !== undefined ? { slug: slugify(String(b.slug)) } : {}),
      ...(b.excerpt !== undefined ? { excerpt: b.excerpt ? String(b.excerpt).slice(0, 500) : null } : {}),
      ...(b.content !== undefined ? { content: String(b.content) } : {}),
      ...(b.coverImage !== undefined ? { coverImage: b.coverImage ? String(b.coverImage) : null } : {}),
      ...(b.isPublished !== undefined ? { isPublished: willPublish } : {}),
      // Stamp the publish date the first time a post goes live.
      ...(willPublish && !existing.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
  audit(admin, 'post.update', post.title);
  return NextResponse.json({ ok: true, post });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const post = await prisma.post.delete({ where: { id: Number(params.id) } });
  audit(admin, 'post.delete', post.title);
  return NextResponse.json({ ok: true });
});
