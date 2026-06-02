// ═══════════════════════════════════════════════════════════════
//  BLOG — STOREFRONT
// ═══════════════════════════════════════════════════════════════

async function renderBlogList(view) {
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const params = new URLSearchParams(location.search || '');
  const page = parseInt(params.get('page') || '1');
  const catSlug = params.get('category') || '';

  try {
    const [catData, postData] = await Promise.all([
      apiFetch('/blog/categories').catch(() => []),
      apiFetch(`/blog/posts?category=${catSlug}&page=${page}&limit=12`)
    ]);
    const categories = Array.isArray(catData) ? catData : [];
    const { items, total, pages } = postData;

    view.innerHTML = '';
    
    const heroHead = el('div', 'products-hero', `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Blog</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-newspaper"></i> Góc chia sẻ</h1>
      <p class="products-hero-desc">Cập nhật tin tức, hướng dẫn và mẹo hay mỗi ngày</p>
    `);
    view.appendChild(heroHead);

    // Category filter chips
    if (categories.length) {
      const chips = el('div', 'blog-cat-chips mb-16');
      const allChip = el('button', `blog-cat-chip${!catSlug ? ' active' : ''}`);
      allChip.textContent = 'Tất cả';
      allChip.onclick = () => { navigateTo('/blog'); };
      chips.appendChild(allChip);
      categories.forEach(c => {
        const chip = el('button', `blog-cat-chip${catSlug === c.slug ? ' active' : ''}`);
        chip.textContent = `${c.name} (${c.post_count || 0})`;
        chip.onclick = () => { navigateTo(`/blog?category=${c.slug}`); };
        chips.appendChild(chip);
      });
      view.appendChild(chips);
    }

    view.appendChild(el('div', '', cuiPageHeader('Blog', `${total} bài viết`)));

    if (!items.length) {
      view.appendChild(el('div', 'empty-state', '<div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div><h3>Chưa có bài viết nào</h3>'));
      return;
    }

    const grid = el('div', 'blog-grid');
    items.forEach(post => {
      const card = el('div', 'blog-card');
      card.innerHTML = `
        ${withImageFallback(post.thumbnail_url) ? `<div class="blog-card-img"><img src="${withImageFallback(post.thumbnail_url)}" alt="${post.title}" loading="lazy" decoding="async" onerror="${onImgFallback()}" /></div>` : '<div class="blog-card-img blog-card-img-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>'}
        <div class="blog-card-body">
          ${post.category_name ? `<span class="badge badge-blue mb-4">${post.category_name}</span>` : ''}
          <div class="blog-card-title">${post.title}</div>
          ${post.excerpt ? `<div class="blog-card-excerpt">${post.excerpt}</div>` : ''}
          <div class="blog-card-meta">
            <span>${fmtDate(post.published_at || post.created_at)}</span>
            ${post.view_count != null ? `<span>· ${post.view_count} lượt xem</span>` : ''}
          </div>
        </div>
      `;
      card.onclick = () => { navigateTo(`/blog/${post.slug}`); };
      grid.appendChild(card);
    });
    view.appendChild(grid);

    // Pagination
    if (pages > 1) {
      const pag = el('div', 'pagination mt-24');
      for (let i = 1; i <= pages; i++) {
        const btn = el('button', `pagination-btn${i === page ? ' active' : ''}`);
        btn.textContent = i;
        btn.onclick = () => { navigateTo(`/blog?category=${catSlug}&page=${i}`); };
        pag.appendChild(btn);
      }
      view.appendChild(pag);
    }
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>${e.message}</h3></div>`;
  }
}

async function renderBlogPost(view, { slug }) {
  // window.location.href = `/blog/${slug}`;
  // return;
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const post = await apiFetch(`/blog/posts/${slug}`);
    view.innerHTML = '';
    view.appendChild(el('div', 'breadcrumb mb-16', `<a href="/">Trang chủ</a> <span>›</span> <a href="/blog">Blog</a> <span>›</span> <strong>${post.title}</strong>`));

    const article = el('div', 'blog-article');
    article.innerHTML = `
      <div class="blog-article-header">
        ${post.category_name ? `<span class="badge badge-blue mb-8">${post.category_name}</span>` : ''}
        <h1 class="blog-article-title">${post.title}</h1>
        <div class="blog-article-meta">
          <span>${fmtDate(post.published_at || post.created_at)}</span>
          ${post.view_count != null ? `<span>· ${post.view_count} lượt xem</span>` : ''}
        </div>
      </div>
      ${withImageFallback(post.thumbnail_url) ? `<div class="blog-article-thumbnail"><img src="${withImageFallback(post.thumbnail_url)}" alt="${post.title}" loading="lazy" decoding="async" onerror="${onImgFallback()}" /></div>` : ''}
      <div class="blog-article-content">${post.content || ''}</div>
    `;
    view.appendChild(article);
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>${e.message}</h3></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  BLOG — ADMIN
// ═══════════════════════════════════════════════════════════════

async function renderAdminBlog(view) {
  if (!view) return; const content = view; 
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  let activeTab = 'posts'; // 'posts' or 'categories'
  let editingPost = null;  // null or post id for full-page form

  const render = async () => {
    if (editingPost !== null) {
      await renderPostForm();
      return;
    }
    content.innerHTML = `
      ${cuiPageHeader('Blog', 'Biên tập bài viết và danh mục nội dung')}
      <div class="settings-tabs" role="tablist">
        <button class="settings-tab${activeTab === 'posts' ? ' active' : ''}" data-tab="posts" role="tab" aria-selected="${activeTab === 'posts'}">Bài viết</button>
        <button class="settings-tab${activeTab === 'categories' ? ' active' : ''}" data-tab="categories" role="tab" aria-selected="${activeTab === 'categories'}">Danh mục</button>
      </div>
      <div id="admin-blog-content"></div>
    `;
    qsa('.settings-tab', content).forEach(btn => {
      btn.onclick = () => { activeTab = btn.dataset.tab; render(); };
    });
    if (activeTab === 'posts') await renderPostsTab();
    else await renderCategoriesTab();
  };

  // ── Posts Tab ──
  const renderPostsTab = async () => {
    const wrap = qs('#admin-blog-content', content);
    wrap.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    const selectedIds = new Set();
    const updateBulkBar = () => {
      const count = selectedIds.size;
      qsa('[data-bulk-count]', wrap).forEach(el => { el.textContent = count; });
      qsa('[data-bulk-delete-posts]', wrap).forEach(btn => { btn.disabled = count === 0; });
      const boxes = qsa('[data-row-select-post]', wrap);
      const all = qs('[data-select-all-posts]', wrap);
      if (all) all.checked = boxes.length > 0 && boxes.every(cb => cb.checked);
    };
    try {
      const data = await apiFetch('/blog/admin/posts?page=1&limit=50');
      wrap.innerHTML = `
        <div class="d-flex align-center gap-8 mb-16" style="justify-content:space-between">
          <div class="text-muted text-sm">${data.total} bài viết · đã chọn <strong data-bulk-count>0</strong></div>
          <div class="d-flex gap-8"><button class="btn btn-sm btn-outline-danger" data-bulk-delete-posts disabled><i class="fa-solid fa-trash-can"></i> Xóa đã chọn</button><button class="btn btn-primary btn-sm" id="blog-add-post">+ Thêm bài viết</button></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th style="width:42px"><input type="checkbox" data-select-all-posts></th><th>Tiêu đề</th><th>Danh mục</th><th>Trạng thái</th><th>Lượt xem</th><th>Ngày</th><th></th></tr></thead>
          <tbody>${data.items.length ? data.items.map(p => `<tr>
            <td><input type="checkbox" data-row-select-post value="${p.id}"></td>
            <td class="td-bold">${esc(p.title)}</td>
            <td>${esc(p.category_name || '—')}</td>
            <td>${p.is_published ? '<span class="badge badge-green">Published</span>' : '<span class="badge badge-yellow">Draft</span>'}</td>
            <td>${p.view_count || 0}</td>
            <td class="text-sm text-muted">${fmtDate(p.created_at)}</td>
            <td><div class="table-actions">
              <button class="action-btn action-btn-edit" data-edit-post="${p.id}">Sửa</button>
              <button class="action-btn action-btn-delete" data-del-post="${p.id}">Xóa</button>
            </div></td>
          </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Chưa có bài viết nào</td></tr>'}</tbody>
        </table></div></div>
      `;
      wrap.onchange = (e) => {
        const all = e.target.closest('[data-select-all-posts]');
        if (all) {
          qsa('[data-row-select-post]', wrap).forEach(cb => { cb.checked = all.checked; if (all.checked) selectedIds.add(+cb.value); else selectedIds.delete(+cb.value); });
          updateBulkBar();
          return;
        }
        const cb = e.target.closest('[data-row-select-post]');
        if (cb) { if (cb.checked) selectedIds.add(+cb.value); else selectedIds.delete(+cb.value); updateBulkBar(); }
      };
      wrap.onclick = async (e) => {
        const bulkBtn = e.target.closest('[data-bulk-delete-posts]');
        if (bulkBtn) {
          const ids = [...selectedIds];
          if (!ids.length || !confirm(`Xóa ${ids.length} bài viết đã chọn?`)) return;
          try { const res = await apiFetch('/blog/admin/posts/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); toast(`Đã xóa ${res.deleted || 0} bài viết`, 'success'); await renderPostsTab(); }
          catch (e) { toast(e.message, 'error'); }
          return;
        }
        const addBtn = e.target.closest('#blog-add-post');
        if (addBtn) {
          editingPost = 'new';
          render();
          return;
        }

        const editBtn = e.target.closest('[data-edit-post]');
        if (editBtn) {
          editingPost = +editBtn.dataset.editPost;
          render();
          return;
        }

        const delBtn = e.target.closest('[data-del-post]');
        if (delBtn) {
          if (!confirm('Xóa bài viết này?')) return;
          try {
            await apiFetch(`/blog/admin/posts/${delBtn.dataset.delPost}`, { method: 'DELETE' });
            toast('Đã xóa', 'success');
            await renderPostsTab();
          }
          catch (e) { toast(e.message, 'error'); }
        }
      };
    } catch (e) { wrap.innerHTML = `<p class="text-muted">${e.message}</p>`; }
  };

  // ── Categories Tab ──
  const renderCategoriesTab = async () => {
    const wrap = qs('#admin-blog-content', content);
    wrap.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    const selectedIds = new Set();
    const updateBulkBar = () => {
      const count = selectedIds.size;
      qsa('[data-bulk-count]', wrap).forEach(el => { el.textContent = count; });
      qsa('[data-bulk-delete-cats]', wrap).forEach(btn => { btn.disabled = count === 0; });
      const boxes = qsa('[data-row-select-cat]', wrap);
      const all = qs('[data-select-all-cats]', wrap);
      if (all) all.checked = boxes.length > 0 && boxes.every(cb => cb.checked);
    };
    try {
      const cats = await apiFetch('/blog/admin/categories');
      wrap.innerHTML = `
        <div class="d-flex align-center gap-8 mb-16" style="justify-content:space-between">
          <div class="text-muted text-sm">${cats.length} danh mục · đã chọn <strong data-bulk-count>0</strong></div>
          <div class="d-flex gap-8"><button class="btn btn-sm btn-outline-danger" data-bulk-delete-cats disabled><i class="fa-solid fa-trash-can"></i> Xóa đã chọn</button><button class="btn btn-primary btn-sm" id="blog-add-cat">+ Thêm danh mục</button></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th style="width:42px"><input type="checkbox" data-select-all-cats></th><th>Tên</th><th>Slug</th><th>Mô tả</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>${cats.length ? cats.map(c => `<tr>
            <td><input type="checkbox" data-row-select-cat value="${c.id}"></td>
            <td class="td-bold">${esc(c.name)}</td>
            <td class="text-sm font-mono">${esc(c.slug || '—')}</td>
            <td class="text-sm text-muted">${esc(c.description || '—')}</td>
            <td>${c.sort_order || 0}</td>
            <td>${c.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Off</span>'}</td>
            <td><div class="table-actions">
              <button class="action-btn action-btn-edit" data-edit-cat="${c.id}">Sửa</button>
              <button class="action-btn action-btn-delete" data-del-cat="${c.id}">Xóa</button>
            </div></td>
          </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Chưa có danh mục nào</td></tr>'}</tbody>
        </table></div></div>
      `;
      wrap.onchange = (e) => {
        const all = e.target.closest('[data-select-all-cats]');
        if (all) {
          qsa('[data-row-select-cat]', wrap).forEach(cb => { cb.checked = all.checked; if (all.checked) selectedIds.add(+cb.value); else selectedIds.delete(+cb.value); });
          updateBulkBar();
          return;
        }
        const cb = e.target.closest('[data-row-select-cat]');
        if (cb) { if (cb.checked) selectedIds.add(+cb.value); else selectedIds.delete(+cb.value); updateBulkBar(); }
      };
      wrap.onclick = async (e) => {
        const bulkBtn = e.target.closest('[data-bulk-delete-cats]');
        if (bulkBtn) {
          const ids = [...selectedIds];
          if (!ids.length || !confirm(`Xóa ${ids.length} danh mục đã chọn? Bài viết trong danh mục sẽ được gỡ danh mục.`)) return;
          try { const res = await apiFetch('/blog/admin/categories/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); toast(`Đã xóa ${res.deleted || 0} danh mục`, 'success'); await renderCategoriesTab(); }
          catch (e) { toast(e.message, 'error'); }
          return;
        }
        const addBtn = e.target.closest('#blog-add-cat');
        if (addBtn) {
          showBlogCatModal(null, renderCategoriesTab);
          return;
        }

        const editBtn = e.target.closest('[data-edit-cat]');
        if (editBtn) {
          const c = cats.find(x => x.id === +editBtn.dataset.editCat);
          if (c) showBlogCatModal(c, renderCategoriesTab);
          return;
        }

        const delBtn = e.target.closest('[data-del-cat]');
        if (delBtn) {
          if (!confirm('Xóa danh mục này?')) return;
          try {
            await apiFetch(`/blog/admin/categories/${delBtn.dataset.delCat}`, { method: 'DELETE' });
            toast('Đã xóa', 'success');
            await renderCategoriesTab();
          }
          catch (e) { toast(e.message, 'error'); }
        }
      };
    } catch (e) { wrap.innerHTML = `<p class="text-muted">${e.message}</p>`; }
  };

  // ── Post Form (full-page) ──
  const renderPostForm = async () => {
    let post = null;
    let cats = [];
    try { cats = await apiFetch('/blog/admin/categories'); } catch (_) {}
    if (editingPost !== 'new') {
      try { post = await apiFetch(`/blog/admin/posts/${editingPost}`); } catch (e) { toast(e.message, 'error'); editingPost = null; render(); return; }
    }

    const slugVal = post?.slug || '';
    const titleVal = post?.title || '';
    const excerptVal = post?.excerpt || '';
    const contentVal = post?.content || '';
    const thumbVal = post?.thumbnail_url || '';
    const metaTitleVal = post?.meta_title || '';
    const metaDescVal = post?.meta_description || '';
    const catIdVal = post?.category_id || '';
    const isPubVal = post?.is_published ? true : false;

    content.innerHTML = `
      ${cuiPageHeader(post ? 'Sửa bài viết' : 'Thêm bài viết', '', `<button class="btn btn-ghost btn-sm" id="blog-back">${ico.arrowLeft} Quay lại</button>`)}
      <div class="blog-post-form">
        <div class="form-group">
          <label class="form-label">Tiêu đề <span class="req">*</span></label>
          <input type="text" class="form-input" id="bp-title" value="${titleVal}" placeholder="Nhập tiêu đề bài viết" />
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Slug</label>
            <input type="text" class="form-input" id="bp-slug" value="${slugVal}" placeholder="Tự động từ tiêu đề" />
          </div>
          <div class="form-group">
            <label class="form-label">Danh mục</label>
            <select class="form-select" id="bp-category">
              <option value="">— Chọn danh mục —</option>
              ${cats.map(c => `<option value="${c.id}" ${+catIdVal === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tóm tắt</label>
          <div class="editor-toolbar" id="bp-excerpt-toolbar">
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i></button>
          </div>
          <textarea class="form-textarea" id="bp-excerpt" rows="3" placeholder="Tóm tắt ngắn gọn">${excerptVal}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Nội dung (HTML)</label>
          <div class="editor-toolbar" id="bp-content-toolbar">
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="underline"><u>U</u></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="image"><i class="fa-regular fa-image"></i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ol"><i class="fa-solid fa-list-ol"></i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="h2">H2</button>
            <button type="button" class="btn btn-ghost btn-sm" data-editor-action="quote"><i class="fa-solid fa-quote-left"></i></button>
          </div>
          <textarea class="form-textarea" id="bp-content" rows="16" placeholder="Nội dung bài viết (hỗ trợ HTML)">${contentVal}</textarea>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Thumbnail</label>
            <div class="flex gap-8 items-center">
              <input type="text" class="form-input flex-1" id="bp-thumb" value="${thumbVal}" placeholder="https://... hoặc upload ảnh" />
              ${imageUploadControl('bp-thumb', 'bp-thumb-upload', 'Upload', 'bp-thumb-preview')}
            </div>
            <div class="admin-upload-preview" id="bp-thumb-preview">${thumbVal ? `<img src="${thumbVal}" alt="Thumbnail preview" />` : '<span>Chưa có thumbnail</span>'}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái</label>
            <div class="toggle-wrap">
              <label class="toggle-label">
                <input type="checkbox" id="bp-published" ${isPubVal ? 'checked' : ''} />
                <span class="toggle-switch"></span>
                <span class="toggle-text">${isPubVal ? 'Published' : 'Draft'}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Meta Title</label>
            <input type="text" class="form-input" id="bp-meta-title" value="${metaTitleVal}" placeholder="SEO title" />
          </div>
          <div class="form-group">
            <label class="form-label">Meta Description</label>
            <input type="text" class="form-input" id="bp-meta-desc" value="${metaDescVal}" placeholder="SEO description" />
          </div>
        </div>
        <div id="bp-form-err" class="form-error mb-12" style="display:none"></div>
        <div class="d-flex gap-8 mt-16">
          <button class="btn btn-primary" id="bp-save">${post ? 'Cập nhật' : 'Tạo bài viết'}</button>
          <button class="btn btn-ghost" id="bp-cancel">Hủy</button>
        </div>
      </div>
    `;

    // Auto-generate slug from title
    qs('#bp-title', content).oninput = (e) => {
      const slug = e.target.value.toLowerCase()
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      qs('#bp-slug', content).value = slug;
    };

    // Toggle published text
    qs('#bp-published', content).onchange = (e) => {
      qs('.toggle-text', content).textContent = e.target.checked ? 'Published' : 'Draft';
    };

    createRichTextEditor({ textareaId: 'bp-excerpt', toolbarId: 'bp-excerpt-toolbar', placeholder: 'Nhập tóm tắt bài viết...', minHeight: 180 });
    createRichTextEditor({ textareaId: 'bp-content', toolbarId: 'bp-content-toolbar', placeholder: 'Nhập nội dung bài viết...', minHeight: 520 });
    bindImageUploads(content);

    qs('#bp-cancel', content).onclick = () => { editingPost = null; render(); };
    if(qs('#bp-back', content)) qs('#bp-back', content).onclick = () => { editingPost = null; render(); };

    qs('#bp-save', content).onclick = async () => {
      if (window.syncRichTextEditors) window.syncRichTextEditors();
      const body = {
        title: qs('#bp-title', content).value.trim(),
        slug: qs('#bp-slug', content).value.trim() || undefined,
        category_id: qs('#bp-category', content).value ? +qs('#bp-category', content).value : null,
        excerpt: qs('#bp-excerpt', content).value.trim(),
        content: qs('#bp-content', content).value.trim(),
        thumbnail_url: qs('#bp-thumb', content).value.trim(),
        meta_title: qs('#bp-meta-title', content).value.trim(),
        meta_description: qs('#bp-meta-desc', content).value.trim(),
        is_published: qs('#bp-published', content).checked,
      };
      if (!body.title) { toast('Nhập tiêu đề', 'error'); return; }
      try {
        if (editingPost === 'new') {
          await apiFetch('/blog/admin/posts', { method: 'POST', body: JSON.stringify(body) });
          toast('Đã tạo bài viết', 'success');
        } else {
          await apiFetch(`/blog/admin/posts/${editingPost}`, { method: 'PUT', body: JSON.stringify(body) });
          toast('Đã cập nhật', 'success');
        }
        editingPost = null;
        render();
      } catch (e) {
        const err = qs('#bp-form-err', content);
        err.textContent = e.message;
        err.style.display = 'block';
      }
    };
    
    // Inject AI button for blog fields
    if (typeof initAiButtons === 'function') initAiButtons(content);
  };

  await render();
}

function showBlogCatModal(cat, onDone) {
  const isEdit = !!cat;
  openModal(`
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
    <form id="blog-cat-form">
      <div class="form-group"><label class="form-label">Tên <span class="req">*</span></label><input type="text" class="form-input" id="bc-name" value="${cat?.name || ''}" /></div>
      <div class="form-group"><label class="form-label">Slug</label><input type="text" class="form-input" id="bc-slug" value="${cat?.slug || ''}" placeholder="Tự động từ tên" /></div>
      <div class="form-group"><label class="form-label">Mô tả</label><textarea class="form-textarea" id="bc-desc" rows="2">${cat?.description || ''}</textarea></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Thứ tự</label><input type="number" class="form-input" id="bc-sort" value="${cat?.sort_order || 0}" /></div>
        <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-select" id="bc-active"><option value="true" ${cat?.is_active !== false ? 'selected' : ''}>Active</option><option value="false" ${cat?.is_active === false ? 'selected' : ''}>Off</option></select></div>
      </div>
      <div id="bc-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">${isEdit ? 'Cập nhật' : 'Tạo'}</button><button type="button" class="btn btn-ghost" id="bc-cancel">Hủy</button></div>
    </form>
  `);
  qs('#bc-cancel').onclick = closeModal;
  createRichTextEditor({ textarea: qs('#bc-desc'), placeholder: 'Nhập mô tả danh mục blog...', minHeight: 160 });
  // Auto slug from name
  qs('#bc-name').oninput = (e) => {
    const slug = e.target.value.toLowerCase().replace(/[đĐ]/g, 'd').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    qs('#bc-slug').value = slug;
  };
  qs('#blog-cat-form').onsubmit = async (e) => {
    e.preventDefault();
    if (window.syncRichTextEditors) window.syncRichTextEditors();
    const body = {
      name: qs('#bc-name').value.trim(),
      slug: qs('#bc-slug').value.trim() || undefined,
      description: qs('#bc-desc').value.trim(),
      sort_order: parseInt(qs('#bc-sort').value) || 0,
      is_active: qs('#bc-active').value === 'true',
    };
    if (!body.name) { toast('Nhập tên danh mục', 'error'); return; }
    try {
      if (isEdit) await apiFetch(`/blog/admin/categories/${cat.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiFetch('/blog/admin/categories', { method: 'POST', body: JSON.stringify(body) });
      closeModal(); toast(isEdit ? 'Đã cập nhật' : 'Đã tạo', 'success'); onDone();
    } catch (err) { const e = qs('#bc-form-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

