'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
};

const EMPTY = { id: 0, title: '', slug: '', excerpt: '', content: '', coverImage: '', isPublished: false };

export default function AdminPostsPage() {
  const { toast } = useStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => api<{ posts: Post[] }>('/api/admin/posts').then((d) => setPosts(d.posts));
  useEffect(() => { load().catch(() => {}); }, []);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        title: editing.title,
        slug: editing.slug || undefined,
        excerpt: editing.excerpt,
        content: editing.content,
        coverImage: editing.coverImage,
        isPublished: editing.isPublished,
      };
      if (editing.id) await api(`/api/admin/posts/${editing.id}`, { method: 'PATCH', json: payload });
      else await api('/api/admin/posts', { method: 'POST', json: payload });
      toast('Post saved');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (post: Post) => {
    if (!confirm(`Delete "${post.title}"?`)) return;
    await api(`/api/admin/posts/${post.id}`, { method: 'DELETE' });
    await load();
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setEditing((e) => (e ? { ...e, coverImage: data.url } : e));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  if (editing) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{editing.id ? 'Edit post' : 'New post'}</h1>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={busy || !editing.title.trim()}>
              {busy ? 'Saving…' : 'Save post'}
            </button>
          </div>
        </div>

        <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Slug (URL)</label>
            <input className="input" placeholder="auto from title" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Excerpt (shown in the news list)</label>
            <textarea className="input" rows={2} maxLength={500} value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Cover image</label>
            <div className="flex flex-wrap items-center gap-3">
              {editing.coverImage && (
                <span className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editing.coverImage} alt="cover" className="h-20 w-32 rounded-lg border border-gray-200 object-cover" />
                  <button
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gray-900 text-white"
                    onClick={() => setEditing({ ...editing, coverImage: '' })}
                    aria-label="Remove cover"
                  >
                    <Icon name="x" size={10} />
                  </button>
                </span>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600">
                <Icon name="upload" size={16} /> {uploading ? 'Uploading…' : editing.coverImage ? 'Replace image' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) uploadCover(e.target.files[0]); e.target.value = ''; }}
                />
              </label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Content (HTML allowed)</label>
            <textarea className="input font-mono text-xs" rows={14} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} />
            Published — visible on the storefront
          </label>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">News</h1>
          <p className="mt-0.5 text-sm text-gray-500">Announcements and articles shown at /news on the storefront.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>
          <Icon name="plus" size={16} /> New post
        </button>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImage} alt="" className="h-10 w-16 shrink-0 rounded-md border border-gray-200 object-cover" />
                    ) : (
                      <span className="grid h-10 w-16 shrink-0 place-items-center rounded-md bg-gray-100 text-gray-300">
                        <Icon name="news" size={18} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.title}</p>
                      <p className="truncate text-xs text-gray-400">/news/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {p.isPublished
                    ? <span className="badge bg-green-100 text-green-700">Published</span>
                    : <span className="badge bg-gray-100 text-gray-500">Draft</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => setEditing({
                      id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt || '',
                      content: p.content, coverImage: p.coverImage || '', isPublished: p.isPublished,
                    })}
                  >Edit</button>
                  <button className="ml-3 text-xs text-red-500 hover:underline" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  <Icon name="news" size={36} className="mx-auto text-gray-300" />
                  <p className="mt-2">No posts yet — write your first announcement.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
