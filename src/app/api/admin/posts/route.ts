import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler, jsonError } from '@/lib/api';
import { slugify, clampInt } from '@/lib/utils';
import { pingSearchEngines } from '@/lib/seoPing';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const page = clampInt(req.nextUrl.searchParams.get('page'), 1, 10_000, 1);
  const [posts, total] = await Promise.all([
    prisma.post.findMany({ orderBy: { id: 'desc' }, skip: (page - 1) * 20, take: 20 }),
    prisma.post.count(),
  ]);
  return NextResponse.json({ posts, total, page, pageSize: 20 });
});

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const title = String(b.title || '').trim().slice(0, 200);
  if (!title) return jsonError(400, 'Title is required');
  const slug = slugify(String(b.slug || title));
  if (await prisma.post.findUnique({ where: { slug } })) {
    return jsonError(409, 'A post with this slug already exists');
  }
  const isPublished = !!b.isPublished;
  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt: b.excerpt ? String(b.excerpt).slice(0, 500) : null,
      content: String(b.content || ''),
      coverImage: b.coverImage ? String(b.coverImage) : null,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  });
  audit(admin, 'post.create', post.title);
  if (post.isPublished) pingSearchEngines(`/news/${post.slug}`).catch(() => {});
  return NextResponse.json({ ok: true, post });
});
