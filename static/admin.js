// ═══════════════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════════════

// Admin shell has been removed, admin view uses the exact same layout as the main storefront.
// The sidebar has already been reconfigured for admin mode in app.js.
function renderAdminShell(wrap) {
  // no-op - layout is now handled globally
}

// CoreUI-style page header helper
function cuiPageHeader(title, subtitle, actionsHtml = '') {
  return `<div class="cui-page-header">
    <div class="cui-page-header-left">
      <div class="cui-page-title">${title}</div>
      ${subtitle ? `<div class="cui-page-subtitle">${subtitle}</div>` : ''}
    </div>
    ${actionsHtml ? `<div class="cui-page-actions">${actionsHtml}</div>` : ''}
  </div>`;
}

async function uploadAdminImage(file, { input = null, preview = null } = {}) {
  if (!file) return null;
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/banners/admin/upload-image', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  const imageUrl = data.url;
  if (input) {
    input.value = imageUrl;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (preview) renderAdminImagePreview(preview, imageUrl);
  return data;
}

function renderAdminImagePreview(preview, url, emptyText = 'Chưa có ảnh') {
  if (!preview) return;
  if (!url) {
    preview.innerHTML = `<span>${emptyText}</span>`;
    return;
  }
  preview.innerHTML = `<img src="${url}" alt="Preview" />`;
}

function imageUploadControl(inputId, uploadId, label = 'Upload', previewId = '') {
  return `<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" id="${uploadId}" data-image-target="${inputId}" ${previewId ? `data-image-preview="${previewId}"` : ''} style="display:none" /><button type="button" class="btn btn-ghost btn-sm admin-image-upload-btn" style="white-space:nowrap" onclick="document.getElementById('${uploadId}').click()"><i class="fa-solid fa-upload"></i> ${label}</button>`;
}

function bindImageUpload(uploadId, inputId, { previewId = null } = {}) {
  const upload = qs(`#${uploadId}`);
  const input = qs(`#${inputId}`);
  const preview = previewId ? qs(`#${previewId}`) : null;
  if (!upload || !input) return;
  upload.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAdminImage(file, { input, preview });
      toast('Upload thành công', 'success');
    } catch (err) {
      toast('Upload thất bại: ' + err.message, 'error');
    } finally {
      upload.value = '';
    }
  };
}

function bindImageUploads(root = document) {
  qsa('input[type="file"][data-image-target]', root).forEach(upload => {
    if (upload.dataset.boundUpload === '1') return;
    upload.dataset.boundUpload = '1';
    const targetId = upload.dataset.imageTarget;
    const previewId = upload.dataset.imagePreview || '';
    upload.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const input = document.getElementById(targetId);
      const preview = previewId ? document.getElementById(previewId) : null;
      if (!input) return;
      try {
        await uploadAdminImage(file, { input, preview });
        toast('Upload thành công', 'success');
      } catch (err) {
        toast('Upload thất bại: ' + err.message, 'error');
      } finally {
        upload.value = '';
      }
    };
  });
}

const IMAGE_GROUP_LABELS = {
  all: 'Tất cả',
  banner: 'Banner',
  category: 'Danh mục',
  product: 'Sản phẩm',
  package: 'Gói bán',
  settings: 'Cài đặt',
  blog: 'Blog',
  user: 'Avatar user',
  unused: 'Chưa dùng',
};

function formatBytes(bytes = 0) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function renderImageLibraryGrid(items, activeGroup = 'all') {
  const filtered = activeGroup === 'all' ? items : items.filter(img => (img.groups || []).some(g => {
    const base = g.startsWith('settings:') ? 'settings' : g;
    return base === activeGroup;
  }));
  if (!filtered.length) {
    return `<div class="empty-state"><i class="fa-regular fa-images"></i><p>Chưa có ảnh trong mục này</p></div>`;
  }
  return `<table class="admin-image-table">
    <thead><tr>
      <th>Ảnh</th>
      <th>Tên file</th>
      <th class="info-cell">Thông tin</th>
      <th>Dùng ở</th>
      <th class="action-cell"></th>
    </tr></thead>
    <tbody>
    ${filtered.map(img => {
      const groups = img.groups || ['unused'];
      const canDelete = groups.length === 1 && groups[0] === 'unused';
      return `<tr data-image-id="${img.id}">
        <td class="img-cell"><img src="${esc(img.url)}" alt="" loading="lazy" /></td>
        <td class="name-cell">
          <div class="img-filename" title="${esc(img.filename || '')}">${esc(img.filename || `image-${img.id}`)}</div>
          <div class="img-id">#${img.id}</div>
        </td>
        <td class="info-cell">${formatBytes(img.size)} · ${(img.mime_type || '').replace('image/', '').toUpperCase()}</td>
        <td class="tag-cell">${groups.map(g => {
          const isSettings = g.startsWith('settings:');
          const label = isSettings ? g.split(':')[1] : (IMAGE_GROUP_LABELS[g] || g);
          const cls = g === 'unused' ? 'warning' : 'info';
          return `<span class="status-badge ${cls}">${esc(label)}</span>`;
        }).join('')}</td>
        <td class="action-cell">
          <button class="btn btn-ghost btn-sm icon-only" data-copy-image="${esc(img.url)}" title="Copy URL"><i class="fa-regular fa-copy"></i></button>
          <button class="btn btn-danger btn-sm icon-only" data-delete-image="${img.id}" ${canDelete ? '' : 'disabled title="Ảnh đang được sử dụng"'} title="Xoá"><i class="fa-regular fa-trash-can"></i></button>
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

async function renderAdminImages(view) {
  if (!view) return;
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await apiFetch('/banners/admin/images');
    const images = data.items || [];
    let activeGroup = 'all';
    const groups = ['all', 'banner', 'category', 'product', 'package', 'settings', 'blog', 'user', 'unused'];
    const counts = Object.fromEntries(groups.map(g => [g, 0]));
    counts.all = images.length;
    images.forEach(img => (img.groups || ['unused']).forEach(g => {
      const base = g.startsWith('settings:') ? 'settings' : g;
      if (counts[base] !== undefined) counts[base] += 1;
    }));
    const render = () => {
      view.innerHTML = `
        ${cuiPageHeader('Thư viện ảnh', 'Quản lý ảnh đã upload, phân theo nơi đang sử dụng')}
        <div class="admin-tabs image-library-tabs">
          ${groups.filter(g => counts[g] > 0 || g === 'all').map(g => `<button class="admin-tab ${activeGroup === g ? 'active' : ''}" data-image-group="${g}">${IMAGE_GROUP_LABELS[g]}<span class="tab-count">${counts[g] || 0}</span></button>`).join('')}
        </div>
        <div class="settings-card">
          <div class="image-library-toolbar">
            <div><strong>${images.length}</strong> ảnh đã upload</div>
            <div class="muted">Chỉ xoá được ảnh chưa dùng để tránh vỡ giao diện.</div>
          </div>
          <div id="image-library-grid">${renderImageLibraryGrid(images, activeGroup)}</div>
        </div>`;
      qsa('[data-image-group]', view).forEach(btn => btn.onclick = () => { activeGroup = btn.dataset.imageGroup; render(); });
      qsa('[data-copy-image]', view).forEach(btn => btn.onclick = async () => {
        await navigator.clipboard.writeText(btn.dataset.copyImage);
        toast('Đã copy URL ảnh', 'success');
      });
      qsa('[data-delete-image]', view).forEach(btn => btn.onclick = async () => {
        if (!confirm('Xoá ảnh này? Chỉ ảnh chưa dùng mới xoá được.')) return;
        try {
          await apiFetch(`/banners/admin/images/${btn.dataset.deleteImage}`, { method: 'DELETE' });
          toast('Đã xoá ảnh', 'success');
          renderAdminImages(view);
        } catch (err) {
          toast(err.message || 'Không xoá được ảnh', 'error');
        }
      });
    };
    render();
  } catch (err) {
    view.innerHTML = `<div class="alert alert-error">${esc(err.message || 'Không tải được thư viện ảnh')}</div>`;
  }
}

// ADMIN DASHBOARD
async function renderAdmin(view) {
  if (!view) return;
  const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await apiFetch('/admin/dashboard');
    const s = data.stats;
    content.innerHTML = `
      ${cuiPageHeader('Dashboard', 'Tổng quan vận hành cửa hàng')}
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon purple"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div><div class="stat-info"><div class="stat-label">Tổng đơn</div><div class="stat-value">${s.total_orders}</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><div class="stat-label">Chờ xử lý</div><div class="stat-value">${s.pending_orders}</div></div></div>
        <div class="stat-card"><div class="stat-icon green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><div class="stat-label">Hoàn thành</div><div class="stat-value">${s.completed_orders}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><div class="stat-info"><div class="stat-label">Sản phẩm</div><div class="stat-value">${s.total_products}</div></div></div>
        <div class="stat-card"><div class="stat-icon cyan"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div><div class="stat-info"><div class="stat-label">Kho hàng</div><div class="stat-value">${s.total_stock_available}</div></div></div>
        <div class="stat-card"><div class="stat-icon purple"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="stat-info"><div class="stat-label">Doanh thu</div><div class="stat-value">${fmt(s.total_revenue)}</div></div></div>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">Đơn hàng gần đây</div></div>
      <div class="table-wrap">
        <table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead>
        <tbody>${data.recent_orders.map(o => `<tr><td class="td-mono">${o.order_code}</td><td>${o.user_email || '—'}</td><td>${o.product_name || '—'}</td><td class="text-primary">${fmt(o.total_amount)}</td><td>${statusBadge(o.status)}${o.api_provider_name ? ` <span class="badge badge-purple" style="font-size:10px">API: ${esc(o.api_provider_name)}</span>` : ''}</td><td class="text-sm text-muted">${fmtDate(o.created_at)}</td></tr>`).join('')}</tbody>
        </table></div></div>
    `;
  } catch (e) { content.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

// ADMIN CATEGORIES
async function renderAdminCategories(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  
  let catMap = {};
  let activeTab = 'premium'; // premium | game
  const selectedIds = new Set();
  const updateBulkBar = () => {
    const count = selectedIds.size;
    qsa('[data-bulk-count]', content).forEach(el => { el.textContent = count; });
    qsa('[data-bulk-delete]', content).forEach(btn => { btn.disabled = count === 0; });
    const allBoxes = qsa('[data-row-select]', content);
    const all = qs('[data-select-all]', content);
    if (all) all.checked = allBoxes.length > 0 && allBoxes.every(cb => cb.checked);
  };
  
  // Event delegation — bound once
  content.onclick = async (e) => {
    const tabBtn = e.target.closest('[data-cat-tab]');
    if (tabBtn) {
      activeTab = tabBtn.dataset.catTab;
      selectedIds.clear();
      await refresh();
      return;
    }
    const bulkBtn = e.target.closest('[data-bulk-delete]');
    if (bulkBtn) {
      const ids = [...selectedIds];
      if (!ids.length) return;
      if (!confirm(`Xóa ${ids.length} danh mục đã chọn? Các sản phẩm trong danh mục sẽ bị gỡ khỏi danh mục.`)) return;
      try {
        const res = await apiFetch('/categories/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
        selectedIds.clear();
        toast(`Đã xóa ${res.deleted || 0} danh mục`, 'success');
        await refresh();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      e.preventDefault();
      const row = delBtn.closest('tr');
      const catName = row?.querySelector('.td-bold')?.textContent?.trim() || 'danh mục này';
      if (!confirm(`Xóa ${catName}? Các sản phẩm đang thuộc danh mục này sẽ bị gỡ khỏi danh mục.`)) return;
      try {
        await apiFetch(`/categories/${delBtn.dataset.del}`, { method: 'DELETE' });
        selectedIds.delete(parseInt(delBtn.dataset.del));
        toast('Đã xóa danh mục', 'success');
        await refresh();
      }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { showCatModal(catMap[parseInt(editBtn.dataset.edit)], refresh, Object.values(catMap)); return; }
    const addBtn = e.target.closest('#btn-add-cat');
    if (addBtn) { showCatModal(null, refresh, Object.values(catMap), activeTab); return; }
  };
  content.onchange = (e) => {
    const all = e.target.closest('[data-select-all]');
    if (all) {
      qsa('[data-row-select]', content).forEach(cb => {
        cb.checked = all.checked;
        if (all.checked) selectedIds.add(parseInt(cb.value)); else selectedIds.delete(parseInt(cb.value));
      });
      updateBulkBar();
      return;
    }
    const cb = e.target.closest('[data-row-select]');
    if (cb) {
      if (cb.checked) selectedIds.add(parseInt(cb.value)); else selectedIds.delete(parseInt(cb.value));
      updateBulkBar();
    }
  };

  const refresh = async () => {
    const [cats, tree] = await Promise.all([apiFetch('/categories/all'), apiFetch('/categories/')]);
    catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });
    const validIds = new Set(cats.map(c => c.id));
    [...selectedIds].forEach(id => { if (!validIds.has(id)) selectedIds.delete(id); });

    const filterTree = (items, type) => items.filter(c => (c.product_type || 'premium') === type).map(c => ({
      ...c,
      children: c.children ? c.children.filter(ch => (ch.product_type || 'premium') === type) : []
    }));
    const filtered = filterTree(tree, activeTab);

    const renderRows = (items, depth = 0) => items.map(c => {
      const indent = depth > 0 ? `padding-left:${depth * 24}px;` : '';
      const prefix = depth > 0 ? '<span style="color:var(--text-muted);margin-right:6px;">↳</span>' : '';
      const iconImg = c.icon_url ? `<img src="${c.icon_url}" style="width:18px;height:18px;border-radius:4px;vertical-align:middle;margin-right:6px;object-fit:cover;" alt="" />` : '';
      let row = `<tr><td style="width:42px"><input type="checkbox" data-row-select value="${c.id}" ${selectedIds.has(c.id) ? 'checked' : ''}></td><td class="text-muted">#${c.id}</td><td class="td-bold" style="${indent}">${prefix}${iconImg}${esc(c.name)}</td><td class="td-mono">${esc(c.slug)}</td><td>${c.is_active ? '<span class="badge badge-green">Hiện</span>' : '<span class="badge badge-gray">Ẩn</span>'}</td><td>${c.sort_order}</td><td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit="${c.id}">Sửa</button><button class="tbl-btn tbl-delete" data-del="${c.id}">Xóa</button></div></td></tr>`;
      if (c.children?.length) row += renderRows(c.children, depth + 1);
      return row;
    }).join('');
    content.innerHTML = `
      ${cuiPageHeader('Danh mục', 'Tổ chức nhóm sản phẩm và điều hướng', '<button class="btn btn-primary" id="btn-add-cat"><i class="fa-solid fa-plus"></i> Thêm danh mục</button>')}
      <div class="admin-tabs mb-16">
        <button class="admin-tab ${activeTab === 'premium' ? 'active' : ''}" data-cat-tab="premium"><i class="fa-solid fa-crown"></i> Premium</button>
        <button class="admin-tab ${activeTab === 'game' ? 'active' : ''}" data-cat-tab="game"><i class="fa-solid fa-gamepad"></i> Topup Game</button>
        <button class="admin-tab ${activeTab === 'giftcard' ? 'active' : ''}" data-cat-tab="giftcard"><i class="fa-solid fa-gift"></i> Gift Card</button>
      </div>
      <div class="d-flex align-center gap-8 mb-12" style="justify-content:space-between">
        <div class="text-muted text-sm">Đã chọn <strong data-bulk-count>${selectedIds.size}</strong> danh mục</div>
        <button class="btn btn-sm btn-outline-danger" data-bulk-delete ${selectedIds.size ? '' : 'disabled'}><i class="fa-solid fa-trash-can"></i> Xóa đã chọn</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th style="width:42px"><input type="checkbox" data-select-all></th><th>ID</th><th>Tên</th><th>Slug</th><th>Trạng thái</th><th>Thứ tự</th><th></th></tr></thead>
        <tbody>${filtered.length ? renderRows(filtered) : '<tr><td colspan="7" class="text-center text-muted" style="padding:32px 0">Chưa có danh mục nào</td></tr>'}</tbody>
      </table></div>
    `;
    updateBulkBar();
  };
  await refresh();
}

function showCatModal(cat, refresh, allCats = [], defaultType = 'premium') {
  const excludeId = cat?.id;
  const productType = cat?.product_type || defaultType;
  const topLevelCats = allCats.filter(c => !c.parent_id && c.id !== excludeId && (c.product_type || 'premium') === productType);
  const parentOptions = topLevelCats
    .map(c => `<option value="${c.id}" ${cat?.parent_id === c.id ? 'selected' : ''}>${c.name}</option>`)
    .join('');

  openModal(`
    <form id="cat-form">
      <div class="form-group"><label class="form-label">Tên<span class="req">*</span></label><input class="form-input" id="cf-name" value="${cat?.name || ''}" required /></div>
      <div class="form-group"><label class="form-label">Slug</label><input class="form-input" id="cf-slug" value="${cat?.slug || ''}" placeholder="tự động" /></div>
      <div class="form-group"><label class="form-label">Danh mục cha</label><select class="form-select" id="cf-parent"><option value="">Không có (danh mục gốc)</option>${parentOptions}</select></div>
      <div class="form-group">
        <label class="form-label">URL icon</label>
        <div class="flex gap-8 items-center">
          <input class="form-input flex-1" id="cf-icon" value="${cat?.icon_url || ''}" placeholder="https://..." />
          ${imageUploadControl('cf-icon', 'cf-icon-upload', 'Upload', 'cf-icon-preview')}
        </div>
        <div class="admin-upload-preview admin-upload-preview-sm" id="cf-icon-preview">${cat?.icon_url ? `<img src="${cat.icon_url}" alt="Icon preview" />` : '<span>Chưa có icon</span>'}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Hình ảnh (URL)</label>
        <div class="flex gap-8 items-center">
          <input class="form-input flex-1" id="cf-image" value="${cat?.image_url || ''}" placeholder="https://..." />
          ${imageUploadControl('cf-image', 'cf-image-upload', 'Upload', 'cf-image-preview')}
        </div>
        <div class="admin-upload-preview" id="cf-image-preview">${cat?.image_url ? `<img src="${cat.image_url}" alt="Image preview" />` : '<span>Chưa có ảnh</span>'}</div>
      </div>
      <div class="form-group"><label class="form-label">Loại sản phẩm</label><select class="form-select" id="cf-product-type"><option value="premium" ${productType === 'premium' ? 'selected' : ''}>Premium</option><option value="game" ${productType === 'game' ? 'selected' : ''}>Game / Topup</option><option value="giftcard" ${productType === 'giftcard' ? 'selected' : ''}>Gift Card</option></select></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Thứ tự</label><input type="number" class="form-input" id="cf-order" value="${cat?.sort_order ?? 0}" /></div>
        <div class="form-group"><label class="form-label">Hiển thị</label><select class="form-select" id="cf-active"><option value="true" ${cat?.is_active !== false ? 'selected' : ''}>Hiện</option><option value="false" ${cat?.is_active === false ? 'selected' : ''}>Ẩn</option></select></div>
      </div>
      <div id="cat-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">${cat ? 'Cập nhật' : 'Tạo mới'}</button><button type="button" class="btn btn-ghost" id="cat-cancel">Hủy</button></div>
    </form>
  `, cat ? `Sửa: ${cat.name}` : 'Thêm danh mục');
  qs('#cat-cancel').onclick = closeModal;

  bindImageUploads(qs('#modal-content'));

  qs('#cat-form').onsubmit = async (e) => {
    e.preventDefault();
    const parentId = qs('#cf-parent').value;
    const body = { name: qs('#cf-name').value, slug: qs('#cf-slug').value || undefined, icon_url: qs('#cf-icon').value || undefined, image_url: qs('#cf-image').value || undefined, parent_id: parentId ? parseInt(parentId) : null, product_type: qs('#cf-product-type').value, sort_order: parseInt(qs('#cf-order').value) || 0, is_active: qs('#cf-active').value === 'true' };
    try { if (cat) await apiFetch(`/categories/${cat.id}`, { method: 'PUT', body: JSON.stringify(body) }); else await apiFetch('/categories/', { method: 'POST', body: JSON.stringify(body) }); closeModal(); toast(cat ? 'Cập nhật!' : 'Tạo mới!', 'success'); refresh(); }
    catch (err) { const e = qs('#cat-form-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

// ADMIN PRODUCTS
async function renderAdminProducts(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  
  let currentProducts = [], currentCats = [];
  let activeTab = 'premium'; // premium | game
  const selectedIds = new Set();
  const updateBulkBar = () => {
    const count = selectedIds.size;
    qsa('[data-bulk-count]', content).forEach(el => { el.textContent = count; });
    qsa('[data-bulk-delete]', content).forEach(btn => { btn.disabled = count === 0; });
    const allBoxes = qsa('[data-row-select]', content);
    const all = qs('[data-select-all]', content);
    if (all) all.checked = allBoxes.length > 0 && allBoxes.every(cb => cb.checked);
  };
  
  // Event delegation — bound once, survives innerHTML refreshes
  content.onclick = async (e) => {
    const tabBtn = e.target.closest('[data-prod-tab]');
    if (tabBtn) {
      activeTab = tabBtn.dataset.prodTab;
      selectedIds.clear();
      await refresh();
      return;
    }
    const bulkBtn = e.target.closest('[data-bulk-delete]');
    if (bulkBtn) {
      const ids = [...selectedIds];
      if (!ids.length) return;
      if (!confirm(`Xóa ${ids.length} sản phẩm đã chọn? Sản phẩm có đơn hàng sẽ được ẩn/lưu trữ thay vì xóa hẳn.`)) return;
      try {
        const res = await apiFetch('/products/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
        selectedIds.clear();
        toast(`Đã xóa ${res.deleted || 0}, lưu trữ ${res.archived || 0} sản phẩm`, 'success');
        await refresh();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      e.preventDefault();
      const row = delBtn.closest('tr');
      const productName = row?.querySelector('.td-bold')?.textContent?.trim() || 'sản phẩm này';
      if (!confirm(`Xóa ${productName}? Nếu sản phẩm đã có đơn, hệ thống sẽ tự ẩn thay vì xóa hẳn dữ liệu.`)) return;
      try {
        await apiFetch(`/products/${delBtn.dataset.del}`, { method: 'DELETE' });
        selectedIds.delete(parseInt(delBtn.dataset.del));
        toast('Đã xử lý xóa sản phẩm', 'success');
        await refresh();
      }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { showProductModal(currentProducts.find(p => p.id === parseInt(editBtn.dataset.edit)), currentCats, refresh); return; }
    const pkgBtn = e.target.closest('[data-pkg]');
    if (pkgBtn) {
      const product = currentProducts.find(p => p.id === parseInt(pkgBtn.dataset.pkg));
      showPackagesModal(parseInt(pkgBtn.dataset.pkg), decodeURIComponent(pkgBtn.dataset.pname), product);
      return;
    }
    const addBtn = e.target.closest('#btn-add-prod');
    if (addBtn) { showProductModal(null, currentCats, refresh); return; }
  };
  content.onchange = (e) => {
    const all = e.target.closest('[data-select-all]');
    if (all) {
      qsa('[data-row-select]', content).forEach(cb => {
        cb.checked = all.checked;
        if (all.checked) selectedIds.add(parseInt(cb.value)); else selectedIds.delete(parseInt(cb.value));
      });
      updateBulkBar();
      return;
    }
    const cb = e.target.closest('[data-row-select]');
    if (cb) {
      if (cb.checked) selectedIds.add(parseInt(cb.value)); else selectedIds.delete(parseInt(cb.value));
      updateBulkBar();
    }
  };

  const refresh = async () => {
    const [products, cats] = await Promise.all([apiFetch('/products/admin/all'), apiFetch('/categories/all')]);
    currentProducts = products; currentCats = cats;
    const validIds = new Set(products.map(p => p.id));
    [...selectedIds].forEach(id => { if (!validIds.has(id)) selectedIds.delete(id); });
    const filtered = products.filter(p => (p.product_type || 'premium') === activeTab);
    content.innerHTML = `
      ${cuiPageHeader('Sản phẩm', 'Quản lý sản phẩm, gói bán và nội dung hiển thị', '<button class="btn btn-primary" id="btn-add-prod"><i class="fa-solid fa-plus"></i> Thêm</button>')}
      <div class="admin-tabs mb-16">
        <button class="admin-tab ${activeTab === 'premium' ? 'active' : ''}" data-prod-tab="premium"><i class="fa-solid fa-crown"></i> Premium</button>
        <button class="admin-tab ${activeTab === 'game' ? 'active' : ''}" data-prod-tab="game"><i class="fa-solid fa-gamepad"></i> Topup Game</button>
        <button class="admin-tab ${activeTab === 'giftcard' ? 'active' : ''}" data-prod-tab="giftcard"><i class="fa-solid fa-gift"></i> Gift Card</button>
      </div>
      <div class="d-flex align-center gap-8 mb-12" style="justify-content:space-between">
        <div class="text-muted text-sm">Đã chọn <strong data-bulk-count>${selectedIds.size}</strong> sản phẩm</div>
        <button class="btn btn-sm btn-outline-danger" data-bulk-delete ${selectedIds.size ? '' : 'disabled'}><i class="fa-solid fa-trash-can"></i> Xóa đã chọn</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th style="width:42px"><input type="checkbox" data-select-all></th><th>Tên</th><th>Danh mục</th><th>Gói</th><th>Giá từ</th><th>Nổi bật</th><th>TT</th><th></th></tr></thead>
        <tbody>${filtered.length ? filtered.map(p => `<tr><td><input type="checkbox" data-row-select value="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}></td><td class="td-bold">${esc(p.name)}</td><td class="text-muted">${esc(p.category_name || '—')}</td><td>${(p.packages||[]).length}</td><td class="text-primary">${p.min_price ? fmt(p.min_price) : '—'}</td><td>${p.is_featured ? ico.starFill : '—'}</td><td>${p.is_active ? '<span class="badge badge-green">Hiện</span>' : '<span class="badge badge-gray">Ẩn</span>'}</td><td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit="${p.id}">Sửa</button><button class="tbl-btn tbl-view" data-pkg="${p.id}" data-pname="${encodeURIComponent(p.name)}">Gói</button><button class="tbl-btn tbl-delete" data-del="${p.id}">Xóa</button></div></td></tr>`).join('') : '<tr><td colspan="8" class="text-center text-muted" style="padding:32px 0">Chưa có sản phẩm nào</td></tr>'}</tbody>
      </table></div>
    `;
    updateBulkBar();
  };
  await refresh();
}

function showProductModal(prod, cats, refresh) {
  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });
  const parents = cats.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const children = cats.filter(c => c.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  // Determine which parent and child should be pre-selected
  let selectedParentId = '';
  let selectedChildId = '';
  if (prod?.category_id) {
    const prodCat = catMap[prod.category_id];
    if (prodCat) {
      if (prodCat.parent_id) {
        selectedParentId = prodCat.parent_id;
        selectedChildId = prodCat.id;
      } else {
        selectedParentId = prodCat.id;
      }
    }
  }

  const parentOptions = parents.map(p =>
    `<option value="${p.id}" ${selectedParentId == p.id ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  const childOptionsForParent = (parentId) => {
    const kids = children.filter(c => c.parent_id == parentId);
    if (!kids.length) return '<option value="">-- Không có --</option>';
    return '<option value="">-- Chọn danh mục con --</option>' + kids.map(c =>
      `<option value="${c.id}" ${selectedChildId == c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');
  };

  openModal(`
    <form id="prod-form">
      <div class="form-group"><label class="form-label">Tên<span class="req">*</span></label><input class="form-input" id="pf-name" value="${prod?.name || ''}" required /></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Danh mục lớn</label><select class="form-select" id="pf-cat-parent"><option value="">-- Chọn danh mục lớn --</option>${parentOptions}</select></div>
        <div class="form-group"><label class="form-label">Danh mục con</label><select class="form-select" id="pf-cat-child">${childOptionsForParent(selectedParentId)}</select></div>
      </div>
      <div class="form-group" id="pf-desc-group">
        <label class="form-label">Mô tả</label>
        <div class="editor-toolbar" id="pf-desc-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="underline"><u>U</u></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i> Link</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="image"><i class="fa-regular fa-image"></i> Ảnh</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i> List</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ol"><i class="fa-solid fa-list-ol"></i> Số</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="h2">H2</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="quote"><i class="fa-solid fa-quote-left"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="html"><i class="fa-solid fa-code"></i> HTML</button>
        </div>
        <textarea class="form-textarea rich-textarea" id="pf-desc" rows="10" placeholder="Hỗ trợ HTML: link, ảnh, bảng, heading, list...">${prod?.description || ''}</textarea>
        <div class="form-hint">Bạn có thể nhập HTML trực tiếp hoặc dùng các nút chèn nhanh phía trên.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Ảnh sản phẩm</label>
        <div class="flex gap-8 items-center">
          <input class="form-input flex-1" id="pf-img" value="${prod?.image_url || ''}" placeholder="https://... hoặc upload ảnh" />
          ${imageUploadControl('pf-img', 'pf-img-upload', 'Upload', 'pf-img-preview')}
        </div>
        <div class="admin-upload-preview" id="pf-img-preview">${prod?.image_url ? `<img src="${prod.image_url}" alt="Product image preview" />` : '<span>Chưa có ảnh</span>'}</div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label class="form-label">Thứ tự</label><input type="number" class="form-input" id="pf-order" value="${prod?.sort_order ?? 0}" /></div>
        <div class="form-group"><label class="form-label">Nổi bật</label><select class="form-select" id="pf-featured"><option value="false" ${!prod?.is_featured ? 'selected' : ''}>Không</option><option value="true" ${prod?.is_featured ? 'selected' : ''}>Có</option></select></div>
        <div class="form-group"><label class="form-label">Hiển thị</label><select class="form-select" id="pf-active"><option value="true" ${prod?.is_active !== false ? 'selected' : ''}>Hiện</option><option value="false" ${prod?.is_active === false ? 'selected' : ''}>Ẩn</option></select></div>
      </div>
      <div id="pf-game-tags" class="form-row form-row-2" style="display:none">
        <div class="form-group"><label class="form-label">Hình thức nạp</label><select class="form-select" id="pf-topup-type"><option value="">-- Không áp dụng --</option><option value="uid" ${prod?.topup_type==='uid'?'selected':''}>UID</option><option value="login" ${prod?.topup_type==='login'?'selected':''}>Login</option></select></div>
        <div class="form-group"><label class="form-label">Máy chủ</label><select class="form-select" id="pf-server-region"><option value="">-- Không áp dụng --</option><option value="vietnam" ${prod?.server_region==='vietnam'?'selected':''}>Việt Nam</option><option value="global" ${prod?.server_region==='global'?'selected':''}>Quốc tế</option></select></div>
      </div>
      <div id="prod-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">${prod ? 'Cập nhật' : 'Tạo mới'}</button><button type="button" class="btn btn-ghost" id="prod-cancel">Hủy</button></div>
    </form>
  `, prod ? `Sửa: ${prod.name}` : 'Thêm sản phẩm');

  // When parent changes, refresh child options and show/hide game tags
  const updateGameTags = () => {
    const parentId = qs('#pf-cat-parent').value;
    const parentCat = parentId ? catMap[parseInt(parentId)] : null;
    const pt = parentCat?.product_type;
    const gameTagsEl = qs('#pf-game-tags');
    if (gameTagsEl) gameTagsEl.style.display = pt === 'game' ? '' : 'none';
    const descEl = qs('#pf-desc-group');
    if (descEl) descEl.style.display = pt === 'giftcard' ? 'none' : '';
  };
  qs('#pf-cat-parent').onchange = function() {
    const childSelect = qs('#pf-cat-child');
    childSelect.innerHTML = childOptionsForParent(this.value);
    updateGameTags();
  };
  updateGameTags();

  qs('#prod-cancel').onclick = closeModal;
  bindImageUploads(qs('#modal-content'));

  createRichTextEditor({
    textarea: qs('#pf-desc'),
    toolbarId: 'pf-desc-toolbar',
    placeholder: 'Nhập mô tả sản phẩm...',
    minHeight: 380,
  });
  qs('#prod-form').onsubmit = async (e) => {
    e.preventDefault();
    if (window.syncRichTextEditors) window.syncRichTextEditors();
    const cat_id = qs('#pf-cat-child').value || qs('#pf-cat-parent').value;
    const body = { name: qs('#pf-name').value, category_id: cat_id ? parseInt(cat_id) : null, description: qs('#pf-desc').value || null, image_url: qs('#pf-img').value || null, sort_order: parseInt(qs('#pf-order').value) || 0, is_featured: qs('#pf-featured').value === 'true', is_active: qs('#pf-active').value === 'true', topup_type: qs('#pf-topup-type')?.value || null, server_region: qs('#pf-server-region')?.value || null };
    try { if (prod) await apiFetch(`/products/${prod.id}`, { method: 'PUT', body: JSON.stringify(body) }); else await apiFetch('/products/', { method: 'POST', body: JSON.stringify(body) }); closeModal(); toast(prod ? 'Cập nhật!' : 'Tạo mới!', 'success'); refresh(); }
    catch (err) { const e = qs('#prod-form-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

async function showPackagesModal(productId, productName, prefetchedProduct = null) {
  const prod = prefetchedProduct || await apiFetch('/products/admin/all').then(ps => ps.find(p => p.id === productId));
  const packages = prod?.packages || [];

  const renderFieldRows = (fields) => fields.map(f => `
    <div class="flex gap-8 items-center mb-4" data-field-id="${f.id}">
      <input class="form-input flex-1" value="${f.field_name}" data-fname disabled style="flex:2" />
      <select class="form-select" data-ftype disabled style="flex:1">
        <option value="text" ${f.field_type==='text'?'selected':''}>Text</option>
        <option value="number" ${f.field_type==='number'?'selected':''}>Number</option>
        <option value="textarea" ${f.field_type==='textarea'?'selected':''}>Textarea</option>
        <option value="email" ${f.field_type==='email'?'selected':''}>Email</option>
        <option value="select" ${f.field_type==='select'?'selected':''}>Select</option>
      </select>
      <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-freq ${f.is_required?'checked':''} disabled /><span class="toggle-slider"></span></label>
      <button type="button" class="tbl-btn tbl-delete" data-delfield="${f.id}">Xóa</button>
    </div>
  `).join('');

  const renderPkgList = () => packages.map(pkg => {
    const stockInfo = pkg.delivery_type === 'auto'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Tự động • Kho: ${pkg.stock_count}`
      : pkg.is_stock_managed
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Thủ công • Kho: ${pkg.stock_quantity}`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Thủ công`;
    const fieldsHtml = (pkg.fields && pkg.fields.length)
      ? `<div class="mt-8" style="padding:8px 12px;background:var(--bg-page);border-radius:var(--radius);font-size:12px;color:var(--text-muted);">
          <i class="fa-solid fa-list-check"></i> Trường tùy chỉnh: ${pkg.fields.map(f => f.field_name + (f.is_required ? ' *' : '')).join(', ')}
        </div>`
      : '';
    return `
    <div class="package-item mb-8"><div><div class="pkg-name">${pkg.name}</div><div class="pkg-desc">${stockInfo}</div>${fieldsHtml}</div>
    <div style="text-align:right"><div class="pkg-price">${fmt(pkg.price)}</div>
      <button class="tbl-btn tbl-edit mt-4" data-editpkg="${pkg.id}">Sửa gói</button>
      <button class="tbl-btn mt-4" style="background:var(--bg-page);color:var(--text-secondary);" data-editfield="${pkg.id}">Form đặt hàng</button>
      <button class="tbl-btn tbl-delete mt-4" data-delpkg="${pkg.id}">Xóa</button>
    </div></div>
  `;}).join('');

  openModal(`
    <div id="pkg-list">${renderPkgList()}</div><div class="divider"></div>
    <div class="fw-600 mb-8">Thêm gói mới</div>
    <form id="pkg-form">
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Tên gói</label><input class="form-input" id="pkg-name" required placeholder="1 tháng, 1 năm..." /></div>
        <div class="form-group"><label class="form-label">Giá (đ)</label><input type="number" class="form-input" id="pkg-price" required placeholder="50000" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Giao hàng</label><select class="form-select" id="pkg-delivery"><option value="manual">Thủ công</option><option value="auto">Tự động (kho)</option><option value="api">API</option></select></div>
        <div class="form-group" ${prod?.product_type === 'giftcard' ? 'style="display:none"' : ''}><label class="form-label">Mô tả</label><input class="form-input" id="pkg-desc" placeholder="Mô tả..." /></div>
      </div>
      <div class="form-group" ${(prod?.product_type !== 'game' && prod?.product_type !== 'giftcard') ? 'style="display:none"' : ''}><label class="form-label">Ảnh gói</label>
        <div class="flex gap-8 items-center">
          <input class="form-input flex-1" id="pkg-image" placeholder="https://... hoặc upload ảnh" />
          ${imageUploadControl('pkg-image', 'pkg-image-upload', 'Upload', 'pkg-image-preview')}
        </div>
        <div class="admin-upload-preview mt-4" id="pkg-image-preview"><span>Chưa có ảnh</span></div>
      </div>
      <div class="form-group pkg-notes-group" ${(prod?.product_type === 'game' || prod?.product_type === 'giftcard') ? 'style="display:none"' : ''}><label class="form-label">Chú ý (hiển thị khi chọn gói)</label>
        <div class="editor-toolbar" id="pkg-notes-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i></button>
        </div>
        <textarea class="form-textarea" id="pkg-notes" rows="4" placeholder="Lưu ý riêng cho gói này..."></textarea>
      </div>
      <div id="pkg-api-panel" style="display:none">
        <div class="fw-600 mb-8"><i class="fa-solid fa-plug"></i> Cấu hình API nguồn</div>
        <div class="form-group"><label class="form-label">Provider</label><select class="form-select" id="pkg-provider"><option value="">-- Chọn provider --</option></select></div>
        <div class="form-group">
          <label class="form-label">Nhập ID thủ công</label>
          <label class="toggle-switch"><input type="checkbox" id="pkg-manual-id" /><span class="toggle-slider"></span></label>
        </div>
        <div id="pkg-api-select-mode">
          <div class="form-group"><label class="form-label">Sản phẩm nguồn</label><select class="form-select" id="pkg-remote-product"><option value="">-- Chọn provider trước --</option></select></div>
          <div class="form-group"><label class="form-label">Gói nguồn</label><select class="form-select" id="pkg-remote-plan"><option value="">-- Chọn sản phẩm trước --</option></select></div>
        </div>
        <div id="pkg-api-manual-mode" style="display:none">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">Product ID</label><input class="form-input" id="pkg-ext-product" placeholder="ID sản phẩm nguồn" /></div>
            <div class="form-group"><label class="form-label">Plan ID</label><input class="form-input" id="pkg-ext-plan" placeholder="ID gói nguồn" /></div>
          </div>
        </div>
        <div class="form-row form-row-2 mt-8">
          <div class="form-group">
            <label class="form-label">Tự động tăng giá</label>
            <label class="toggle-switch"><input type="checkbox" id="pkg-auto-markup" /><span class="toggle-slider"></span></label>
          </div>
          <div class="form-group" id="pkg-markup-pct-group" style="display:none">
            <label class="form-label">% tăng giá</label>
            <input type="number" class="form-input" id="pkg-markup-pct" placeholder="10" min="0" max="500" step="0.5" />
          </div>
        </div>
        <div class="divider mt-8 mb-12"></div>
      </div>
      <div class="fw-600 mb-8"><i class="fa-solid fa-list-check"></i> Trường tùy chỉnh</div>
      <div id="pkg-fields-list"></div>
      <button type="button" class="btn btn-ghost btn-sm mb-8" id="pkg-add-field">+ Thêm trường</button>
      <div class="divider mt-4 mb-12"></div>
      <button type="submit" class="btn btn-primary">+ Thêm gói</button>
    </form>
  `, `Gói: ${productName}`);

  const modal = qs('#modal-content');

  // Toggle delivery visibility
  const deliverySelect = qs('#pkg-delivery', modal);
  const apiPanel = qs('#pkg-api-panel', modal);

  const updateDeliveryVisibility = () => {
    const val = deliverySelect.value;
    if (apiPanel) apiPanel.style.display = val === 'api' ? '' : 'none';
  };
  deliverySelect.onchange = updateDeliveryVisibility;
  updateDeliveryVisibility();
  bindImageUploads(modal);

  const createMarkupToggle = qs('#pkg-auto-markup', modal);
  const createMarkupPctGroup = qs('#pkg-markup-pct-group', modal);
  if (createMarkupToggle) {
    createMarkupToggle.onchange = () => { createMarkupPctGroup.style.display = createMarkupToggle.checked ? '' : 'none'; };
  }

  // Manual ID toggle
  let fieldCounter = 0;
  const manualIdToggle = qs('#pkg-manual-id', modal);
  if (manualIdToggle) {
    manualIdToggle.onchange = () => {
      qs('#pkg-api-select-mode', modal).style.display = manualIdToggle.checked ? 'none' : '';
      qs('#pkg-api-manual-mode', modal).style.display = manualIdToggle.checked ? '' : 'none';
    };
  }

  // Load providers for API panel (create form)
  const expectedProvType = prod?.product_type === 'game' ? 'topup_game' : prod?.product_type === 'giftcard' ? 'giftcard' : 'account_premium';
  (async () => {
    try {
      const providers = await apiFetch('/api-providers/');
      const filtered = providers.filter(p => p.provider_type === expectedProvType);
      const provSelect = qs('#pkg-provider', modal);
      if (provSelect) {
        provSelect.innerHTML = '<option value="">-- Chọn provider --</option>' +
          filtered.map(p => `<option value="${p.id}">${esc(p.name)} (${p.provider_type})</option>`).join('');
      }
    } catch(e) {}
  })();

  const loadCreateRemoteProducts = async (providerId) => {
    const remoteProdSelect = qs('#pkg-remote-product', modal);
    const remotePlanSelect = qs('#pkg-remote-plan', modal);
    if (!remoteProdSelect) return;
    remoteProdSelect.innerHTML = '<option value="">Đang tải...</option>';
    try {
      const products = await apiFetch('/api-providers/' + providerId + '/remote-products');
      remoteProdSelect.innerHTML = '<option value="">-- Chọn sản phẩm nguồn --</option>' +
        products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
      window._remoteProductsCreate = products;
    } catch(e) { remoteProdSelect.innerHTML = '<option value="">Lỗi tải</option>'; }
  };

  const pkgProvSelect = qs('#pkg-provider', modal);
  if (pkgProvSelect) {
    pkgProvSelect.onchange = function() {
      if (this.value) loadCreateRemoteProducts(this.value);
      else {
        qs('#pkg-remote-product', modal).innerHTML = '<option value="">-- Chọn provider trước --</option>';
        qs('#pkg-remote-plan', modal).innerHTML = '<option value="">-- Chọn sản phẩm trước --</option>';
      }
    };
  }
  const pkgRemoteProd = qs('#pkg-remote-product', modal);
  if (pkgRemoteProd) {
    pkgRemoteProd.onchange = async function() {
      const remotePlanSelect = qs('#pkg-remote-plan', modal);
      const prod = (window._remoteProductsCreate || []).find(p => p.id == this.value);
      if (prod) {
        remotePlanSelect.innerHTML = '<option value="">-- Chọn gói nguồn --</option>' +
          prod.plans.map(pl => `<option value="${pl.id}">${esc(pl.name)} - ${pl.price.toLocaleString()}đ</option>`).join('');
      } else {
        remotePlanSelect.innerHTML = '<option value="">-- Chọn sản phẩm trước --</option>';
      }
      // Auto-fetch form fields from source
      const providerId = qs('#pkg-provider', modal)?.value;
      if (providerId && this.value) {
        try {
          const fields = await apiFetch('/api-providers/' + providerId + '/remote-products/' + this.value + '/form-fields');
          if (fields && fields.length) {
            const fieldsList = qs('#pkg-fields-list', modal);
            fieldsList.innerHTML = '';
            fieldCounter = 0;
            for (const f of fields) {
              const idx = fieldCounter++;
              const isSelect = f.type === 'select';
              const row = document.createElement('div');
              row.className = 'mb-4';
              row.dataset.newField = idx;
              row.innerHTML = `
                <div class="flex gap-8 items-center">
                  <input class="form-input" data-new-fname value="${esc(f.label || f.key)}" style="flex:2" />
                  <select class="form-select" data-new-ftype style="flex:1">
                    <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                    <option value="number" ${f.type==='number'?'selected':''}>Number</option>
                    <option value="textarea" ${f.type==='textarea'?'selected':''}>Textarea</option>
                    <option value="email" ${f.type==='email'?'selected':''}>Email</option>
                    <option value="select" ${isSelect?'selected':''}>Select</option>
                  </select>
                  <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-new-freq ${f.required !== false ? 'checked' : ''} /><span class="toggle-slider"></span></label>
                  <button type="button" class="tbl-btn tbl-delete" data-remove-field>Xóa</button>
                </div>
                <div class="new-field-opts" style="display:${isSelect ? '' : 'none'};margin-top:4px;">
                  <input class="form-input" data-new-fopts value='${isSelect && f.options?.length ? JSON.stringify(f.options) : ''}' placeholder='Options: ["Option 1","Option 2"]' />
                </div>
              `;
              fieldsList.appendChild(row);
              row.querySelector('[data-remove-field]').onclick = () => row.remove();
              row.querySelector('[data-new-ftype]').onchange = (e) => {
                row.querySelector('.new-field-opts').style.display = e.target.value === 'select' ? '' : 'none';
              };
            }
            toast('Đã tải ' + fields.length + ' trường từ nguồn', 'success');
          }
        } catch(e) { /* silent */ }
      }
    };
  }

  // Dynamic field rows for new package
  qs('#pkg-add-field', modal).onclick = () => {
    const idx = fieldCounter++;
    const row = document.createElement('div');
    row.className = 'mb-4';
    row.dataset.newField = idx;
    row.innerHTML = `
      <div class="flex gap-8 items-center">
        <input class="form-input" data-new-fname placeholder="Tên trường" style="flex:2" />
        <select class="form-select" data-new-ftype style="flex:1">
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="textarea">Textarea</option>
          <option value="email">Email</option>
          <option value="select">Select</option>
        </select>
        <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-new-freq checked /><span class="toggle-slider"></span></label>
        <button type="button" class="tbl-btn tbl-delete" data-remove-field>Xóa</button>
      </div>
      <div class="new-field-opts" style="display:none;margin-top:4px;"><input class="form-input" data-new-fopts placeholder='Options: ["Option 1","Option 2"]' /></div>
    `;
    qs('#pkg-fields-list', modal).appendChild(row);
    row.querySelector('[data-remove-field]').onclick = () => row.remove();
    // Show/hide options input based on type
    row.querySelector('[data-new-ftype]').onchange = (e) => {
      row.querySelector('.new-field-opts').style.display = e.target.value === 'select' ? '' : 'none';
    };
  };

  // Delete package
  modal.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delpkg]');
    if (!btn) return;
    if (!confirm('Xóa?')) return;
    try {
      await apiFetch(`/products/packages/${btn.dataset.delpkg}`, { method: 'DELETE' });
      toast('Đã xóa', 'success');
      const idx = packages.findIndex(p => p.id === parseInt(btn.dataset.delpkg));
      if (idx >= 0) packages.splice(idx, 1);
      qs('#pkg-list', modal).innerHTML = renderPkgList();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Edit package info (opens sub-modal)
  modal.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-editpkg]');
    if (!btn) return;
    const pkgId = parseInt(btn.dataset.editpkg);
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;
    showPackageFormModal(pkg, () => {
      showPackagesModal(productId, productName);
    }, prod);
  });

  // Edit package fields (opens sub-modal for custom fields)
  modal.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-editfield]');
    if (!btn) return;
    const pkgId = parseInt(btn.dataset.editfield);
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;
    showPackageFieldModal(pkg, () => {
      // Re-open the packages modal since the sub-modal overwrote #modal-content
      showPackagesModal(productId, productName);
    });
  });

  createRichTextEditor({
    textareaId: 'pkg-notes',
    toolbarId: 'pkg-notes-toolbar',
    placeholder: 'Nhập lưu ý cho gói...',
  });

  qs('#pkg-form', modal).onsubmit = async (e) => {
    e.preventDefault();
    if (window.syncRichTextEditors) window.syncRichTextEditors();
    const deliveryType = qs('#pkg-delivery', modal).value;
    const isApi = deliveryType === 'api';
    const isAuto = deliveryType === 'auto';
    const isManualId = qs('#pkg-manual-id', modal)?.checked;
    const extProduct = isApi ? (isManualId ? qs('#pkg-ext-product', modal)?.value : qs('#pkg-remote-product', modal)?.value) : null;
    const extPlan = isApi ? (isManualId ? qs('#pkg-ext-plan', modal)?.value : qs('#pkg-remote-plan', modal)?.value) : null;
    const body = {
      name: qs('#pkg-name', modal).value,
      price: parseFloat(qs('#pkg-price', modal).value),
      delivery_type: deliveryType,
      image_url: qs('#pkg-image', modal)?.value || null,
      api_provider_id: isApi ? (parseInt(qs('#pkg-provider', modal)?.value) || null) : null,
      external_product_id: extProduct || null,
      external_plan_id: extPlan || null,
      description: qs('#pkg-desc', modal).value || null,
      notes: qs('#pkg-notes', modal).value || null,
      is_stock_managed: isAuto,
      stock_quantity: 0,
      auto_markup: qs('#pkg-auto-markup', modal)?.checked || false,
      markup_percent: qs('#pkg-auto-markup', modal)?.checked ? (parseFloat(qs('#pkg-markup-pct', modal)?.value) || null) : null,
    };
    try {
      const np = await apiFetch(`/products/${productId}/packages`, { method: 'POST', body: JSON.stringify(body) });
      // Create fields for the new package
      const newFieldRows = qsa('[data-new-field]', modal);
      for (const row of newFieldRows) {
        const fnameInput = row.querySelector('[data-new-fname]');
        const ftypeInput = row.querySelector('[data-new-ftype]');
        const freqInput = row.querySelector('[data-new-freq]');
        if (!fnameInput || !ftypeInput || !freqInput) continue;

        const fname = fnameInput.value.trim();
        if (!fname) continue;
        const ftype = ftypeInput.value;
        const freq = freqInput.checked;
        const fieldData = { field_name: fname, field_type: ftype, is_required: freq };
        if (ftype === 'select') {
          const optsInput = row.querySelector('[data-new-fopts]');
          if (optsInput?.value.trim()) fieldData.options = optsInput.value.trim();
        }
        await apiFetch(`/products/packages/${np.id}/fields`, {
          method: 'POST',
          body: JSON.stringify(fieldData)
        });
      }
      // Re-fetch to get fields included
      const refreshed = await apiFetch('/products/admin/all').then(ps => ps.find(p => p.id === productId));
      packages.length = 0;
      packages.push(...(refreshed?.packages || []));
      qs('#pkg-list', modal).innerHTML = renderPkgList();
      e.target.reset();
      qs('#pkg-fields-list', modal).innerHTML = '';
      fieldCounter = 0;
      updateDeliveryVisibility();
      toast('Đã thêm gói', 'success');
    }
    catch (err) { toast(err.message, 'error'); }
  };
}

function showPackageFormModal(pkg, refresh, parentProduct) {
  const isGamePkg = parentProduct?.product_type === 'game';
  const isGiftcardPkg = parentProduct?.product_type === 'giftcard';
  const showPkgImage = isGamePkg || isGiftcardPkg;
  openModal(`
    <div class="fw-600 mb-12"><i class="fa-solid fa-box-open"></i> Sửa gói: ${pkg.name}</div>
    <form id="edit-pkg-form">
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Tên gói</label><input class="form-input" id="epkg-name" required value="${pkg.name}" /></div>
        <div class="form-group"><label class="form-label">Giá (đ)</label><input type="number" class="form-input" id="epkg-price" required value="${pkg.price}" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Giao hàng</label><select class="form-select" id="epkg-delivery"><option value="manual" ${pkg.delivery_type==='manual'?'selected':''}>Thủ công</option><option value="auto" ${pkg.delivery_type==='auto'?'selected':''}>Tự động (kho)</option><option value="api" ${pkg.delivery_type==='api'?'selected':''}>API</option></select></div>
        <div class="form-group" ${isGiftcardPkg ? 'style="display:none"' : ''}><label class="form-label">Mô tả</label><input class="form-input" id="epkg-desc" value="${pkg.description || ''}" placeholder="Mô tả..." /></div>
      </div>
      <div class="form-group" ${!showPkgImage ? 'style="display:none"' : ''}><label class="form-label">Ảnh gói</label>
        <div class="flex gap-8 items-center">
          <input class="form-input flex-1" id="epkg-image" value="${pkg.image_url || ''}" placeholder="https://... hoặc upload ảnh" />
          ${imageUploadControl('epkg-image', 'epkg-image-upload', 'Upload', 'epkg-image-preview')}
        </div>
        <div class="admin-upload-preview mt-4" id="epkg-image-preview">${pkg.image_url ? `<img src="${pkg.image_url}" style="max-height:80px;border-radius:6px" />` : '<span>Chưa có ảnh</span>'}</div>
      </div>
      <div id="epkg-api-panel" style="display:${pkg.delivery_type==='api'?'':'none'}">
        <div class="divider mt-8 mb-8"></div>
        <div class="fw-600 mb-8"><i class="fa-solid fa-plug"></i> Cấu hình API nguồn</div>
        <div class="form-group"><label class="form-label">Provider</label><select class="form-select" id="epkg-provider"><option value="">-- Chọn provider --</option></select></div>
        <div class="form-group">
          <label class="form-label">Nhập ID thủ công</label>
          <label class="toggle-switch"><input type="checkbox" id="epkg-manual-id" ${pkg.external_product_id && !pkg._fromDropdown ? 'checked' : ''} /><span class="toggle-slider"></span></label>
        </div>
        <div id="epkg-api-select-mode">
          <div class="form-group"><label class="form-label">Sản phẩm nguồn</label><select class="form-select" id="epkg-remote-product"><option value="">-- Chọn provider trước --</option></select></div>
          <div class="form-group"><label class="form-label">Gói nguồn</label><select class="form-select" id="epkg-remote-plan"><option value="">-- Chọn sản phẩm trước --</option></select></div>
        </div>
        <div id="epkg-api-manual-mode" style="display:none">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">Product ID</label><input class="form-input" id="epkg-ext-product" value="${pkg.external_product_id || ''}" placeholder="ID sản phẩm nguồn" /></div>
            <div class="form-group"><label class="form-label">Plan ID</label><input class="form-input" id="epkg-ext-plan" value="${pkg.external_plan_id || ''}" placeholder="ID gói nguồn" /></div>
          </div>
        </div>
        <div class="form-row form-row-2 mt-8">
          <div class="form-group">
            <label class="form-label">Tự động tăng giá</label>
            <label class="toggle-switch"><input type="checkbox" id="epkg-auto-markup" ${pkg.auto_markup?'checked':''} /><span class="toggle-slider"></span></label>
          </div>
          <div class="form-group" id="epkg-markup-pct-group" style="display:${pkg.auto_markup?'':'none'}">
            <label class="form-label">% tăng giá</label>
            <input type="number" class="form-input" id="epkg-markup-pct" value="${pkg.markup_percent || ''}" placeholder="10" min="0" max="500" step="0.5" />
          </div>
        </div>
      </div>
      <div class="form-group" ${(isGamePkg || isGiftcardPkg) ? 'style="display:none"' : ''}><label class="form-label">Chú ý (hiển thị khi chọn gói)</label>
        <div class="editor-toolbar" id="epkg-notes-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i></button>
        </div>
        <textarea class="form-textarea" id="epkg-notes" rows="4" placeholder="Lưu ý riêng cho gói này...">${pkg.notes || ''}</textarea>
      </div>
      <div class="divider mt-12 mb-12"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">Lưu</button><button type="button" class="btn btn-ghost" id="epkg-cancel">Hủy</button></div>
    </form>
  `, `Sửa gói`);

  const emodal = qs('#modal-content');
  const deliverySelect = qs('#epkg-delivery', emodal);
  const apiPanelE = qs('#epkg-api-panel', emodal);

  const updateDeliveryVisibility = () => {
    const val = deliverySelect.value;
    if (apiPanelE) apiPanelE.style.display = val === 'api' ? '' : 'none';
  };
  deliverySelect.onchange = updateDeliveryVisibility;
  updateDeliveryVisibility();
  bindImageUploads(emodal);

  const autoMarkupToggle = qs('#epkg-auto-markup', emodal);
  const markupPctGroup = qs('#epkg-markup-pct-group', emodal);
  if (autoMarkupToggle) {
    autoMarkupToggle.onchange = () => { markupPctGroup.style.display = autoMarkupToggle.checked ? '' : 'none'; };
  }

  qs('#epkg-cancel', emodal).onclick = closeModal;

  // Manual ID toggle for edit form
  const eManualIdToggle = qs('#epkg-manual-id', emodal);
  if (eManualIdToggle) {
    eManualIdToggle.onchange = () => {
      qs('#epkg-api-select-mode', emodal).style.display = eManualIdToggle.checked ? 'none' : '';
      qs('#epkg-api-manual-mode', emodal).style.display = eManualIdToggle.checked ? '' : 'none';
    };
    // Init state
    qs('#epkg-api-select-mode', emodal).style.display = eManualIdToggle.checked ? 'none' : '';
    qs('#epkg-api-manual-mode', emodal).style.display = eManualIdToggle.checked ? '' : 'none';
  }

  // Load providers for edit form API panel
  const editExpectedProvType = isGamePkg ? 'topup_game' : isGiftcardPkg ? 'giftcard' : 'account_premium';
  (async () => {
    try {
      const providers = await apiFetch('/api-providers/');
      const filtered = providers.filter(p => p.provider_type === editExpectedProvType);
      const provSelect = qs('#epkg-provider', emodal);
      if (provSelect) {
        provSelect.innerHTML = '<option value="">-- Chọn provider --</option>' +
          filtered.map(p => `<option value="${p.id}" ${pkg.api_provider_id == p.id ? 'selected' : ''}>${esc(p.name)} (${p.provider_type})</option>`).join('');
      }
      if (pkg.api_provider_id) loadEditRemoteProducts(pkg.api_provider_id, pkg);
    } catch(e) {}
  })();

  const loadEditRemoteProducts = async (providerId, existingPkg) => {
    const remoteProdSelect = qs('#epkg-remote-product', emodal);
    const remotePlanSelect = qs('#epkg-remote-plan', emodal);
    if (!remoteProdSelect) return;
    remoteProdSelect.innerHTML = '<option value="">Đang tải...</option>';
    try {
      const products = await apiFetch('/api-providers/' + providerId + '/remote-products');
      remoteProdSelect.innerHTML = '<option value="">-- Chọn sản phẩm nguồn --</option>' +
        products.map(p => `<option value="${p.id}" ${existingPkg?.external_product_id == p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
      window._remoteProductsEdit = products;
      if (existingPkg?.external_product_id) {
        const match = products.find(p => p.id == existingPkg.external_product_id);
        if (match) {
          remotePlanSelect.innerHTML = '<option value="">-- Chọn gói nguồn --</option>' +
            match.plans.map(pl => `<option value="${pl.id}" ${existingPkg?.external_plan_id == pl.id ? 'selected' : ''}>${esc(pl.name)} - ${pl.price.toLocaleString()}đ</option>`).join('');
        }
      }
    } catch(e) { remoteProdSelect.innerHTML = '<option value="">Lỗi tải</option>'; }
  };

  const epkgProv = qs('#epkg-provider', emodal);
  if (epkgProv) {
    epkgProv.onchange = function() {
      if (this.value) loadEditRemoteProducts(this.value, {});
      else {
        qs('#epkg-remote-product', emodal).innerHTML = '<option value="">-- Chọn provider trước --</option>';
        qs('#epkg-remote-plan', emodal).innerHTML = '<option value="">-- Chọn sản phẩm trước --</option>';
      }
    };
  }
  const epkgRemoteProd = qs('#epkg-remote-product', emodal);
  if (epkgRemoteProd) {
    epkgRemoteProd.onchange = function() {
      const remotePlanSelect = qs('#epkg-remote-plan', emodal);
      const prod = (window._remoteProductsEdit || []).find(p => p.id == this.value);
      if (prod) {
        remotePlanSelect.innerHTML = '<option value="">-- Chọn gói nguồn --</option>' +
          prod.plans.map(pl => `<option value="${pl.id}">${esc(pl.name)} - ${pl.price.toLocaleString()}đ</option>`).join('');
      } else {
        remotePlanSelect.innerHTML = '<option value="">-- Chọn sản phẩm trước --</option>';
      }
    };
  }

  createRichTextEditor({
    textareaId: 'epkg-notes',
    toolbarId: 'epkg-notes-toolbar',
    placeholder: 'Nhập lưu ý cho gói...',
  });

  qs('#edit-pkg-form', emodal).onsubmit = async (e) => {
    e.preventDefault();
    if (window.syncRichTextEditors) window.syncRichTextEditors();
    const deliveryVal = qs('#epkg-delivery', emodal).value;
    const isApiE = deliveryVal === 'api';
    const isAutoE = deliveryVal === 'auto';
    const isManualIdE = qs('#epkg-manual-id', emodal)?.checked;
    const extProductE = isApiE ? (isManualIdE ? qs('#epkg-ext-product', emodal)?.value : qs('#epkg-remote-product', emodal)?.value) : null;
    const extPlanE = isApiE ? (isManualIdE ? qs('#epkg-ext-plan', emodal)?.value : qs('#epkg-remote-plan', emodal)?.value) : null;
    const body = {
      name: qs('#epkg-name', emodal).value,
      price: parseFloat(qs('#epkg-price', emodal).value),
      delivery_type: deliveryVal,
      description: qs('#epkg-desc', emodal).value || null,
      notes: qs('#epkg-notes', emodal).value || null,
      image_url: qs('#epkg-image', emodal)?.value || null,
      is_stock_managed: isAutoE,
      stock_quantity: 0,
      api_provider_id: isApiE ? (parseInt(qs('#epkg-provider', emodal)?.value) || null) : null,
      external_product_id: extProductE || null,
      external_plan_id: extPlanE || null,
      auto_markup: qs('#epkg-auto-markup', emodal)?.checked || false,
      markup_percent: qs('#epkg-auto-markup', emodal)?.checked ? (parseFloat(qs('#epkg-markup-pct', emodal)?.value) || null) : null,
    };
    try {
      await apiFetch(`/products/packages/${pkg.id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Đã lưu gói', 'success');
      closeModal();
      if (refresh) refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

function showPackageFieldModal(pkg, refresh) {
  const fields = [...(pkg.fields || [])];
  const renderFields = () => fields.map((f, i) => {
    const isSelect = f.field_type === 'select';
    const optsVal = f.options ? (typeof f.options === 'string' ? f.options : JSON.stringify(f.options)) : '';
    return `
    <div class="flex gap-8 items-center mb-4" data-fidx="${i}">
      <input class="form-input flex-1" value="${f.field_name}" data-efname style="flex:2" />
      <select class="form-select" data-eftype style="flex:1">
        <option value="text" ${f.field_type==='text'?'selected':''}>Text</option>
        <option value="number" ${f.field_type==='number'?'selected':''}>Number</option>
        <option value="textarea" ${f.field_type==='textarea'?'selected':''}>Textarea</option>
        <option value="email" ${f.field_type==='email'?'selected':''}>Email</option>
        <option value="select" ${f.field_type==='select'?'selected':''}>Select</option>
      </select>
      <label class="toggle-switch" style="flex-shrink:0"><input type="checkbox" data-efreq ${f.is_required?'checked':''} /><span class="toggle-slider"></span></label>
      <button type="button" class="tbl-btn tbl-delete" data-rmefield="${i}">Xóa</button>
    </div>
    ${isSelect ? `<div class="mb-4" style="margin-left:0"><input class="form-input" data-efopts value="${optsVal}" placeholder='Options: ["Option 1","Option 2"]' style="flex:1" /></div>` : ''}
  `;}).join('');

  openModal(`
    <div class="fw-600 mb-12"><i class="fa-solid fa-list-check"></i> Trường tùy chỉnh: ${pkg.name}</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;font-size:12px;color:var(--text-muted);font-weight:600;">
      <span style="flex:2">Tên trường</span><span style="flex:1">Loại</span><span>Bắt buộc</span><span></span>
    </div>
    <div id="efields-list">${renderFields()}</div>
    <button type="button" class="btn btn-ghost btn-sm mb-12" id="ef-add-field">+ Thêm trường</button>
    <div class="divider mb-12"></div>
    <div class="flex gap-8"><button type="button" class="btn btn-primary flex-1" id="ef-save">Lưu</button><button type="button" class="btn btn-ghost" id="ef-cancel">Hủy</button></div>
  `, `Trường tùy chỉnh`);

  const emodal = qs('#modal-content');

  // Add new field row
  qs('#ef-add-field', emodal).onclick = () => {
    fields.push({ field_name: '', field_type: 'text', is_required: true, _new: true });
    qs('#efields-list', emodal).innerHTML = renderFields();
  };

  // Remove field row
  emodal.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rmefield]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.rmefield);
    fields.splice(idx, 1);
    qs('#efields-list', emodal).innerHTML = renderFields();
  });

  // Toggle options input visibility when type changes
  emodal.addEventListener('change', (e) => {
    if (!e.target.matches('[data-eftype]')) return;
    const row = e.target.closest('[data-fidx]');
    if (!row) return;
    const nextDiv = row.nextElementSibling;
    if (e.target.value === 'select') {
      if (!nextDiv || !nextDiv.querySelector('[data-efopts]')) {
        const optsDiv = document.createElement('div');
        optsDiv.className = 'mb-4';
        optsDiv.innerHTML = `<input class="form-input" data-efopts placeholder='Options: ["Option 1","Option 2"]' />`;
        row.after(optsDiv);
      }
    } else {
      if (nextDiv && nextDiv.querySelector('[data-efopts]')) {
        nextDiv.remove();
      }
    }
  });

  qs('#ef-cancel', emodal).onclick = closeModal;

  qs('#ef-save', emodal).onclick = async () => {
    try {
      const existingFieldIds = (pkg.fields || []).map(f => f.id);
      const rows = qsa('[data-fidx]', emodal);
      const nextFields = rows.map((row, idx) => {
        const fname = row.querySelector('[data-efname]').value.trim();
        const ftype = row.querySelector('[data-eftype]').value;
        const freq = row.querySelector('[data-efreq]').checked;
        const field = fields[idx] || {};
        const fieldData = {
          id: field.id,
          field_name: fname,
          field_type: ftype,
          is_required: freq,
        };
        if (ftype === 'select') {
          const optsInput = row.nextElementSibling?.querySelector('[data-efopts]');
          if (optsInput?.value.trim()) fieldData.options = optsInput.value.trim();
        }
        return fieldData;
      }).filter(field => field.field_name);

      const nextFieldIds = nextFields.filter(f => f.id).map(f => f.id);
      const removedIds = existingFieldIds.filter(id => !nextFieldIds.includes(id));

      for (const id of removedIds) {
        await apiFetch(`/products/fields/${id}`, { method: 'DELETE' });
      }

      for (const field of nextFields) {
        const payload = {
          field_name: field.field_name,
          field_type: field.field_type,
          is_required: field.is_required,
        };
        if (field.options) payload.options = field.options;

        if (field.id) {
          await apiFetch(`/products/fields/${field.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          await apiFetch(`/products/packages/${pkg.id}/fields`, { method: 'POST', body: JSON.stringify(payload) });
        }
      }

      toast('Đã lưu trường tùy chỉnh', 'success');
      closeModal();
      if (refresh) refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

function adminOrderPrimaryItem(order) {
  return Array.isArray(order?.items) && order.items.length ? order.items[0] : null;
}

function adminOrderSummary(order) {
  const primary = adminOrderPrimaryItem(order);
  if (!primary) return esc(order.product_name || '—');
  const extra = (order.items?.length || 0) - 1;
  const base = `${esc(primary.product_name || '—')} — ${esc(primary.package_name || '—')}`;
  return extra > 0 ? `${base} <span class="text-muted">+${extra} sản phẩm</span>` : base;
}

function adminOrderItemsHtml(order) {
  const items = Array.isArray(order?.items) && order.items.length ? order.items : [{ product_name: order.product_name, package_name: order.package_name, quantity: order.quantity, line_total: order.total_amount, custom_fields_data: order.custom_fields_data, delivery_data: order.delivery_data }];
  return items.map((item, idx) => `
    <div class="order-item-card" style="padding:${idx < items.length - 1 ? '0 0 12px 0' : '0'}; margin:${idx < items.length - 1 ? '0 0 12px 0' : '0'}; border-bottom:${idx < items.length - 1 ? '1px dashed var(--border)' : 'none'};">
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
        <div>
          <div style="font-weight:700; color:var(--text-heading);">${esc(item.product_name || '—')}</div>
          <div class="text-sm text-muted" style="margin-top:4px;">${esc(item.package_name || '—')} · SL ${item.quantity || 1}</div>
        </div>
        <div class="text-sm" style="font-weight:700; color:var(--primary);">${fmt(item.line_total || 0)}</div>
      </div>
      ${item.custom_fields_data && Object.keys(item.custom_fields_data).length ? `<div class="mt-8 text-sm">${Object.entries(item.custom_fields_data).map(([k,v]) => `<div><strong>${esc(k)}:</strong> ${esc(v)}</div>`).join('')}</div>` : ''}
      ${item.delivery_data ? `<div class="delivery-box mt-12"><div class="delivery-box-title">Dữ liệu giao</div><div class="delivery-data">${esc(item.delivery_data)}</div></div>` : ''}
    </div>
  `).join('');
}

// ADMIN ORDERS
async function renderAdminOrders(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const selectedIds = new Set();
  const updateBulkBar = () => {
    const count = selectedIds.size;
    qsa('[data-bulk-count]', content).forEach(el => { el.textContent = count; });
    qsa('[data-bulk-delete]', content).forEach(btn => { btn.disabled = count === 0; });
    const allBoxes = qsa('[data-row-select]', content);
    const all = qs('[data-select-all]', content);
    if (all) all.checked = allBoxes.length > 0 && allBoxes.every(cb => cb.checked);
  };
  const refresh = async (status = '') => {
    try {
    const data = await apiFetch(`/orders/admin/all?limit=50${status ? '&status=' + status : ''}`);
    const statusOptions = ['', 'pending', 'paid', 'completed', 'cancelled', 'failed'];
    const statusLabels = { pending: 'Đặt hàng', paid: 'Đã thanh toán', completed: 'Đã giao hàng', cancelled: 'Đã hủy', failed: 'Lỗi' };
    const paymentLabels = { sepay: 'QR Ngân hàng', balance: 'Số dư' };
    const validIds = new Set(data.items.map(o => o.id));
    [...selectedIds].forEach(id => { if (!validIds.has(id)) selectedIds.delete(id); });
    const actionButtons = (o) => {
      const buttons = [];
      buttons.push(`<button class="tbl-btn tbl-edit" data-edit-status="${o.id}" data-status="${o.status}">Trạng thái</button>`);
      if (o.status === 'pending') {
        buttons.push(`<button class="tbl-btn tbl-delete" data-cancel-order="${o.id}">Hủy</button>`);
      }
      buttons.push(`<button class="tbl-btn tbl-delete" data-delete-order="${o.id}">Xóa</button>`);
      buttons.push(`<button class="tbl-btn tbl-view" data-view-order="${o.id}" data-od="${encodeURIComponent(JSON.stringify(o))}">Xem</button>`);
      return `<div class="tbl-actions">${buttons.join('')}</div>`;
    };
    content.innerHTML = `
      <div class="filter-pills">${statusOptions.map(s => `<button class="filter-pill ${status === s ? 'active' : ''}" data-filter="${s}">${s ? statusLabels[s] || s : 'Tất cả'}</button>`).join('')}</div>
      <div class="d-flex align-center gap-8 mb-12" style="justify-content:space-between">
        <div class="text-muted text-sm">Đã chọn <strong data-bulk-count>${selectedIds.size}</strong> đơn hàng</div>
        <button class="btn btn-sm btn-outline-danger" data-bulk-delete ${selectedIds.size ? '' : 'disabled'}><i class="fa-solid fa-trash-can"></i> Xóa đã chọn</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th style="width:42px"><input type="checkbox" data-select-all></th><th>Mã đơn</th><th>Khách</th><th>SP</th><th>Tiền</th><th>PTTT</th><th>TT</th><th>Ngày</th><th></th></tr></thead>

        <tbody>${data.items.map(o => `<tr><td><input type="checkbox" data-row-select value="${o.id}" ${selectedIds.has(o.id) ? 'checked' : ''}></td><td class="td-mono">${o.order_code}</td><td class="text-sm">${esc(o.user_email) || '—'}</td><td class="text-sm">${adminOrderSummary(o)}</td><td class="text-primary">${fmt(o.total_amount)}</td><td class="text-sm">${paymentLabels[o.payment_method] || o.payment_method || 'SePay'}</td><td>${statusBadge(o.status)}</td><td class="text-sm text-muted">${fmtDate(o.created_at)}</td><td>${actionButtons(o)}</td></tr>`).join('')}</tbody>
      </table></div>
    `;
    updateBulkBar();

    content.onchange = (e) => {
      const all = e.target.closest('[data-select-all]');
      if (all) {
        qsa('[data-row-select]', content).forEach(cb => {
          cb.checked = all.checked;
          if (all.checked) selectedIds.add(parseInt(cb.value)); else selectedIds.delete(parseInt(cb.value));
        });
        updateBulkBar();
        return;
      }
      const cb = e.target.closest('[data-row-select]');
      if (cb) {
        if (cb.checked) selectedIds.add(parseInt(cb.value)); else selectedIds.delete(parseInt(cb.value));
        updateBulkBar();
      }
    };

    content.onclick = async (e) => {
      const filterBtn = e.target.closest('[data-filter]');
      if (filterBtn) {
        refresh(filterBtn.dataset.filter);
        return;
      }

      const bulkBtn = e.target.closest('[data-bulk-delete]');
      if (bulkBtn) {
        const ids = [...selectedIds];
        if (!ids.length) return;
        if (!confirm(`Xóa vĩnh viễn ${ids.length} đơn hàng đã chọn? Thao tác này không hoàn tiền.`)) return;
        try {
          const res = await apiFetch('/orders/admin/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
          selectedIds.clear();
          toast(`Đã xóa ${res.deleted || 0} đơn hàng`, 'success');
          await refresh(status);
        } catch (err) { toast(err.message, 'error'); }
        return;
      }

      const editStatusBtn = e.target.closest('[data-edit-status]');
      if (editStatusBtn) {
        showOrderStatusModal(parseInt(editStatusBtn.dataset.editStatus), editStatusBtn.dataset.status, refresh.bind(null, status));
        return;
      }

      const cancelBtn = e.target.closest('[data-cancel-order]');
      if (cancelBtn) {
        if (!confirm('Hủy đơn này? Chỉ dùng cho đơn hết thời gian/chưa thanh toán, không hoàn tiền.')) return;
        try {
          await apiFetch(`/orders/admin/${cancelBtn.dataset.cancelOrder}/cancel`, { method: 'POST', body: JSON.stringify({}) });
          toast('Đã hủy đơn', 'success');
          await refresh(status);
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-delete-order]');
      if (deleteBtn) {
        if (!confirm('Xóa vĩnh viễn đơn này? Thao tác này không hoàn tiền.')) return;
        try {
          await apiFetch(`/orders/admin/${deleteBtn.dataset.deleteOrder}`, { method: 'DELETE' });
          selectedIds.delete(parseInt(deleteBtn.dataset.deleteOrder));
          toast('Đã xóa đơn hàng', 'success');
          await refresh(status);
        } catch (err) { toast(err.message, 'error'); }
        return;
      }

      const viewBtn = e.target.closest('[data-view-order]');
      if (viewBtn) {
        const o = JSON.parse(decodeURIComponent(viewBtn.dataset.od));
        openModal(`
          <div class="order-meta">${Object.entries({ 'Mã đơn': o.order_code, 'Khách': esc(o.user_email), 'Tóm tắt': adminOrderSummary(o), 'Tiền': fmt(o.total_amount), 'PTTT': paymentLabels[o.payment_method] || o.payment_method || 'SePay', 'TT': statusLabels[o.status] || o.status, 'Ngày': fmtDate(o.created_at), 'Coupon': o.coupon_code || '—' }).map(([k, v]) => `<div class="order-meta-item"><div class="order-meta-label">${k}</div><div class="order-meta-value">${v || '—'}</div></div>`).join('')}</div>
          <div class="delivery-box mt-12"><div class="delivery-box-title">Danh sách sản phẩm</div><div>${adminOrderItemsHtml(o)}</div></div>
          ${o.delivery_data ? `<div class="delivery-box mt-12"><div class="delivery-box-title">Tổng dữ liệu giao</div><div class="delivery-data">${esc(o.delivery_data)}</div></div>` : ''}
        `, `Đơn: ${o.order_code}`);
      }
    };
    } catch (err) { content.innerHTML = `<div class="empty-state"><h3>Lỗi tải đơn hàng</h3><p class="text-muted">${err.message}</p></div>`; }
  };
  await refresh();
}


function showOrderStatusModal(orderId, currentStatus, refresh) {
  const labels = { pending: 'Đặt hàng', paid: 'Đã thanh toán', completed: 'Đã giao hàng', cancelled: 'Đã hủy', failed: 'Lỗi / hoàn tiền' };
  openModal(`
    <form id="order-status-form">
      <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-select" id="order-status-value">
        ${['pending', 'paid', 'completed', 'cancelled', 'failed'].map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${labels[s]}</option>`).join('')}
      </select><div class="form-hint">Chọn “Đã giao hàng” sẽ mở form nhập dữ liệu giao hàng.</div></div>
      <div id="order-delivery-fields" style="display:none">
        <div class="form-group"><label class="form-label">Dữ liệu giao hàng<span class="req">*</span></label><textarea class="form-textarea" id="order-delivery-data" rows="6" placeholder="username: ...\npassword: ..."></textarea><div class="form-hint">Thông tin giao cho khách</div></div>
      </div>
      <div class="form-group"><label class="form-label">Ghi chú</label><input class="form-input" id="order-status-note" placeholder="Ghi chú nội bộ / thông báo" /></div>
      <div id="order-status-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">Cập nhật</button><button type="button" class="btn btn-ghost" id="order-status-cancel">Hủy</button></div>
    </form>
  `, 'Cập nhật trạng thái đơn');
  const statusSelect = qs('#order-status-value');
  const deliveryFields = qs('#order-delivery-fields');
  const deliveryData = qs('#order-delivery-data');
  const syncDeliveryFields = () => {
    const show = statusSelect.value === 'completed' && currentStatus !== 'completed';
    deliveryFields.style.display = show ? 'block' : 'none';
    deliveryData.required = show;
  };
  statusSelect.onchange = syncDeliveryFields;
  syncDeliveryFields();
  qs('#order-status-cancel').onclick = closeModal;
  qs('#order-status-form').onsubmit = async (e) => {
    e.preventDefault();
    const newStatus = statusSelect.value;
    try {
      if (newStatus === 'completed' && currentStatus !== 'completed') {
        await apiFetch(`/orders/admin/${orderId}/deliver`, { method: 'PUT', body: JSON.stringify({ delivery_data: deliveryData.value, notes: qs('#order-status-note').value || null }) });
      } else {
        await apiFetch(`/orders/admin/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus, notes: qs('#order-status-note').value || null }) });
      }
      closeModal();
      toast('Đã cập nhật trạng thái', 'success');
      refresh();
    } catch (err) {
      const box = qs('#order-status-err');
      box.textContent = err.message;
      box.style.display = 'block';
    }
  };
}

function showDeliverModal(orderId, refresh) {
  openModal(`
    <form id="deliver-form">
      <div class="form-group"><label class="form-label">Dữ liệu giao hàng<span class="req">*</span></label><textarea class="form-textarea" id="deliver-data" rows="6" placeholder="username: ...\npassword: ..." required></textarea><div class="form-hint">Thông tin giao cho khách</div></div>
      <div class="form-group"><label class="form-label">Ghi chú</label><input class="form-input" id="deliver-note" placeholder="Hướng dẫn..." /></div>
      <div id="deliver-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-success flex-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Xác nhận giao</button><button type="button" class="btn btn-ghost" id="deliver-cancel">Hủy</button></div>
    </form>
  `, 'Giao hàng thủ công');
  qs('#deliver-cancel').onclick = closeModal;
  qs('#deliver-form').onsubmit = async (e) => {
    e.preventDefault();
    try { await apiFetch(`/orders/admin/${orderId}/deliver`, { method: 'PUT', body: JSON.stringify({ delivery_data: qs('#deliver-data').value, notes: qs('#deliver-note').value || null }) }); closeModal(); toast('Giao thành công!', 'success'); refresh(); }
    catch (err) { const e = qs('#deliver-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

// ADMIN STOCK
async function renderAdminStock(view) {
  if (!view) return;
  const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const products = await apiFetch('/products/admin/all');
    const autoProducts = products.filter(p => p.packages?.some(pkg => pkg.delivery_type === 'auto'));

    const tabs = [
      { key: 'premium', label: 'Premium', icon: 'fa-crown' },
      { key: 'game', label: 'Topup Game', icon: 'fa-gamepad' },
      { key: 'giftcard', label: 'Gift Card', icon: 'fa-gift' },
    ];

    const renderTable = (type) => {
      const filtered = autoProducts.filter(p => (p.product_type || 'premium') === type);
      if (!filtered.length) return `<tr><td colspan="5" class="text-center text-muted" style="padding:32px">Chưa có gói giao tự động nào cho loại này.</td></tr>`;
      let rows = '';
      filtered.forEach(p => {
        p.packages.filter(pk => pk.delivery_type === 'auto').forEach(pk => {
          rows += `<tr>
            <td class="text-muted">#${pk.id}</td>
            <td class="fw-600">${esc(p.name)}</td>
            <td><span class="badge badge-blue">${esc(pk.name)}</span></td>
            <td><span class="badge ${pk.stock_count > 0 ? 'badge-green' : 'badge-red'}">${pk.stock_count}</span></td>
            <td><button class="btn btn-sm btn-primary" data-viewstock="${pk.id}" data-pkgname="${encodeURIComponent(p.name + ' - ' + pk.name)}">Quản lý kho</button></td>
          </tr>`;
        });
      });
      return rows;
    };

    let html = `
      ${cuiPageHeader('Kho hàng', 'Theo dõi tồn kho và dữ liệu giao tự động')}
      <div class="admin-tabs mb-16">
        ${tabs.map((t, i) => `<button class="admin-tab ${i === 0 ? 'active' : ''}" data-stock-tab="${t.key}"><i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join('')}
      </div>
      ${tabs.map((t, i) => `
        <div class="stock-tab-pane" data-stock-pane="${t.key}" style="${i === 0 ? '' : 'display:none'}">
          <div class="card">
            <div class="card-header"><div class="card-title">${t.label}</div></div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>ID</th><th>Sản phẩm</th><th>Tên gói</th><th>Trong kho</th><th></th></tr></thead>
                <tbody>${renderTable(t.key)}</tbody>
              </table>
            </div>
          </div>
        </div>
      `).join('')}
    `;

    content.innerHTML = html;

    // Tab switching
    content.querySelectorAll('[data-stock-tab]').forEach(btn => {
      btn.onclick = () => {
        content.querySelectorAll('[data-stock-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        content.querySelectorAll('[data-stock-pane]').forEach(p => p.style.display = 'none');
        content.querySelector(`[data-stock-pane="${btn.dataset.stockTab}"]`).style.display = '';
      };
    });

    content.onclick = (e) => {
      const viewBtn = e.target.closest('[data-viewstock]');
      if (viewBtn) {
        showStockDetail(parseInt(viewBtn.dataset.viewstock), decodeURIComponent(viewBtn.dataset.pkgname), view);
        return;
      }
    };
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Lỗi tải kho hàng</h3><p class="text-muted">${err.message}</p></div>`;
  }
}

async function showStockDetail(pkgId, pkgName, view) {
  const content = view || qs('#app-view');
  if (!content) return;
  
  let currentStatus = 'all';
  let currentPage = 1;
  let itemsPerPage = 20;
  let searchQuery = '';
  let allItems = [];

  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const refresh = async () => {
    try {
      const items = await apiFetch(`/stock/package/${pkgId}`);
      allItems = items;
      renderDetailView();
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><h3>Lỗi tải dữ liệu</h3><p>${e.message}</p></div>`;
    }
  };

  const renderDetailView = () => {
    let filtered = allItems;
    if (searchQuery) filtered = filtered.filter(i => i.data.toLowerCase().includes(searchQuery.toLowerCase()));
    if (currentStatus !== 'all') filtered = filtered.filter(i => i.is_sold === (currentStatus === 'sold'));

    const totalStats = allItems.length;
    const soldStats = allItems.filter(i => i.is_sold).length;
    const availableStats = totalStats - soldStats;
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    content.innerHTML = `
      ${cuiPageHeader('Quản lý kho hàng <span class="text-danger-600">' + esc(pkgName) + '</span>', '', `
        <button class="btn btn-sm btn-ghost" id="btn-back"><i class="fa-solid fa-arrow-left"></i> Quay lại</button>
      `)}
      <div class="cui-page-actions-bar">
        <button class="btn btn-sm btn-success" id="btn-add-bulk"><i class="fa-solid fa-arrow-right-to-bracket"></i> Nhập hàng loạt</button>
        <label class="btn btn-sm btn-purple">
          <i class="fa-solid fa-file-csv"></i> Nhập từ CSV
          <input type="file" id="file-csv" accept=".csv" style="display:none;">
        </label>
        <label class="btn btn-sm btn-info">
          <i class="fa-solid fa-file-lines"></i> Nhập từ TXT
          <input type="file" id="file-txt" accept=".txt" style="display:none;">
        </label>
        <button class="btn btn-sm btn-warning" id="btn-export"><i class="fa-solid fa-file-export"></i> Xuất kho hàng</button>
        <button class="btn btn-sm btn-outline-danger" id="btn-delete-all"><i class="fa-solid fa-trash-can"></i> Xóa toàn bộ</button>
      </div>
      <div class="stats-grid mb-16">
        <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-boxes-stacked"></i></div><div class="stat-info"><div class="stat-label">Tổng số lượng</div><div class="stat-value">${totalStats}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-check"></i></div><div class="stat-info"><div class="stat-label">Còn hàng</div><div class="stat-value">${availableStats}</div></div></div>
        <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-xmark"></i></div><div class="stat-info"><div class="stat-label">Đã bán</div><div class="stat-value">${soldStats}</div></div></div>
      </div>
      <div class="stock-detail-layout">
        <div class="card stock-filter-card">
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Tìm kiếm</label>
              <input type="text" class="form-input" id="f-stock-search" placeholder="Nhập giá trị kho hàng..." value="${esc(searchQuery)}">
            </div>
            <div class="form-group">
              <label class="form-label">Trạng thái</label>
              <select class="form-select" id="f-stock-status"><option value="all" ${currentStatus==='all'?'selected':''}>Tất cả</option><option value="available" ${currentStatus==='available'?'selected':''}>Còn hàng</option><option value="sold" ${currentStatus==='sold'?'selected':''}>Đã bán</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Số lượng/trang</label>
              <select class="form-select" id="f-stock-limit"><option value="20" ${itemsPerPage===20?'selected':''}>20</option><option value="50" ${itemsPerPage===50?'selected':''}>50</option><option value="100" ${itemsPerPage===100?'selected':''}>100</option></select>
            </div>
            <div class="stock-filter-btns">
              <button class="btn btn-sm btn-primary" id="btn-stock-filter"><i class="fa-solid fa-filter"></i> Lọc</button>
              <button class="btn btn-sm btn-ghost" id="btn-stock-reset"><i class="fa-solid fa-xmark"></i> Bỏ lọc</button>
            </div>
          </div>
        </div>
        <div class="card stock-table-card">
          <div class="table-wrap"><table><thead><tr><th style="width:40px;"><input type="checkbox" id="cb-all-stock"></th><th style="width:80px;">ID</th><th>Giá trị kho hàng</th><th style="width:120px;">Trạng thái</th><th style="width:160px;">Ngày tạo</th></tr></thead><tbody>${paginated.length ? paginated.map(i => `<tr><td><input type="checkbox" class="cb-stock" value="${i.id}"></td><td class="fw-700 text-danger-600">${i.id}</td><td><code class="stock-data-cell">${esc(i.data)}</code></td><td>${i.is_sold ? '<span class="badge badge-red">Đã bán</span>' : '<span class="badge badge-green">Còn hàng</span>'}</td><td class="text-muted text-sm">${fmtDate(i.created_at)}</td></tr>`).join('') : '<tr><td colspan="5" class="text-center text-muted" style="padding:40px;">Không tìm thấy dữ liệu phù hợp.</td></tr>'}</tbody></table></div>
          ${totalPages > 1 ? `<div class="stock-pagination"><button class="btn btn-sm btn-outline" id="btn-prev" ${currentPage === 1 ? 'disabled' : ''}>Trước</button><span class="stock-page-info">${currentPage} / ${totalPages}</span><button class="btn btn-sm btn-outline" id="btn-next" ${currentPage === totalPages ? 'disabled' : ''}>Sau</button></div>` : ''}
        </div>
      </div>
    `;

    qs('#btn-back', content).onclick = () => renderAdminStock(content);
    qs('#btn-stock-filter', content).onclick = () => { searchQuery = qs('#f-stock-search', content).value.trim(); currentStatus = qs('#f-stock-status', content).value; itemsPerPage = parseInt(qs('#f-stock-limit', content).value) || 20; currentPage = 1; renderDetailView(); };
    qs('#btn-stock-reset', content).onclick = () => { searchQuery = ''; currentStatus = 'all'; itemsPerPage = 20; currentPage = 1; renderDetailView(); };
    const btnPrev = qs('#btn-prev', content); if (btnPrev) btnPrev.onclick = () => { if (currentPage > 1) { currentPage--; renderDetailView(); } };
    const btnNext = qs('#btn-next', content); if (btnNext) btnNext.onclick = () => { if (currentPage < totalPages) { currentPage++; renderDetailView(); } };

    const cbAll = qs('#cb-all-stock', content);
    const cbList = qsa('.cb-stock', content);
    if (cbAll) {
      cbAll.onchange = (e) => { cbList.forEach(cb => cb.checked = e.target.checked); };
      cbList.forEach(cb => { cb.onchange = () => { if (!cb.checked) cbAll.checked = false; }; });
    }

    qs('#btn-add-bulk', content).onclick = () => {
      openModal(`<div class="form-group"><label class="form-label" style="margin-bottom:6px">Nhập thủ công (1 dòng / 1 item)</label><textarea class="form-textarea" id="bulk-stock-input" rows="10" placeholder="account1@gmail.com:pass1
account2@gmail.com:pass2"></textarea></div><div class="flex gap-8"><button class="btn btn-primary flex-1" id="btn-submit-bulk">+ Lưu vào kho</button><button class="btn btn-ghost" onclick="closeModal()">Hủy</button></div>`, 'Nhập hàng loạt');
      qs('#btn-submit-bulk').onclick = async () => {
        const txt = qs('#bulk-stock-input').value.trim();
        if (!txt) return;
        try {
          const res = await apiFetch('/stock/bulk', { method: 'POST', body: JSON.stringify({ package_id: pkgId, items: txt }) });
          toast(`Đã thêm ${res.added} mục`, 'success');
          closeModal();
          refresh();
        } catch (err) { toast(err.message, 'error'); }
      };
    };

    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const txt = ev.target.result.trim();
        if (!txt) return toast('File rỗng', 'error');
        try {
          const res = await apiFetch('/stock/bulk', { method: 'POST', body: JSON.stringify({ package_id: pkgId, items: txt }) });
          toast(`Đã nạp ${res.added} mục từ file`, 'success');
          refresh();
        } catch (err) { toast(err.message, 'error'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    qs('#file-csv', content).onchange = handleFileUpload;
    qs('#file-txt', content).onchange = handleFileUpload;

    qs('#btn-export', content).onclick = () => {
      if (!allItems.length) return toast('Kho trống', 'warning');
      const lines = allItems.map(i => i.data).join('\\n');
      const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `export-stock-${pkgId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    qs('#btn-delete-all', content).onclick = async () => {
      const selected = [...qsa('.cb-stock:checked', content)].map(cb => parseInt(cb.value)).filter(Boolean);
      if (!selected.length) {
        toast('Chọn ít nhất một mục để xóa', 'warning');
        return;
      }
      if (!confirm(`Xóa ${selected.length} mục đã chọn?`)) return;
      try {
        await Promise.all(selected.map(id => apiFetch(`/stock/${id}`, { method: 'DELETE' })));
        toast(`Đã xóa ${selected.length} mục`, 'success');
        refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  };

  await refresh();
}

async function showManagedStockDetail(pkgId, pkgName, currentQty) {
  const detail = qs('#stock-detail');
  if (!detail) return;

  const refresh = async () => {
    const products = await apiFetch('/products/admin/all');
    let pkg = null;
    for (const p of products) {
      pkg = p.packages?.find(pk => pk.id === pkgId);
      if (pkg) break;
    }

    const qty = pkg?.stock_quantity ?? currentQty;
    const badge = qty <= 0 ? '🔴 Hết hàng' : qty <= 5 ? '🟠 Sắp hết' : '🟢 Còn hàng';
    detail.innerHTML = `
      <div class="fw-600 mb-8">${pkgName} — Quản lý kho</div>
      <div class="card p-16 mb-16">
        <div class="flex items-center gap-12 mb-12">
          <div class="text-2xl fw-700">${qty}</div>
          <div>${badge}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Cập nhật số lượng tồn kho</label>
          <div class="flex gap-8">
            <input type="number" class="form-input" id="managed-stock-qty" min="0" value="${qty}" style="max-width:160px" />
            <button class="btn btn-primary" id="btn-update-managed-stock">Cập nhật</button>
          </div>
        </div>
      </div>
    `;

    qs('#btn-update-managed-stock', detail).onclick = async () => {
      const newQty = parseInt(qs('#managed-stock-qty', detail).value) || 0;
      try {
        await apiFetch(`/products/packages/${pkgId}`, { method: 'PUT', body: JSON.stringify({ stock_quantity: newQty }) });
        toast('Đã cập nhật số lượng', 'success');
        await refresh();
        await renderAdminStock(qs('#app-view'));
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  };

  await refresh();
}

// ADMIN SETTINGS
async function renderAdminSettings(view) {
  if (!view) return;
  const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const [legacy, unified, dbSettings] = await Promise.all([
      apiFetch('/admin/settings'),
      apiFetch('/admin/settings/unified').catch(() => ({})),
      apiFetch('/admin/settings/database').catch(() => ({}))
    ]);

    const g = unified.settings_general || {};
    const ap = unified.settings_appearance || {};
    const sc = unified.settings_scripts || {};
    const im = unified.settings_images || {};
    const se = unified.settings_security || {};
    const ca = unified.settings_captcha || {};
    const fe = unified.settings_features || {};
    const lo = unified.settings_loyalty || {};
    const dbCfg = dbSettings.providers || {};

  // Helper: escape HTML
  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // Helper: toggle row HTML
  const toggleRow = (id, label, desc, checked) => `
    <div class="settings-toggle-row">
      <div><div class="settings-toggle-label">${label}</div>${desc ? `<div class="settings-toggle-desc">${desc}</div>` : ''}</div>
      <label class="toggle-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="toggle-slider"></span></label>
    </div>`;

  // Helper: form field
  const field = (id, label, val, opts = {}) => `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}</label>
      ${opts.type === 'textarea'
        ? `<textarea class="form-input form-textarea" id="${id}" placeholder="${esc(opts.placeholder || '')}" rows="${opts.rows || 4}">${esc(val)}</textarea>`
        : opts.type === 'select'
          ? `<select class="form-select" id="${id}">${(opts.options || []).map(o => `<option value="${o.value}" ${String(val) === String(o.value) ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`
          : `<input class="form-input" id="${id}" type="${opts.type || 'text'}" value="${esc(val)}" placeholder="${esc(opts.placeholder || '')}" ${opts.step ? `step="${opts.step}"` : ''} />`
      }
    </div>`;

  const tabs = [
    { id: 'general', label: 'Chung', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
    { id: 'appearance', label: 'Giao diện', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>' },
    { id: 'scripts', label: 'Scripts', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
    { id: 'images', label: 'Hình ảnh', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
    { id: 'security', label: 'Bảo mật', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    { id: 'captcha', label: 'Captcha', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { id: 'features', label: 'Chức năng', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
    { id: 'loyalty', label: 'Điểm thưởng', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>' },
    { id: 'database', label: 'Database', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>' },
    { id: 'ai', label: 'AI', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.09 3.26L16.36 6.4l-2.63 2.09.64 3.51L12 10.24 9.63 12l.64-3.51L7.64 6.4l3.27-1.14z"/><path d="M5 19l1.5-4.5L2 12l4.5-1.5L5 5l1.5 4.5L12 8l-1.5 4.5L12 19l-1.5-4.5L5 19z"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/></svg>' },
  ];

  content.innerHTML = `
    ${cuiPageHeader('Cài đặt hệ thống', 'Thiết lập hệ thống, giao diện và tính năng')}
    <div class="admin-tabs" role="tablist">
      ${tabs.map((t, i) => `<button class="admin-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}" role="tab" aria-selected="${i === 0}">${t.icon} ${t.label}</button>`).join('')}
    </div>

    <form id="settings-unified-form">
      <!-- ═══ General ═══ -->
      <div class="settings-section active" data-section="general">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Cài đặt chung
          </div>
          ${field('g-title', 'Tiêu đề trang', g.title, { placeholder: 'Tên website của bạn' })}
          ${field('g-description', 'Mô tả trang', g.description, { placeholder: 'Mô tả ngắn gọn về website' })}
          ${field('g-site-description', 'Mô tả chân trang (Footer)', g.site_description, { type: 'textarea', rows: 3, placeholder: 'Mô tả hiển thị ở chân trang, ví dụ: Chúng tôi tự hào cung cấp...' })}
          ${field('g-seo-title', 'SEO title mặc định', g.seo_title, { placeholder: 'Tên hiển thị trên tab trình duyệt và chia sẻ mặc định' })}
          ${field('g-seo-description', 'SEO description mặc định', g.seo_description, { type: 'textarea', rows: 3, placeholder: 'Mô tả mặc định cho meta description và social preview' })}
          ${field('g-seo-keywords', 'SEO keywords', g.seo_keywords || g.keywords, { placeholder: 'shop, digital, key, game' })}
          ${field('g-seo-author', 'SEO author', g.seo_author || g.author, { placeholder: 'Tên thương hiệu hoặc tác giả' })}
          ${field('g-site-url', 'URL website chuẩn', g.site_url, { placeholder: 'https://example.com' })}
          ${field('g-twitter-card', 'Twitter card', g.twitter_card || 'summary_large_image', {
            type: 'select',
            options: [
              { value: 'summary_large_image', label: 'summary_large_image' },
              { value: 'summary', label: 'summary' },
            ]
          })}
          ${field('g-copyright', 'Copyright Text', g.copyright_text, { placeholder: 'Copyright © 2024. All rights reserved.' })}
          ${field('g-keywords', 'Từ khóa (legacy)', g.keywords, { placeholder: 'shop, digital, key, game' })}
          ${field('g-author', 'Tác giả (legacy)', g.author, { placeholder: 'Tên tác giả' })}
          ${field('g-timezone', 'Múi giờ (Timezone)', g.timezone, {
            type: 'select',
            options: [
              { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (UTC+7)' },
              { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+7)' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
              { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
              { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
              { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
              { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
              { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
              { value: 'UTC', label: 'UTC' },
            ]
          })}
        </div>
        
        <div class="settings-card mt-16">
          <div class="settings-section-title"><i class="fa-solid fa-address-book"></i> Thông tin liên hệ (Hỗ trợ)</div>
          ${field('g-contact-email', 'Email hỗ trợ', g.contact_email, { placeholder: 'support@example.com' })}
          ${field('g-contact-phone', 'Hotline', g.contact_phone, { placeholder: '1900 xxxx' })}
          ${field('g-contact-hours', 'Giờ làm việc', g.contact_hours, { placeholder: '8:00 - 22:00' })}
          ${field('g-social-fb', 'Facebook Link', g.social_fb, { placeholder: 'https://facebook.com/...' })}
          ${field('g-social-tele', 'Telegram Link', g.social_tele, { placeholder: 'https://t.me/...' })}
          ${field('g-social-discord', 'Discord Link', g.social_discord, { placeholder: 'https://discord.gg/...' })}
        </div>

        <div class="settings-card mt-16">
          <div class="settings-section-title"><i class="fa-solid fa-coins"></i> Tiền tệ & Thuế</div>
          ${field('g-currency-name', 'Tên tiền tệ', g.currency_name, { placeholder: 'Ví dụ: VNĐ, Candy, Coin...' })}
          <div class="form-group">
            <label class="form-label">Icon tiền tệ</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input class="form-input flex-1" id="g-currency-icon" value="${esc(g.currency_icon || '')}" placeholder="URL hoặc upload ảnh" />
              ${imageUploadControl('g-currency-icon', 'g-currency-icon-upload', 'Upload', 'g-currency-icon-preview')}
            </div>
            <div class="admin-upload-preview" id="g-currency-icon-preview" style="margin-top:8px">${g.currency_icon ? `<img src="${esc(g.currency_icon)}" alt="Icon preview" style="max-height:48px" />` : '<span>Chưa có icon</span>'}</div>
          </div>
          ${field('g-tax-rate', 'Thuế VAT (%)', g.tax_rate, { type: 'number', placeholder: 'Ví dụ: 8 hoặc 10 (để 0 nếu không thu thuế)' })}
        </div>
      </div>

      <!-- ═══ Appearance ═══ -->
      <div class="settings-section" data-section="appearance">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Giao diện & Hiển thị
          </div>
          ${toggleRow('ap-show-slider', 'Hiển thị Slider', 'Bật/tắt slider trên trang chủ', ap.show_slider !== false)}
          ${toggleRow('ap-show-banner', 'Hiển thị Banner', 'Bật/tắt banner quảng cáo', ap.show_banner !== false)}
          ${toggleRow('ap-show-viewed', 'Hiển thị Sản phẩm đã xem', 'Hiển thị section sản phẩm đã xem gần đây', ap.show_viewed !== false)}
        </div>
        <div class="settings-card mt-16">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Danh mục hiển thị trên Trang chủ
          </div>
          <p class="text-muted text-sm mb-16">Chọn các danh mục sẽ hiển thị sản phẩm trên trang chủ. Kéo để sắp xếp thứ tự.</p>
          <div class="home-cat-picker" id="home-cat-picker">
            ${categories.map(c => {
              const checked = (ap.home_categories || '').split(',').map(s => s.trim()).includes(c.slug);
              const iconUrl = c.image_url || c.icon_url;
              const iconHtml = iconUrl ? `<img src="${esc(iconUrl)}" style="width:20px;height:20px;object-fit:contain;border-radius:4px;" />` : '<i class="fa-solid fa-folder" style="font-size:16px;color:var(--text-muted)"></i>';
              let html = `<label class="home-cat-item${checked ? ' selected' : ''}"><input type="checkbox" value="${c.slug}" ${checked ? 'checked' : ''} />${iconHtml}<span>${esc(c.name)}</span></label>`;
              if (c.children?.length) {
                c.children.forEach(sub => {
                  const subChecked = (ap.home_categories || '').split(',').map(s => s.trim()).includes(sub.slug);
                  const subIconUrl = sub.image_url || sub.icon_url;
                  const subIconHtml = subIconUrl ? `<img src="${esc(subIconUrl)}" style="width:18px;height:18px;object-fit:contain;border-radius:4px;" />` : '<i class="fa-solid fa-folder-open" style="font-size:14px;color:var(--text-muted)"></i>';
                  html += `<label class="home-cat-item home-cat-item-sub${subChecked ? ' selected' : ''}" style="padding-left:32px;font-size:13px;"><input type="checkbox" value="${sub.slug}" ${subChecked ? 'checked' : ''} /><span style="color:var(--text-muted);margin-right:4px;">↳</span>${subIconHtml}<span>${esc(sub.name)}</span></label>`;
                });
              }
              return html;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- ═══ Scripts ═══ -->
      <div class="settings-section" data-section="scripts">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Scripts & HTML tùy chỉnh
          </div>
          ${field('sc-header', 'Script/HTML Header (Trang Khách)', sc.header_script, { type: 'textarea', rows: 6, placeholder: '<script>...</script> hoặc HTML chèn vào <head>' })}
          ${field('sc-footer', 'Script/HTML Footer (Trang Khách)', sc.footer_script, { type: 'textarea', rows: 6, placeholder: '<script>...</script> hoặc HTML chèn trước </body>' })}
        </div>
      </div>

      <!-- ═══ Images ═══ -->
      <div class="settings-section" data-section="images">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Hình ảnh
          </div>
          <div class="settings-image-grid">
            <div class="settings-image-field">
              <div class="image-field-row">
                ${field('im-logo', 'Logo URL', im.logo_url, { placeholder: 'https://example.com/logo.png' })}
                ${imageUploadControl('im-logo', 'im-logo-upload', 'Upload', 'im-logo-preview')}
              </div>
              <div class="settings-image-preview-wrap">
                <div class="settings-image-preview-label">Xem trước logo</div>
                <div class="settings-image-preview" id="im-logo-preview">${im.logo_url ? `<img src="${esc(im.logo_url)}" alt="Logo preview" />` : '<span>Chưa có ảnh</span>'}</div>
              </div>
            </div>
            <div class="settings-image-field">
              <div class="image-field-row">
                ${field('im-favicon', 'Favicon URL', im.favicon_url, { placeholder: 'https://example.com/favicon.ico' })}
                ${imageUploadControl('im-favicon', 'im-favicon-upload', 'Upload', 'im-favicon-preview')}
              </div>
              <div class="settings-image-preview-wrap">
                <div class="settings-image-preview-label">Xem trước favicon</div>
                <div class="settings-image-preview settings-image-preview-favicon" id="im-favicon-preview">${im.favicon_url ? `<img src="${esc(im.favicon_url)}" alt="Favicon preview" />` : '<span>Chưa có ảnh</span>'}</div>
              </div>
            </div>
            <div class="settings-image-field">
              <div class="image-field-row">
                ${field('im-default', 'Default Image URL', im.default_image_url, { placeholder: 'https://example.com/default.png' })}
                ${imageUploadControl('im-default', 'im-default-upload', 'Upload', 'im-default-preview')}
              </div>
              <div class="settings-image-preview-wrap">
                <div class="settings-image-preview-label">Xem trước ảnh mặc định</div>
                <div class="settings-image-preview" id="im-default-preview">${im.default_image_url ? `<img src="${esc(im.default_image_url)}" alt="Default image preview" />` : '<span>Chưa có ảnh</span>'}</div>
              </div>
            </div>
            <div class="settings-image-field">
              <div class="image-field-row">
                ${field('im-seo', 'SEO / Social Image URL', im.seo_image_url || im.default_image_url, { placeholder: 'https://example.com/seo-share.png' })}
                ${imageUploadControl('im-seo', 'im-seo-upload', 'Upload', 'im-seo-preview')}
              </div>
              <div class="settings-image-preview-wrap">
                <div class="settings-image-preview-label">Xem trước ảnh SEO / chia sẻ</div>
                <div class="settings-image-preview" id="im-seo-preview">${(im.seo_image_url || im.default_image_url) ? `<img src="${esc(im.seo_image_url || im.default_image_url)}" alt="SEO image preview" />` : '<span>Chưa có ảnh</span>'}</div>
              </div>
            </div>
            <div class="settings-image-field">
              <div class="image-field-row">
                ${field('im-avatar', 'Default Avatar URL', im.default_avatar_url, { placeholder: 'https://example.com/avatar.png' })}
                ${imageUploadControl('im-avatar', 'im-avatar-upload', 'Upload', 'im-avatar-preview')}
              </div>
              <div class="settings-image-preview-wrap">
                <div class="settings-image-preview-label">Xem trước avatar</div>
                <div class="settings-image-preview settings-image-preview-avatar" id="im-avatar-preview">${im.default_avatar_url ? `<img src="${esc(im.default_avatar_url)}" alt="Avatar preview" />` : '<span>Chưa có ảnh</span>'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Security ═══ -->
      <div class="settings-section" data-section="security">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Bảo mật & Khóa IP
          </div>
          <p class="text-muted text-sm mb-16">Cấu hình các giới hạn bảo mật. Đặt 0 để vô hiệu hóa.</p>
          <div class="settings-row">
            ${field('se-lock-login', 'Khóa IP nếu đăng nhập sai (lần)', se.lock_ip_login_fail, { type: 'number', placeholder: '5' })}
            ${field('se-lock-pass', 'Khóa tài khoản nếu sai pass (lần)', se.lock_account_pass_fail, { type: 'number', placeholder: '5' })}
          </div>
          <div class="settings-row">
            ${field('se-lock-api', 'Khóa IP nếu sai API KEY (lần)', se.lock_ip_api_fail, { type: 'number', placeholder: '5' })}
            ${field('se-lock-2fa', 'Khóa IP nếu sai 2FA/OTP (lần)', se.lock_ip_2fa_fail, { type: 'number', placeholder: '5' })}
          </div>
          <div class="settings-row">
            ${field('se-lock-invoice', 'Khóa IP nếu tạo hóa đơn spam (lần)', se.lock_ip_invoice_spam, { type: 'number', placeholder: '5' })}
            ${field('se-lock-forgot', 'Khóa IP nếu spam quên mật khẩu (lần)', se.lock_ip_forgot_spam, { type: 'number', placeholder: '5' })}
          </div>
          <div class="settings-row">
            ${field('se-lock-admin', 'Khóa IP truy cập Admin trái phép (lần)', se.lock_ip_admin_illegal, { type: 'number', placeholder: '5' })}
            ${field('se-max-accounts', 'Số tài khoản tối đa trên 1 IP', se.max_accounts_per_ip, { type: 'number', placeholder: '3' })}
          </div>
          <div class="settings-row">
            ${field('se-login-duration', 'Thời gian lưu đăng nhập (giây)', se.login_duration, { type: 'number', placeholder: '2592000' })}
            ${field('se-cron-secret', 'Mã bí mật Cron Job', se.cron_secret, { placeholder: 'Nhập mã bí mật' })}
          </div>
          ${field('se-admin-path', 'Đường dẫn Admin Panel', se.admin_path, { placeholder: 'admin' })}
        </div>
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Bảo mật nâng cao
          </div>
          ${toggleRow('se-admin-one-ip', 'Chỉ cho phép Admin từ 1 IP', 'Giới hạn truy cập admin chỉ từ 1 IP duy nhất', se.admin_one_ip === true)}
          ${toggleRow('se-admin-one-device', 'Chỉ cho phép Admin từ 1 thiết bị', 'Mỗi tài khoản admin chỉ đăng nhập trên 1 thiết bị', se.admin_one_device === true)}
          ${toggleRow('se-client-one-device', 'Chỉ cho phép Client từ 1 thiết bị', 'Mỗi tài khoản client chỉ đăng nhập trên 1 thiết bị', se.client_one_device === true)}
          ${toggleRow('se-hide-admin-btn', 'Ẩn nút truy cập Admin Panel', 'Ẩn nút Admin trên giao diện trang khách', se.hide_admin_button === true)}
          ${toggleRow('se-strong-pass', 'Bắt buộc mật khẩu phức tạp', 'Yêu cầu mật khẩu có chữ hoa, chữ thường, số và ký tự đặc biệt', se.strong_password === true)}
        </div>
      </div>

      <!-- ═══ Captcha ═══ -->
      <div class="settings-section" data-section="captcha">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Cấu hình Captcha
          </div>
          ${toggleRow('ca-enabled', 'Bật Captcha', 'Kích hoạt xác minh Captcha trên các form', ca.enabled === true)}
          <div class="divider"></div>
          ${field('ca-type', 'Loại Captcha', ca.type, {
            type: 'select',
            options: [
              { value: '', label: '— Chọn loại Captcha —' },
              { value: 'recaptcha_v2', label: 'reCAPTCHA v2' },
              { value: 'recaptcha_v3', label: 'reCAPTCHA v3' },
              { value: 'turnstile', label: 'Cloudflare Turnstile' },
              { value: 'hcaptcha', label: 'hCaptcha' },
            ]
          })}
          ${field('ca-site-key', 'Site Key', ca.site_key, { placeholder: 'Nhập Site Key' })}
          ${field('ca-secret-key', 'Secret Key', ca.secret_key, { type: 'password', placeholder: 'Nhập Secret Key' })}
        </div>
      </div>

      <!-- ═══ Features ═══ -->
      <div class="settings-section" data-section="features">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Bật / Tắt chức năng
          </div>
          <p class="text-muted text-sm mb-16">Tắt chức năng sẽ ẩn trên giao diện và chặn truy cập API tương ứng.</p>
          ${toggleRow('fe-blog', 'Blog', 'Trang blog và bài viết', fe.blog !== false)}
          ${toggleRow('fe-offers', 'Ưu đãi / Gift Code', 'Trang ưu đãi và mã giảm giá công khai', fe.offers !== false)}
          ${toggleRow('fe-affiliate', 'Affiliate / Giới thiệu', 'Chương trình giới thiệu bạn bè & hoa hồng', fe.affiliate !== false)}
          ${toggleRow('fe-support', 'Hỗ trợ / Tickets', 'Trang hỗ trợ, tạo ticket và support pages', fe.support !== false)}
          ${toggleRow('fe-flash_sales', 'Flash Sale', 'Flash sale trên trang chủ', fe.flash_sales !== false)}
          ${toggleRow('fe-reviews', 'Đánh giá sản phẩm', 'Đánh giá & nhận xét trên chi tiết sản phẩm', fe.reviews !== false)}
          ${toggleRow('fe-announcements', 'Thông báo', 'Mục thông báo trên trang chủ', fe.announcements !== false)}
          ${toggleRow('fe-balance', 'Số dư / Nạp tiền', 'Hệ thống số dư và nạp tiền', fe.balance !== false)}
          ${toggleRow('fe-api_docs', 'Tài liệu API / API Keys', 'Cho phép dev tạo API key & xem tài liệu (yêu cầu bật Số dư)', fe.api_docs === true && fe.balance !== false)}
          ${toggleRow('fe-wishlist', 'Yêu thích', 'Tính năng yêu thích sản phẩm', fe.wishlist !== false)}
        </div>
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Chế độ bảo trì
          </div>
          <p class="text-muted text-sm mb-16">Khi bật, khách và người dùng thường không đăng nhập/đăng ký được và thấy trang bảo trì. Chỉ <strong>nhân viên &amp; admin</strong> mới truy cập được.</p>
          ${toggleRow('fe-maintenance', 'Bật bảo trì website', 'Chỉ nhân viên & admin đăng nhập được', fe.maintenance === true)}
          ${field('fe-maintenance-msg', 'Thông báo hiển thị cho khách', fe.maintenance_message || '', { type: 'textarea', rows: 3, placeholder: 'VD: Website đang bảo trì, vui lòng quay lại sau ít phút.' })}
        </div>
      </div>

      <!-- ═══ Loyalty / Điểm thưởng ═══ -->
      <div class="settings-section" data-section="loyalty">
        <div class="settings-card">
          <div class="settings-section-title"><i class="fa-solid fa-gift"></i> Điểm thưởng / Hạng thành viên</div>
          <p class="text-muted text-sm mb-16">Khách tích điểm khi đơn hoàn tất và đổi điểm thành tiền giảm khi đặt đơn.</p>
          ${toggleRow('lo-enabled', 'Bật điểm thưởng', 'Cho phép tích & đổi điểm', lo.enabled === true)}
          ${field('lo-earn-per', 'Số tiền (đồng) để được 1 điểm', lo.earn_per ?? 1000, { type: 'number', placeholder: 'VD: 1000 → 1 điểm/1.000đ' })}
          ${field('lo-redeem-value', '1 điểm đổi được (đồng)', lo.redeem_value ?? 100, { type: 'number', placeholder: 'VD: 100 → 1 điểm = 100đ' })}
          ${field('lo-min-redeem', 'Điểm tối thiểu mỗi lần đổi', lo.min_redeem ?? 100, { type: 'number', placeholder: 'VD: 100' })}
          ${field('lo-max-percent', '% tối đa của đơn được trả bằng điểm', lo.max_percent ?? 50, { type: 'number', placeholder: 'VD: 50' })}
        </div>
      </div>

      <!-- ═══ Database ═══ -->
      <div class="settings-section" data-section="database">
        <div class="settings-card">
          <div class="settings-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            Database provider
          </div>
          <div class="form-group">
            <label class="form-label" for="db-active-provider">Provider đang active</label>
            <select class="form-select" id="db-active-provider">
              <option value="postgres" ${dbSettings.active_provider === 'postgres' ? 'selected' : ''}>Neon/Postgres</option>
              <option value="mysql" ${dbSettings.active_provider === 'mysql' ? 'selected' : ''}>MySQL</option>
              <option value="supabase_postgres" ${dbSettings.active_provider === 'supabase_postgres' ? 'selected' : ''}>Supabase Postgres</option>
            </select>
            <div class="form-hint">Phase hiện tại chỉ hỗ trợ 1 SQL provider active tại một thời điểm.</div>
          </div>
        </div>

        ${['postgres', 'mysql', 'supabase_postgres'].map((provider) => {
          const item = dbCfg[provider] || {};
          const title = item.label || provider;
          const statusBadge = item.has_env_override
            ? '<span class="badge badge-green">ENV override</span>'
            : item.has_stored_url
              ? '<span class="badge badge-gray">Stored config</span>'
              : '<span class="badge badge-gray">Chưa cấu hình</span>';
          return `
            <div class="settings-card mt-16">
              <div class="settings-section-title">
                <span>${title}</span>
                <span>${statusBadge}</span>
              </div>
              <div class="settings-row">
                <div class="form-group">
                  <label class="form-label" for="db-${provider}-enabled">Bật provider</label>
                  <select class="form-select" id="db-${provider}-enabled">
                    <option value="true" ${item.enabled ? 'selected' : ''}>Bật</option>
                    <option value="false" ${!item.enabled ? 'selected' : ''}>Tắt</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Nguồn hiện tại</label>
                  <input class="form-input" value="${esc(item.env_source || (item.has_stored_url ? 'stored_config' : ''))}" disabled />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="db-${provider}-url">Database URL</label>
                <input class="form-input" id="db-${provider}-url" type="password" value="" placeholder="${esc(item.masked_url || 'Nhập connection string nếu muốn lưu fallback')}" />
                <div class="form-hint">URL thật không được trả về UI. Để trống nếu không muốn thay đổi giá trị đã lưu.</div>
              </div>
              <div class="settings-row">
                <div class="form-group">
                  <label class="form-label">Host</label>
                  <input class="form-input" value="${esc(item.host || '')}" disabled />
                </div>
                <div class="form-group">
                  <label class="form-label">Database</label>
                  <input class="form-input" value="${esc(item.database_name || '')}" disabled />
                </div>
              </div>
              <div class="settings-row">
                <button type="button" class="btn btn-ghost" data-db-test="${provider}">Test connection</button>
                <div class="form-hint" id="db-${provider}-test-result">${item.masked_url ? `Current: ${esc(item.masked_url)}` : 'Chưa có URL hiệu lực'}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Save bar -->
      <div class="settings-save-bar">
        <button type="button" class="btn btn-ghost" id="btn-reset-settings">Hoàn tác</button>
        <button type="submit" class="btn btn-primary btn-lg">Lưu cài đặt</button>
      </div>
    </form>

    <!-- ═══ AI Config (outside main form) ═══ -->
    <div class="settings-section" data-section="ai">
      <div class="settings-card">
        <div class="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.09 3.26L16.36 6.4l-2.63 2.09.64 3.51L12 10.24 9.63 12l.64-3.51L7.64 6.4l3.27-1.14z"/><path d="M5 19l1.5-4.5L2 12l4.5-1.5L5 5l1.5 4.5L12 8l-1.5 4.5L12 19l-1.5-4.5L5 19z"/></svg>
          Cấu hình AI tự động viết nội dung
        </div>
        <div id="ai-config-area">Đang tải...</div>
      </div>
    </div>
  `;

  // ── Tab switching ──
  qsa('.admin-tab', content).forEach(tab => {
    tab.onclick = () => {
      qsa('.admin-tab', content).forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      qsa('.settings-section', content).forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const section = qs(`.settings-section[data-section="${tab.dataset.tab}"]`, content);
      if (section) section.classList.add('active');
    };
  });

  // ── Home category picker toggle ──
  const picker = qs('#home-cat-picker', content);
  if (picker) {
    picker.addEventListener('change', (e) => {
      const label = e.target.closest('.home-cat-item');
      if (label) label.classList.toggle('selected', e.target.checked);
    });
  }

  // ── Balance → API Docs dependency ──
  const feBalanceCb = qs('#fe-balance', content);
  const feApiDocsCb = qs('#fe-api_docs', content);
  if (feBalanceCb && feApiDocsCb) {
    feApiDocsCb.addEventListener('change', (e) => {
      if (e.target.checked && !feBalanceCb.checked) {
        feBalanceCb.checked = true;
        toast('Đã tự động bật Số dư vì Tài liệu API yêu cầu tính năng này', 'info');
      }
    });
    feBalanceCb.addEventListener('change', (e) => {
      if (!e.target.checked && feApiDocsCb.checked) {
        feApiDocsCb.checked = false;
      }
    });
  }

  // ── Reset button ──
  qs('#btn-reset-settings', content).onclick = () => {
    renderAdminSettings(view);
  };

  // ── Save handler ──
  const bindImagePreview = (inputId, previewId, emptyText = 'Chưa có ảnh', mode = 'contain') => {
    const input = qs(`#${inputId}`, content);
    const preview = qs(`#${previewId}`, content);
    if (!input || !preview) return;
    const renderPreview = () => {
      const url = input.value.trim();
      if (!url) {
        preview.innerHTML = `<span>${emptyText}</span>`;
        return;
      }
      const img = new Image();
      img.alt = 'preview';
      img.onload = () => {
        img.style.display = 'block';
        img.style.maxWidth = '100%';
        img.style.maxHeight = mode === 'favicon' ? '48px' : '180px';
        img.style.objectFit = mode === 'avatar' ? 'cover' : 'contain';
        if (mode === 'avatar') {
          img.style.width = '96px';
          img.style.height = '96px';
          img.style.borderRadius = '999px';
        } else if (mode === 'favicon') {
          img.style.width = '48px';
          img.style.height = '48px';
        }
        preview.innerHTML = '';
        preview.appendChild(img);
      };
      img.onerror = () => {
        preview.innerHTML = `<span>Không tải được ảnh</span>`;
      };
      img.src = url;
    };
    input.addEventListener('input', renderPreview);
    input.addEventListener('change', renderPreview);
    renderPreview();
  };

  bindImagePreview('im-logo', 'im-logo-preview', 'Chưa có logo');
  bindImagePreview('im-favicon', 'im-favicon-preview', 'Chưa có favicon', 'favicon');
  bindImagePreview('im-default', 'im-default-preview', 'Chưa có ảnh mặc định');
  bindImagePreview('im-seo', 'im-seo-preview', 'Chưa có ảnh SEO / chia sẻ');
  bindImagePreview('im-avatar', 'im-avatar-preview', 'Chưa có avatar', 'avatar');
  bindImageUploads(content);

  const collectDatabasePayload = () => {
    const val = (id) => qs(`#${id}`, content)?.value ?? '';
    const providers = ['postgres', 'mysql', 'supabase_postgres'];
    const currentProviders = dbCfg || {};
    return {
      active_provider: val('db-active-provider'),
      providers: Object.fromEntries(providers.map((provider) => {
        const current = currentProviders[provider] || {};
        const nextUrl = val(`db-${provider}-url`).trim();
        const payload = {
          enabled: val(`db-${provider}-enabled`) === 'true',
          label: current.label || provider,
        };
        if (nextUrl) payload.database_url = nextUrl;
        return [provider, payload];
      })),
    };
  };

  qsa('[data-db-test]', content).forEach((btn) => {
    btn.onclick = async () => {
      const val = (id) => qs(`#${id}`, content)?.value ?? '';
      const provider = btn.dataset.dbTest;
      const resultEl = qs(`#db-${provider}-test-result`, content);
      const url = val(`db-${provider}-url`).trim();
      btn.disabled = true;
      if (resultEl) resultEl.textContent = 'Đang kiểm tra kết nối...';
      try {
        const res = await apiFetch('/admin/settings/database/test-connection', {
          method: 'POST',
          body: JSON.stringify({ provider, database_url: url || undefined }),
        });
        if (resultEl) resultEl.textContent = res.ok
          ? `Kết nối thành công: ${res.masked_url || provider}`
          : `Kết nối thất bại: ${res.error || 'unknown_error'}`;
        toast(res.ok ? 'Test connection thành công' : 'Test connection thất bại', res.ok ? 'success' : 'error');
      } catch (err) {
        if (resultEl) resultEl.textContent = `Kết nối thất bại: ${err.message}`;
        toast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    };
  });

  qs('#settings-unified-form', content).onsubmit = async (e) => {
    e.preventDefault();
    const val = (id) => qs(`#${id}`, content)?.value ?? '';
    const chk = (id) => qs(`#${id}`, content)?.checked ?? false;
    const num = (id) => { const v = val(id); return v === '' ? '' : Number(v); };

    const payload = {
      settings_general: {
        title: val('g-title'),
        description: val('g-description'),
        site_description: val('g-site-description'),
        copyright_text: val('g-copyright'),
        keywords: val('g-keywords'),
        author: val('g-author'),
        seo_title: val('g-seo-title'),
        seo_description: val('g-seo-description'),
        seo_keywords: val('g-seo-keywords'),
        seo_author: val('g-seo-author'),
        site_url: val('g-site-url'),
        twitter_card: val('g-twitter-card'),
        timezone: val('g-timezone'),
        contact_email: val('g-contact-email'),
        contact_phone: val('g-contact-phone'),
        contact_hours: val('g-contact-hours'),
        social_fb: val('g-social-fb'),
        social_tele: val('g-social-tele'),
        social_discord: val('g-social-discord'),
        currency_name: val('g-currency-name'),
        currency_icon: val('g-currency-icon'),
        tax_rate: num('g-tax-rate'),
      },
      settings_appearance: {
        show_slider: chk('ap-show-slider'),
        show_banner: chk('ap-show-banner'),
        show_viewed: chk('ap-show-viewed'),
        home_categories: [...qsa('#home-cat-picker input:checked', content)].map(i => i.value).join(','),
      },
      settings_scripts: {
        header_script: val('sc-header'),
        footer_script: val('sc-footer'),
      },
      settings_images: {
        logo_url: val('im-logo'),
        favicon_url: val('im-favicon'),
        default_image_url: val('im-default'),
        seo_image_url: val('im-seo'),
        default_avatar_url: val('im-avatar'),
      },
      settings_security: {
        lock_ip_login_fail: num('se-lock-login'),
        lock_account_pass_fail: num('se-lock-pass'),
        lock_ip_api_fail: num('se-lock-api'),
        lock_ip_2fa_fail: num('se-lock-2fa'),
        lock_ip_invoice_spam: num('se-lock-invoice'),
        lock_ip_forgot_spam: num('se-lock-forgot'),
        lock_ip_admin_illegal: num('se-lock-admin'),
        max_accounts_per_ip: num('se-max-accounts'),
        login_duration: num('se-login-duration'),
        cron_secret: val('se-cron-secret'),
        admin_path: val('se-admin-path'),
        admin_one_ip: chk('se-admin-one-ip'),
        admin_one_device: chk('se-admin-one-device'),
        client_one_device: chk('se-client-one-device'),
        hide_admin_button: chk('se-hide-admin-btn'),
        strong_password: chk('se-strong-pass'),
      },
      settings_captcha: {
        enabled: chk('ca-enabled'),
        type: val('ca-type'),
        site_key: val('ca-site-key'),
        secret_key: val('ca-secret-key'),
      },
      settings_features: {
        blog: chk('fe-blog'),
        offers: chk('fe-offers'),
        affiliate: chk('fe-affiliate'),
        support: chk('fe-support'),
        flash_sales: chk('fe-flash_sales'),
        reviews: chk('fe-reviews'),
        announcements: chk('fe-announcements'),
        balance: chk('fe-balance'),
        api_docs: chk('fe-balance') && chk('fe-api_docs'),
        wishlist: chk('fe-wishlist'),
        maintenance: chk('fe-maintenance'),
        maintenance_message: val('fe-maintenance-msg'),
      },
      settings_loyalty: {
        enabled: chk('lo-enabled'),
        earn_per: num('lo-earn-per'),
        redeem_value: num('lo-redeem-value'),
        min_redeem: num('lo-min-redeem'),
        max_percent: num('lo-max-percent'),
      },
    };

    try {
      const saveTasks = [
        apiFetch('/admin/settings/unified', { method: 'PUT', body: JSON.stringify(payload) }),
        apiFetch('/admin/settings/database', { method: 'PUT', body: JSON.stringify(collectDatabasePayload()) }),
      ];
      // Cũng lưu luôn config AI chung
      const aiProvider = qs('#ai-provider', content)?.value;
      let aiPromise = null;
      if (aiProvider) {
         const aiBody = {
          provider: aiProvider,
          model: qs('#ai-model', content)?.value || null,
          api_key: qs('#ai-apikey', content)?.value || null,
          custom_base_url: qs('#ai-baseurl', content)?.value || null,
        };
        aiPromise = apiFetch('/admin/ai/config', { method: 'PUT', body: JSON.stringify(aiBody) });
        saveTasks.push(aiPromise);
      }
      const results = await Promise.all(saveTasks);
      if (aiPromise) {
        const res = results[2];
        if (res?.api_key_masked) {
          const hint = qs('#ai-apikey', content)?.parentElement?.querySelector('.form-hint');
          if (hint) hint.textContent = 'Key hiện tại: ' + res.api_key_masked;
        }
      }

      toast('Đã lưu cài đặt', 'success');
      // Tải lại setting mới và update giao diện lập tức
      appSettings = await apiFetch('/admin/settings/public').catch(() => ({}));
      appSettings.features = appSettings.features || {};
      window.appSettings = appSettings;
      if (typeof loadSidebar === 'function') loadSidebar();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // ── AI Config Panel ──
  (async () => {
    const area = qs('#ai-config-area', content);
    if (!area) return;
    try {
      const cfg = await apiFetch('/admin/ai/config');
      const providers = cfg.providers || {};
      const currentProvider = cfg.provider || '';
      const currentModel = cfg.model || '';
      const masked = cfg.api_key_masked || '';

      area.innerHTML = `
        <div class="form-group">
          <label class="form-label" for="ai-provider">Provider</label>
          <select class="form-select" id="ai-provider">
            <option value="">— Chọn provider —</option>
            ${Object.entries(providers).map(([pid, p]) =>
              `<option value="${pid}" ${pid === currentProvider ? 'selected' : ''}>${p.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ai-model">Model</label>
          <select class="form-select" id="ai-model">
            <option value="">— Chọn model —</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ai-apikey">API Key</label>
          <input class="form-input" id="ai-apikey" type="password" placeholder="${masked || 'Nhập API key của provider'}" />
          ${masked ? `<div class="form-hint">Key hiện tại: ${masked}</div>` : ''}
        </div>
        <div class="form-group">
          <label class="form-label" for="ai-baseurl">Custom Base URL (tuỳ chọn)</label>
          <input class="form-input" id="ai-baseurl" type="text" value="${cfg.custom_base_url || ''}" placeholder="Để trống để dùng URL mặc định" />
        </div>
        <div class="settings-row" style="gap:8px;margin-top:12px">
          <button type="button" class="btn btn-ghost" id="btn-ai-test">Test kết nối</button>
          <span id="ai-test-result" class="form-hint" style="margin-left:8px"></span>
        </div>
      `;

      // Populate models dropdown
      const populateModels = (pid) => {
        const sel = qs('#ai-model', content);
        const p = providers[pid];
        if (!p || !sel) return;
        sel.innerHTML = p.models.map(m =>
          `<option value="${m}" ${m === currentModel || m === p.default_model ? 'selected' : ''}>${m}</option>`
        ).join('');
      };
      if (currentProvider) populateModels(currentProvider);

      qs('#ai-provider', content).onchange = (e) => populateModels(e.target.value);

      // Test
      qs('#btn-ai-test', content).onclick = async () => {
        const resultEl = qs('#ai-test-result', content);
        resultEl.textContent = 'Đang kiểm tra...';
        try {
          const res = await apiFetch('/admin/ai/test', { method: 'POST' });
          resultEl.textContent = '✓ ' + (res.response || 'Kết nối thành công');
          resultEl.style.color = 'var(--success)';
          toast('AI hoạt động bình thường', 'success');
        } catch (err) {
          resultEl.textContent = '✗ ' + err.message;
          resultEl.style.color = 'var(--danger)';
          toast(err.message, 'error');
        }
      };
    } catch (err) {
      area.innerHTML = `<div class="form-hint" style="color:var(--danger)">Lỗi tải cấu hình AI: ${err.message}</div>`;
    }
  })();

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Lỗi tải cài đặt</h3><p class="text-muted">${err.message}</p></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN BANNERS
// ═══════════════════════════════════════════════════════════════
async function renderAdminBanners(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  let currentBanners = [];

  content.onclick = async (e) => {
    const addBtn = e.target.closest('#btn-add-banner');
    if (addBtn) {
      showBannerModal(null, refresh);
      return;
    }

    const editBtn = e.target.closest('[data-edit-banner]');
    if (editBtn) {
      const banner = currentBanners.find(x => x.id === +editBtn.dataset.editBanner);
      if (banner) showBannerModal(banner, refresh);
      return;
    }

    const delBtn = e.target.closest('[data-del-banner]');
    if (delBtn) {
      e.preventDefault();
      if (!confirm('Xóa banner này?')) return;
      try {
        await apiFetch(`/banners/admin/${delBtn.dataset.delBanner}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
  };

  const refresh = async () => {
    try {
      const banners = await apiFetch('/banners/admin/list');
      currentBanners = banners;
      content.innerHTML = `
        ${cuiPageHeader('Quản lý Banners', 'Điều phối banner và điểm nhấn marketing', '<button class="btn btn-primary" id="btn-add-banner"><i class="fa-solid fa-plus"></i> Thêm banner</button>')}
        <div class="card">
          <div class="table-wrap"><table>
            <thead><tr><th>Ảnh</th><th>Tiêu đề</th><th>Loại</th><th>Link</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>${banners.length ? banners.map(b => `<tr>
              <td><img src="${b.image_url}" style="height:48px;border-radius:6px;object-fit:cover" /></td>
              <td class="fw-600">${b.title}</td>
              <td><span class="badge ${b.banner_type === 'hero' ? 'badge-primary' : 'badge-info'}">${b.banner_type}</span></td>
              <td class="text-sm text-muted">${b.link || '—'}</td>
              <td>${b.sort_order}</td>
              <td><span class="badge ${b.is_active ? 'badge-success' : 'badge-muted'}">${b.is_active ? 'Hiện' : 'Ẩn'}</span></td>
              <td>
                <button class="tbl-btn tbl-edit" data-edit-banner="${b.id}">Sửa</button>
                <button class="tbl-btn tbl-delete" data-del-banner="${b.id}">Xóa</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Chưa có banner nào</td></tr>'}</tbody>
          </table></div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Lỗi tải banners</h3><p class="text-muted">${err.message}</p></div>`;
    }
  };
  await refresh();
}

function showBannerModal(banner, onDone) {
  const isEdit = !!banner;
  const html = `
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa banner' : 'Thêm banner mới'}</h3>
    <form id="banner-form">
      <div class="form-group">
        <label class="form-label">Tiêu đề</label>
        <input class="form-input" id="bn-title" value="${banner?.title || ''}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Ảnh banner</label>
        <div class="banner-upload-area" id="bn-upload-area">
          ${banner?.image_url ? `<img src="${banner.image_url}" class="banner-upload-preview" id="bn-preview" />` : '<div class="banner-upload-placeholder" id="bn-preview-placeholder">Click để upload hoặc kéo thả ảnh</div>'}
          <input type="file" id="bn-file" accept="image/*" style="display:none" />
        </div>
        <input class="form-input mt-8" id="bn-image-url" value="${banner?.image_url || ''}" placeholder="Hoặc nhập URL ảnh" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Loại</label>
          <select class="form-select" id="bn-type">
            <option value="hero" ${banner?.banner_type === 'hero' ? 'selected' : ''}>Hero (banner lớn)</option>
            <option value="category" ${banner?.banner_type === 'category' ? 'selected' : ''}>Category (banner nhỏ)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Thứ tự</label>
          <input type="number" class="form-input" id="bn-order" value="${banner?.sort_order ?? 0}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Link (hash route hoặc URL)</label>
        <input class="form-input" id="bn-link" value="${banner?.link || ''}" placeholder="/category/vpn hoặc https://..." />
      </div>
      <div class="form-group">
        <label class="form-label"><input type="checkbox" id="bn-active" ${banner?.is_active !== false ? 'checked' : ''} /> Hiển thị</label>
      </div>
      <button type="submit" class="btn btn-primary btn-full">${isEdit ? 'Cập nhật' : 'Tạo banner'}</button>
    </form>
  `;
  openModal(html);

  const mc = qs('#modal-content');
  // File upload
  const uploadArea = qs('#bn-upload-area', mc);
  const fileInput = qs('#bn-file', mc);
  const imageUrlInput = qs('#bn-image-url', mc);

  uploadArea.onclick = (e) => { if (e.target.tagName !== 'INPUT') fileInput.click(); };
  uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); };
  uploadArea.ondragleave = () => uploadArea.classList.remove('dragover');
  uploadArea.ondrop = async (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); if (e.dataTransfer.files.length) await uploadBannerFile(e.dataTransfer.files[0], uploadArea, imageUrlInput); };
  fileInput.onchange = async () => { if (fileInput.files.length) await uploadBannerFile(fileInput.files[0], uploadArea, imageUrlInput); };

  // Submit
  qs('#banner-form', mc).onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      title: qs('#bn-title', mc).value,
      image_url: qs('#bn-image-url', mc).value,
      link: qs('#bn-link', mc).value,
      banner_type: qs('#bn-type', mc).value,
      sort_order: parseInt(qs('#bn-order', mc).value) || 0,
      is_active: qs('#bn-active', mc).checked,
    };
    if (!body.image_url) return toast('Cần có ảnh banner', 'error');
    try {
      if (isEdit) {
        await apiFetch(`/banners/admin/${banner.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/banners/admin', { method: 'POST', body: JSON.stringify(body) });
      }
      closeModal(); toast(isEdit ? 'Đã cập nhật' : 'Đã tạo', 'success'); onDone();
    } catch (err) { toast(err.message, 'error'); }
  };
}

async function uploadBannerFile(file, area, urlInput) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    area.classList.add('uploading');
    const res = await fetch('/api/banners/admin/upload-image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: fd,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    urlInput.value = data.url;
    // Update preview
    const existing = area.querySelector('.banner-upload-preview');
    const placeholder = area.querySelector('.banner-upload-placeholder');
    if (existing) { existing.src = data.url; }
    else {
      if (placeholder) placeholder.remove();
      const img = document.createElement('img');
      img.src = data.url;
      img.className = 'banner-upload-preview';
      area.insertBefore(img, area.querySelector('input'));
    }
    toast('Upload thành công', 'success');
  } catch (err) { toast('Upload thất bại: ' + err.message, 'error'); }
  finally { area.classList.remove('uploading'); }
}

// ── ADMIN FLASH SALES ──────────────────────────────────────────
async function renderAdminFlashSales(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  let currentSales = [];

  content.onclick = async (e) => {
    const addBtn = e.target.closest('#btn-add-fs');
    if (addBtn) {
      showFlashSaleModal(null, refresh);
      return;
    }

    const editBtn = e.target.closest('[data-edit-fs]');
    if (editBtn) {
      const sale = currentSales.find(x => x.id === +editBtn.dataset.editFs);
      if (sale) showFlashSaleModal(sale, refresh);
      return;
    }

    const delBtn = e.target.closest('[data-del-fs]');
    if (delBtn) {
      e.preventDefault();
      if (!confirm('Xóa flash sale này?')) return;
      try {
        await apiFetch(`/flash-sales/admin/${delBtn.dataset.delFs}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
  };

  const refresh = async () => {
    try {
      const sales = await apiFetch('/flash-sales/admin/list');
      currentSales = sales;
      content.innerHTML = `
        ${cuiPageHeader('Flash Sales', 'Thiết lập chiến dịch giảm giá nhanh', '<button class="btn btn-primary" id="btn-add-fs"><i class="fa-solid fa-plus"></i> Thêm Flash Sale</button>')}
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Sản phẩm</th><th>Gói</th><th>Giá gốc</th><th>Giá sale</th><th>Giới hạn</th><th>Đã bán</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>${sales.length ? sales.map(s => `<tr>
            <td class="td-bold">${s.product_name || '—'}</td>
            <td class="text-muted">${s.package_name || '#' + s.package_id}</td>
            <td>${fmt(s.original_price)}</td>
            <td class="text-primary fw-600">${fmt(s.sale_price)}</td>
            <td>${s.quantity_limit || '∞'}</td>
            <td>${s.sold_count || 0}</td>
            <td class="text-sm">${fmtDate(s.starts_at)}</td>
            <td class="text-sm">${fmtDate(s.ends_at)}</td>
            <td>${s.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Off</span>'}</td>
            <td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit-fs="${s.id}">Sửa</button><button class="tbl-btn tbl-delete" data-del-fs="${s.id}">Xóa</button></div></td>
          </tr>`).join('') : '<tr><td colspan="10" class="text-center text-muted">Chưa có flash sale nào</td></tr>'}</tbody>
        </table></div></div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Lỗi tải flash sale</h3><p class="text-muted">${err.message}</p></div>`;
    }
  };
  await refresh();
}

function showFlashSaleModal(fs, onDone) {
  const isEdit = !!fs;
  openModal(`
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa Flash Sale' : 'Thêm Flash Sale'}</h3>
    <form id="fs-form">
      <div class="form-group"><label class="form-label">Package ID<span class="req">*</span></label><input type="number" class="form-input" id="fs-pkg" value="${fs?.package_id || ''}" required /></div>
      <div class="form-group"><label class="form-label">Giá sale<span class="req">*</span></label><input type="number" class="form-input" id="fs-price" value="${fs?.sale_price || ''}" required /></div>
      <div class="form-group"><label class="form-label">Giới hạn SL (0 = không giới hạn)</label><input type="number" class="form-input" id="fs-limit" value="${fs?.quantity_limit ?? 0}" /></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Bắt đầu</label><input type="datetime-local" class="form-input" id="fs-start" value="${fs?.starts_at ? fs.starts_at.slice(0,16) : ''}" /></div>
        <div class="form-group"><label class="form-label">Kết thúc</label><input type="datetime-local" class="form-input" id="fs-end" value="${fs?.ends_at ? fs.ends_at.slice(0,16) : ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="fs-active" ${fs?.is_active !== false ? 'checked' : ''} /> Active</label></div>
      <div id="fs-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">${isEdit ? 'Cập nhật' : 'Tạo mới'}</button><button type="button" class="btn btn-ghost" id="fs-cancel">Hủy</button></div>
    </form>
  `);
  qs('#fs-cancel').onclick = closeModal;
  qs('#fs-form').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      package_id: parseInt(qs('#fs-pkg').value),
      sale_price: parseInt(qs('#fs-price').value),
      quantity_limit: parseInt(qs('#fs-limit').value) || 0,
      starts_at: qs('#fs-start').value || null,
      ends_at: qs('#fs-end').value || null,
      is_active: qs('#fs-active').checked,
    };
    try {
      if (isEdit) await apiFetch(`/flash-sales/admin/${fs.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiFetch('/flash-sales/admin', { method: 'POST', body: JSON.stringify(body) });
      closeModal(); toast(isEdit ? 'Đã cập nhật' : 'Đã tạo', 'success'); onDone();
    } catch (err) { const e = qs('#fs-form-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

// ── ADMIN GIFT CODES ───────────────────────────────────────────
async function renderAdminGiftCodes(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  let currentCodes = [];

  content.onclick = async (e) => {
    const addBtn = e.target.closest('#btn-add-gc');
    if (addBtn) {
      showGiftCodeModal(null, refresh);
      return;
    }

    const editBtn = e.target.closest('[data-edit-gc]');
    if (editBtn) {
      const code = currentCodes.find(x => x.id === +editBtn.dataset.editGc);
      if (code) showGiftCodeModal(code, refresh);
      return;
    }

    const delBtn = e.target.closest('[data-del-gc]');
    if (delBtn) {
      e.preventDefault();
      if (!confirm('Xóa gift code này?')) return;
      try {
        await apiFetch(`/gift-codes/admin/${delBtn.dataset.delGc}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
  };

  const refresh = async () => {
    try {
      const codes = await apiFetch('/gift-codes/admin/list');
      currentCodes = codes;
      content.innerHTML = `
        ${cuiPageHeader('Gift Codes', 'Quản lý gift code và phân phối ưu đãi', '<button class="btn btn-primary" id="btn-add-gc"><i class="fa-solid fa-plus"></i> Thêm mã</button>')}
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Mã</th><th>Loại</th><th>Giá trị</th><th>Đơn tối thiểu</th><th>Giảm tối đa</th><th>Đã dùng/Giới hạn</th><th>Hết hạn</th><th>Trạng thái</th><th>Ưu đãi</th><th></th></tr></thead>
          <tbody>${codes.length ? codes.map(c => `<tr>
            <td class="td-bold td-mono">${c.code}</td>
            <td><span class="badge ${c.discount_type === 'percent' ? 'badge-blue' : 'badge-purple'}">${c.discount_type === 'percent' ? '%' : 'Fixed'}</span></td>
            <td>${c.discount_type === 'percent' ? c.discount_value + '%' : fmt(c.discount_value)}</td>
            <td>${c.min_order ? fmt(c.min_order) : '—'}</td>
            <td>${c.max_discount ? fmt(c.max_discount) : '—'}</td>
            <td>${c.used_count || 0}/${c.usage_limit || '∞'}</td>
            <td class="text-sm">${fmtDate(c.expires_at)}</td>
            <td>${c.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Off</span>'}</td>
            <td>${c.is_public ? '<span class="badge badge-blue">Hiện</span>' : '<span class="badge badge-gray">Ẩn</span>'}</td>
            <td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit-gc="${c.id}">Sửa</button><button class="tbl-btn tbl-delete" data-del-gc="${c.id}">Xóa</button></div></td>
          </tr>`).join('') : '<tr><td colspan="10" class="text-center text-muted">Chưa có gift code nào</td></tr>'}</tbody>
        </table></div></div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Lỗi tải gift code</h3><p class="text-muted">${err.message}</p></div>`;
    }
  };
  await refresh();
}

function showGiftCodeModal(gc, onDone) {
  const isEdit = !!gc;
  openModal(`
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa Gift Code' : 'Thêm Gift Code'}</h3>
    <form id="gc-form">
      <div class="form-group"><label class="form-label">Mã<span class="req">*</span></label><input class="form-input" id="gc-code" value="${gc?.code || ''}" required /></div>
      <div class="form-group"><label class="form-label">Loại giảm</label><select class="form-select" id="gc-type"><option value="percent" ${gc?.discount_type === 'percent' ? 'selected' : ''}>Phần trăm (%)</option><option value="fixed" ${gc?.discount_type === 'fixed' ? 'selected' : ''}>Cố định (đ)</option></select></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Giá trị<span class="req">*</span></label><input type="number" class="form-input" id="gc-value" value="${gc?.discount_value || ''}" required /></div>
        <div class="form-group"><label class="form-label">Giới hạn sử dụng</label><input type="number" class="form-input" id="gc-limit" value="${gc?.usage_limit ?? 0}" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Đơn tối thiểu</label><input type="number" class="form-input" id="gc-min" value="${gc?.min_order || 0}" /></div>
        <div class="form-group"><label class="form-label">Giảm tối đa</label><input type="number" class="form-input" id="gc-max" value="${gc?.max_discount || 0}" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Bắt đầu</label><input type="datetime-local" class="form-input" id="gc-start" value="${gc?.starts_at ? gc.starts_at.slice(0,16) : ''}" /></div>
        <div class="form-group"><label class="form-label">Hết hạn</label><input type="datetime-local" class="form-input" id="gc-exp" value="${gc?.expires_at ? gc.expires_at.slice(0,16) : ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="gc-active" ${gc?.is_active !== false ? 'checked' : ''} /> Active</label></div>
      <div class="form-group"><label class="form-label"><input type="checkbox" id="gc-public" ${gc?.is_public ? 'checked' : ''} /> Hiện trên trang Ưu đãi</label></div>
      <div class="form-group"><label class="form-label">Mô tả (hiện trên trang ưu đãi)</label><textarea class="form-input" id="gc-desc" rows="2" placeholder="VD: Áp dụng cho tất cả sản phẩm...">${gc?.description || ''}</textarea></div>
      <div id="gc-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">${isEdit ? 'Cập nhật' : 'Tạo mới'}</button><button type="button" class="btn btn-ghost" id="gc-cancel">Hủy</button></div>
    </form>
  `);
  qs('#gc-cancel').onclick = closeModal;
  qs('#gc-form').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      code: qs('#gc-code').value,
      discount_type: qs('#gc-type').value,
      discount_value: parseInt(qs('#gc-value').value),
      usage_limit: parseInt(qs('#gc-limit').value) || 0,
      min_order: parseInt(qs('#gc-min').value) || 0,
      max_discount: parseInt(qs('#gc-max').value) || 0,
      starts_at: qs('#gc-start').value || null,
      expires_at: qs('#gc-exp').value || null,
      is_active: qs('#gc-active').checked,
      is_public: qs('#gc-public').checked,
      description: qs('#gc-desc').value.trim() || null,
    };
    try {
      if (isEdit) await apiFetch(`/gift-codes/admin/${gc.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiFetch('/gift-codes/admin', { method: 'POST', body: JSON.stringify(body) });
      closeModal(); toast(isEdit ? 'Đã cập nhật' : 'Đã tạo', 'success'); onDone();
    } catch (err) { const e = qs('#gc-form-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

// ── ADMIN AFFILIATES ───────────────────────────────────────────
async function renderAdminAffiliates(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const refresh = async () => {
    const affiliates = await apiFetch('/affiliate/admin/list');
    content.innerHTML = `
      ${cuiPageHeader('Affiliates', 'Theo dõi cộng tác viên và hoa hồng')}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Email</th><th>Mã giới thiệu</th><th>Hoa hồng (%)</th><th>Tổng thu</th><th>Đã trả</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${affiliates.length ? affiliates.map(a => `<tr>
          <td class="td-bold">${a.email || '—'}</td>
          <td class="td-mono">${a.referral_code}</td>
          <td>${a.commission_rate}%</td>
          <td>${fmt(a.total_earnings || 0)}</td>
          <td>${fmt(a.total_paid || 0)}</td>
          <td>${a.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Off</span>'}</td>
          <td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit-aff="${a.id}">Sửa</button><button class="tbl-btn tbl-view" data-view-aff="${a.id}">Referrals</button></div></td>
        </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Chưa có affiliate nào</td></tr>'}</tbody>
      </table></div></div>
    `;
    content.onclick = async (e) => {
      const editBtn = e.target.closest('[data-edit-aff]');
      if (editBtn) {
        const a = affiliates.find(x => x.id === +editBtn.dataset.editAff);
        if (a) showAffiliateModal(a, refresh);
        return;
      }

      const viewBtn = e.target.closest('[data-view-aff]');
      if (viewBtn) {
        try {
          const refs = await apiFetch(`/affiliate/admin/${viewBtn.dataset.viewAff}/referrals`);
          let html = '<h3 class="modal-title mb-16">Referrals</h3>';
          if (!refs.length) {
            html += '<div class="text-center text-muted py-16">Chưa có referral nào</div>';
          } else {
            html += `<div class="table-wrap"><table><thead><tr><th>Email</th><th>Ngày đăng ký</th><th>Tổng chi tiêu</th><th>Hoa hồng tạo ra</th></tr></thead><tbody>${refs.map(r => `<tr><td>${r.email || '—'}</td><td>${fmtDate(r.created_at)}</td><td>${fmt(r.total_spent || 0)}</td><td>${fmt(r.commission_generated || 0)}</td></tr>`).join('')}</tbody></table></div>`;
          }
          html += '<div class="mt-16 text-right"><button class="btn btn-ghost" id="aff-close">Đóng</button></div>';
          openModal(html);
          qs('#aff-close').onclick = closeModal;
        } catch (err) { toast(err.message, 'error'); }
      }
    };
  };
  await refresh();
}

function showAffiliateModal(aff, onDone) {
  openModal(`
    <h3 class="modal-title mb-16">Sửa Affiliate: ${aff.email || aff.referral_code}</h3>
    <form id="aff-form">
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Hoa hồng (%)</label><input type="number" class="form-input" id="aff-rate" value="${aff.commission_rate}" min="0" max="100" /></div>
        <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-select" id="aff-active"><option value="true" ${aff.is_active ? 'selected' : ''}>Active</option><option value="false" ${!aff.is_active ? 'selected' : ''}>Off</option></select></div>
      </div>
      <div id="aff-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">Cập nhật</button><button type="button" class="btn btn-ghost" id="aff-cancel">Hủy</button></div>
    </form>
  `);
  qs('#aff-cancel').onclick = closeModal;
  qs('#aff-form').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      commission_rate: parseFloat(qs('#aff-rate').value),
      is_active: qs('#aff-active').value === 'true',
    };
    try {
      await apiFetch(`/affiliate/admin/${aff.id}`, { method: 'PUT', body: JSON.stringify(body) });
      closeModal(); toast('Đã cập nhật', 'success'); onDone();
    } catch (err) { const e = qs('#aff-form-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

// ── ADMIN SUPPORT PAGES ────────────────────────────────────────

async function renderAdminSupportPages(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  let currentPages = [];

  content.onclick = async (e) => {
    const addBtn = e.target.closest('#btn-add-page');
    if (addBtn) {
      showSupportPageModal(null, refresh);
      return;
    }

    const editBtn = e.target.closest('[data-edit-page]');
    if (editBtn) {
      const page = currentPages.find(p => p.id === parseInt(editBtn.dataset.editPage));
      if (page) showSupportPageModal(page, refresh);
      return;
    }

    const delBtn = e.target.closest('[data-del-page]');
    if (delBtn) {
      e.preventDefault();
      if (!confirm('Xóa trang này?')) return;
      try {
        await apiFetch(`/support/pages/${delBtn.dataset.delPage}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
  };
  
  const refresh = async () => {
    try {
      const pages = await apiFetch('/support/pages');
      currentPages = pages;
      const html = `
        ${cuiPageHeader('Quản lý trang hỗ trợ', 'Quản lý FAQ, chính sách và nội dung hỗ trợ', '<button class="btn btn-primary" id="btn-add-page"><i class="fa-solid fa-plus"></i> Thêm trang</button>')}
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Tiêu đề</th><th>Slug</th><th>Loại</th><th>Trạng thái</th><th>Hành động</th></tr>
            </thead>
            <tbody>
              ${pages.length ? pages.map(p => `
                <tr>
                  <td>${p.title}</td>
                  <td><code>${p.slug}</code></td>
                  <td><span class="badge">${p.page_type}</span></td>
                  <td>${p.is_published ? '<span class="text-success">Xuất bản</span>' : '<span class="text-muted">Nháp</span>'}</td>
                  <td>
                    <button class="btn btn-sm btn-ghost" data-edit-page="${p.id}">Sửa</button>
                    <button class="btn btn-sm btn-ghost text-danger" data-del-page="${p.id}">Xóa</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="text-center text-muted">Chưa có trang nào</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
      
      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Lỗi tải trang hỗ trợ</h3><p class="text-muted">${err.message}</p></div>`;
    }
  };
  await refresh();
}

function showSupportPageModal(page, onDone) {
  const isEdit = !!page;
  openModal(`
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa trang' : 'Thêm trang'}</h3>
    <form id="page-form">
      <div class="form-group">
        <label class="form-label">Tiêu đề</label>
        <input type="text" class="form-input" id="page-title" value="${page?.title || ''}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Slug</label>
        <input type="text" class="form-input" id="page-slug" value="${page?.slug || ''}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Loại</label>
        <select class="form-select" id="page-type" required>
          <option value="warranty" ${page?.page_type === 'warranty' ? 'selected' : ''}>Chính sách bảo hành</option>
          <option value="purchase_guide" ${page?.page_type === 'purchase_guide' ? 'selected' : ''}>Hướng dẫn mua hàng</option>
          <option value="faq" ${page?.page_type === 'faq' ? 'selected' : ''}>Câu hỏi thường gặp</option>
          <option value="privacy" ${page?.page_type === 'privacy' ? 'selected' : ''}>Chính sách bảo mật</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nội dung (HTML)</label>
        <div class="editor-toolbar" id="page-content-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="image"><i class="fa-regular fa-image"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="h2">H2</button>
        </div>
        <textarea class="form-input" id="page-content" rows="10">${page?.content || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả SEO</label>
        <textarea class="form-input" id="page-desc" rows="2">${page?.meta_description || ''}</textarea>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="page-published" ${page?.is_published ? 'checked' : ''} />
          <span>Xuất bản</span>
        </label>
      </div>
      <div class="flex gap-8">
        <button type="submit" class="btn btn-primary flex-1">Lưu</button>
        <button type="button" class="btn btn-ghost" id="page-cancel">Hủy</button>
      </div>
    </form>
  `);
  
  createRichTextEditor({
    textareaId: 'page-content',
    toolbarId: 'page-content-toolbar',
    placeholder: 'Nhập nội dung trang hỗ trợ...',
  });

  qs('#page-cancel').onclick = closeModal;
  createRichTextEditor({ textarea: qs('#page-desc'), placeholder: 'Nhập mô tả SEO...', minHeight: 160 });
  qs('#page-form').onsubmit = async (e) => {
    e.preventDefault();
    if (window.syncRichTextEditors) window.syncRichTextEditors();
    const body = {
      slug: qs('#page-slug').value,
      title: qs('#page-title').value,
      content: qs('#page-content').value,
      page_type: qs('#page-type').value,
      meta_description: qs('#page-desc').value,
      is_published: qs('#page-published').checked,
    };
    try {
      if (isEdit) {
        await apiFetch(`/support/pages/${page.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/support/pages', { method: 'POST', body: JSON.stringify(body) });
      }
      closeModal();
      toast('Đã lưu', 'success');
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ── ADMIN SUPPORT TICKETS ──────────────────────────────────────

async function renderAdminTickets(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  
  // Check if we have a ticketId in the hash
  const params = new URLSearchParams(location.search || '');
  const ticketId = params.get('id');
  
  if (ticketId) {
    await renderAdminTicketDetail(content, ticketId);
    return;
  }

  const refresh = async () => {
    try {
      const tickets = await apiFetch('/support/tickets?user_id=admin');
      const html = `
        ${cuiPageHeader('Quản lý yêu cầu hỗ trợ', `Xử lý ticket và phản hồi khách hàng · ${tickets.length} ticket`)}
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Mã</th><th>Khách hàng</th><th>Tiêu đề</th><th>Danh mục</th><th>Trạng thái</th><th>Ưu tiên</th><th>Cập nhật</th><th></th></tr>
            </thead>
            <tbody>
              ${tickets.length ? tickets.map(t => `
                <tr>
                  <td class="td-mono"><strong>${t.ticket_number}</strong></td>
                  <td class="text-sm">${t.user_name || t.user_email || '—'}</td>
                  <td>${t.subject}</td>
                  <td><span class="badge">${t.category}</span></td>
                  <td><span class="badge status-${t.status}">${statusLabel(t.status)}</span></td>
                  <td><span class="badge priority-${t.priority}">${priorityLabel(t.priority)}</span></td>
                  <td class="text-sm text-muted">${fmtDate(t.updated_at || t.created_at)}</td>
                  <td><button class="tbl-btn tbl-view" data-open-ticket="${t.id}">Xem</button></td>
                </tr>
              `).join('') : '<tr><td colspan="8" class="text-center text-muted">Không có yêu cầu nào</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
      content.innerHTML = html;
      content.onclick = (e) => {
        const openBtn = e.target.closest('[data-open-ticket]');
        if (!openBtn) return;
        navigateTo(`/admin/tickets?id=${openBtn.dataset.openTicket}`);
      };
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><h3>Lỗi tải tickets</h3><p class="text-muted">${err.message}</p></div>`;
    }
  };
  await refresh();
}

async function renderAdminTicketDetail(content, ticketId) {
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await apiFetch(`/support/tickets/${ticketId}`);
    const ticket = data.ticket;
    const messages = data.messages || [];

    content.innerHTML = `
      <div class="cui-page-header" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-ghost btn-sm" id="btn-back-tickets"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="cui-page-header-left">
            <div class="cui-page-title" style="font-size:18px">${ticket.subject}</div>
            <div class="cui-page-subtitle">${ticket.ticket_number} · ${ticket.user_name || ticket.user_email}</div>
          </div>
        </div>
      </div>
      <div class="ticket-detail-layout">
        <div class="ticket-chat-panel">
          <div class="ticket-chat-header">
            <h3><i class="fa-solid fa-comments"></i> Cuộc trò chuyện</h3>
            <span class="badge status-${ticket.status}">${statusLabel(ticket.status)}</span>
          </div>
          <div class="ticket-chat-messages" id="ticket-messages">
            <!-- Initial description as first message -->
            ${ticket.description ? `
              <div class="ticket-msg user">
                <div>${ticket.description.replace(/\n/g, '<br>')}</div>
                <div class="ticket-msg-meta">${ticket.user_name || 'Khách'} · ${fmtDate(ticket.created_at)}</div>
              </div>
            ` : ''}
            ${messages.length ? messages.map(m => `
              <div class="ticket-msg ${m.sender_type}">
                <div>${m.message.replace(/\n/g, '<br>')}</div>
                <div class="ticket-msg-meta">${m.sender_name} · ${fmtDate(m.created_at)}</div>
              </div>
            `).join('') : (!ticket.description ? '<div class="ticket-msg-empty">Chưa có tin nhắn</div>' : '')}
          </div>
          ${ticket.status !== 'closed' ? `
            <div class="ticket-reply-bar">
              <textarea id="admin-reply-input" placeholder="Nhập phản hồi cho khách..." rows="1"></textarea>
              <button class="ticket-reply-btn" id="btn-send-reply" title="Gửi"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
          ` : '<div style="padding:12px 16px;text-align:center;color:var(--text-3);font-size:13px;border-top:1px solid var(--border)">Ticket đã đóng</div>'}
        </div>
        <div class="ticket-info-panel">
          <h4><i class="fa-solid fa-circle-info"></i> Thông tin</h4>
          <div class="ticket-info-row"><span class="ticket-info-label">Khách hàng</span><span class="ticket-info-value">${ticket.user_name || '—'}</span></div>
          <div class="ticket-info-row"><span class="ticket-info-label">Email</span><span class="ticket-info-value">${ticket.user_email || '—'}</span></div>
          <div class="ticket-info-row"><span class="ticket-info-label">Danh mục</span><span class="ticket-info-value"><span class="badge">${ticket.category}</span></span></div>
          <div class="ticket-info-row"><span class="ticket-info-label">Ưu tiên</span><span class="ticket-info-value"><span class="badge priority-${ticket.priority}">${priorityLabel(ticket.priority)}</span></span></div>
          <div class="ticket-info-row"><span class="ticket-info-label">Tạo lúc</span><span class="ticket-info-value">${fmtDate(ticket.created_at)}</span></div>
          <div class="ticket-status-form">
            <label class="form-label">Trạng thái</label>
            <select class="form-select" id="ticket-status-select">
              <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Đang mở</option>
              <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>Đang xử lý</option>
              <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Đã giải quyết</option>
              <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Đã đóng</option>
            </select>
            <button class="btn btn-primary btn-sm btn-full" id="btn-update-status" style="margin-top:8px">Cập nhật</button>
          </div>
        </div>
      </div>
    `;

    // Back button
    qs('#btn-back-tickets').onclick = () => { navigateTo('/admin/tickets'); };

    // Scroll messages to bottom
    const msgBox = qs('#ticket-messages');
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;

    // Auto-resize textarea
    const textarea = qs('#admin-reply-input');
    if (textarea) {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      });
      // Send on Enter (Shift+Enter for newline)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          qs('#btn-send-reply')?.click();
        }
      });
    }

    // Send reply
    const sendBtn = qs('#btn-send-reply');
    if (sendBtn) {
      sendBtn.onclick = async () => {
        const msg = textarea.value.trim();
        if (!msg) return;
        sendBtn.disabled = true;
        try {
          await apiFetch(`/support/tickets/${ticketId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
              sender_name: currentUser?.name || 'Admin',
              sender_type: 'admin',
              message: msg
            })
          });
          // Append message to chat without full reload
          const msgEl = document.createElement('div');
          msgEl.className = 'ticket-msg admin';
          msgEl.innerHTML = `<div>${msg.replace(/\n/g, '<br>')}</div><div class="ticket-msg-meta">Admin · vừa xong</div>`;
          msgBox.appendChild(msgEl);
          msgBox.scrollTop = msgBox.scrollHeight;
          textarea.value = '';
          textarea.style.height = 'auto';
        } catch (err) {
          toast('Lỗi gửi tin nhắn: ' + err.message, 'error');
        }
        sendBtn.disabled = false;
      };
    }

    // Update status
    qs('#btn-update-status').onclick = async () => {
      const status = qs('#ticket-status-select').value;
      try {
        await apiFetch(`/support/tickets/${ticketId}/status?status=${status}`, { method: 'PUT' });
        toast('Đã cập nhật trạng thái', 'success');
        renderAdminTicketDetail(content, ticketId);
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Không tải được ticket</h3><p class="text-muted">${err.message}</p><button class="btn btn-primary mt-12" onclick="navigateTo('/admin/tickets')">Quay lại</button></div>`;
  }
}

function showAdminTicketModal(ticket, onDone) {
  // Legacy — redirect to detail view
  navigateTo(`/admin/tickets?id=${ticket.id}`);
}


// ─── ADMIN BOT CONFIG ─────────────────────────────────────
async function renderAdminNotifications(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const [bots, notifyTypes, mailCfg] = await Promise.all([
      apiFetch('/telegram/bots').catch(() => []),
      apiFetch('/telegram/notify-types').catch(() => []),
      apiFetch('/admin/mail/config').catch(() => ({})),
    ]);

    const baseUrl = (appSettings?.app_base_url || location.origin).replace(/\/$/, '');

    content.innerHTML = `
      ${cuiPageHeader('Kết nối & Thông báo', 'Quản lý bot Telegram theo bộ phận và hệ thống mail')}

      <!-- ═══ Telegram Bots (đa kênh) ═══ -->
      <div class="settings-card" style="max-width:760px;">
        <div class="settings-section-title" style="display:flex;justify-content:space-between;align-items:center;">
          <span><i class="fa-brands fa-telegram" style="color:#229ED9;"></i> Bot Telegram theo bộ phận</span>
          <button class="btn btn-primary btn-sm" id="btn-add-bot"><i class="fa-solid fa-plus"></i> Thêm bot</button>
        </div>
        <div id="bot-list">${renderBotList(bots, notifyTypes)}</div>
        <div class="tg-guide">
          <div class="fw-600 mb-8" style="font-size:13px;"><i class="fa-solid fa-circle-info"></i> Hướng dẫn tạo bot Telegram</div>
          <ol class="sepay-guide">
            <li>Nhắn <strong>/newbot</strong> cho <a href="https://t.me/BotFather" target="_blank">@BotFather</a>, đặt tên → nhận <strong>Bot Token</strong>.</li>
            <li>Lấy <strong>Chat ID</strong>: nhắn <strong>/start</strong> cho <a href="https://t.me/userinfobot" target="_blank">@userinfobot</a> (cá nhân) hoặc thêm bot vào group rồi lấy ID group (số âm).</li>
            <li>Thêm bot ở trên, chọn <strong>bộ phận</strong> và các <strong>loại thông báo</strong> bot nhận.</li>
            <li>Bấm <strong>Đăng ký webhook</strong> để bot nhận lệnh (/stats, /today...). Cần APP_BASE_URL chạy HTTPS.</li>
          </ol>
          <div class="form-hint mt-8">Webhook URL mẫu: <code>${esc(baseUrl)}/api/telegram/webhook/&lt;BOT_TOKEN&gt;</code></div>
          <div class="fw-600 mb-8 mt-12" style="font-size:13px;"><i class="fa-solid fa-terminal"></i> Lệnh nhanh (nhắn cho bot)</div>
          <div class="tg-cmd-grid">
            <code>/stats</code><span>Tổng quan</span><code>/today</code><span>Báo cáo hôm nay</span>
            <code>/week</code><span>Báo cáo tuần</span><code>/month</code><span>Báo cáo tháng</span>
            <code>/top</code><span>Top sản phẩm</span><code>/ranking</code><span>BXH chi tiêu</span>
            <code>/pending</code><span>Đơn chờ</span><code>/help</code><span>Trợ giúp</span>
          </div>
        </div>
        <div class="tg-report-actions">
          <div class="fw-600 mb-8" style="font-size:13px;">Gửi báo cáo thủ công (tới bot nhận báo cáo)</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" data-report="day">📊 Hôm nay</button>
            <button class="btn btn-ghost btn-sm" data-report="week">📊 Tuần</button>
            <button class="btn btn-ghost btn-sm" data-report="month">📊 Tháng</button>
          </div>
        </div>
      </div>

      <!-- ═══ Mail Server theo domain ═══ -->
      <div class="settings-card" style="max-width:760px;">
        <div class="settings-section-title"><i class="fa-solid fa-envelope" style="color:#00AB55;"></i> Hệ thống Mail (theo domain)</div>
        <form id="mail-config-form">
          <div class="form-group">
            <label class="form-label">Chế độ gửi</label>
            <select class="form-input" id="mail_mode">
              <option value="relay" ${mailCfg.mail_mode !== 'direct' ? 'selected' : ''}>Relay — gửi qua SMTP có sẵn (đơn giản)</option>
              <option value="direct" ${mailCfg.mail_mode === 'direct' ? 'selected' : ''}>Direct — tự gửi từ domain (cần DNS + port 25)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Email gửi đi (From)</label>
            <input type="text" class="form-input" id="mail_from_email" value="${esc(mailCfg.mail_from_email || '')}" placeholder="noreply@yourdomain.com">
          </div>
          <div class="form-group">
            <label class="form-label">Tên người gửi</label>
            <input type="text" class="form-input" id="mail_from_name" value="${esc(mailCfg.mail_from_name || 'Sweet Premium Store')}">
          </div>

          <div id="mail-relay-fields" style="${mailCfg.mail_mode === 'direct' ? 'display:none' : ''}">
            <div class="form-group"><label class="form-label">SMTP Host</label><input type="text" class="form-input" id="mail_smtp_host" value="${esc(mailCfg.mail_smtp_host || '')}" placeholder="mail.yourdomain.com"></div>
            <div class="form-group"><label class="form-label">SMTP Port</label><input type="number" class="form-input" id="mail_smtp_port" value="${esc(mailCfg.mail_smtp_port || '587')}"></div>
            <div class="form-group"><label class="form-label">SMTP User</label><input type="text" class="form-input" id="mail_smtp_user" value="${esc(mailCfg.mail_smtp_user || '')}"></div>
            <div class="form-group"><label class="form-label">SMTP Password</label><input type="password" class="form-input" id="mail_smtp_pass" value="" placeholder="${mailCfg.mail_smtp_pass ? 'Đã cấu hình' : ''}"></div>
          </div>

          <div id="mail-direct-fields" style="${mailCfg.mail_mode === 'direct' ? '' : 'display:none'}">
            <div class="form-group"><label class="form-label">Domain (ký DKIM)</label><input type="text" class="form-input" id="mail_dkim_domain" value="${esc(mailCfg.mail_dkim_domain || '')}" placeholder="yourdomain.com"></div>
            <div class="form-group"><label class="form-label">DKIM Selector</label><input type="text" class="form-input" id="mail_dkim_selector" value="${esc(mailCfg.mail_dkim_selector || 'default')}"></div>
            <div class="form-group">
              <label class="form-label">DKIM Private Key</label>
              <div style="display:flex;gap:8px;">
                <span class="form-hint" style="flex:1;">${mailCfg.mail_dkim_private_key_set ? '✓ Đã có khóa' : 'Chưa có khóa — bấm tạo'}</span>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-gen-dkim"><i class="fa-solid fa-key"></i> Tạo khóa DKIM</button>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-dns-guide"><i class="fa-solid fa-globe"></i> Xem DNS cần cấu hình</button>
              </div>
            </div>
            <div id="dkim-result" class="form-hint" style="white-space:pre-wrap;word-break:break-all;"></div>
          </div>

          <div id="mail-result" class="form-hint mt-8"></div>
          <div style="display:flex;gap:8px;">
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Lưu cấu hình</button>
            <button type="button" class="btn btn-ghost" id="btn-mail-test"><i class="fa-solid fa-paper-plane"></i> Gửi mail test</button>
          </div>
        </form>
      </div>
    `;

    // ── Bot CRUD ──
    qsa('[data-report]', content).forEach(btn => {
      btn.onclick = async () => {
        try { const r = await apiFetch('/telegram/send-report', { method: 'POST', body: JSON.stringify({ kind: btn.dataset.report }) }); toast(r.message, 'success'); }
        catch (e) { toast(e.message, 'error'); }
      };
    });
    qs('#btn-add-bot').onclick = () => openBotModal(null, notifyTypes, () => renderAdminNotifications(view));
    bindBotListActions(content, bots, notifyTypes, () => renderAdminNotifications(view), baseUrl);

    // ── Mail config ──
    qs('#mail_mode').onchange = (e) => {
      const direct = e.target.value === 'direct';
      qs('#mail-relay-fields').style.display = direct ? 'none' : '';
      qs('#mail-direct-fields').style.display = direct ? '' : 'none';
    };
    function getMailPayload() {
      return {
        mail_mode: qs('#mail_mode').value,
        mail_from_email: qs('#mail_from_email').value,
        mail_from_name: qs('#mail_from_name').value,
        mail_smtp_host: qs('#mail_smtp_host')?.value || '',
        mail_smtp_port: qs('#mail_smtp_port')?.value || '587',
        mail_smtp_user: qs('#mail_smtp_user')?.value || '',
        mail_smtp_pass: qs('#mail_smtp_pass')?.value || '',
        mail_dkim_domain: qs('#mail_dkim_domain')?.value || '',
        mail_dkim_selector: qs('#mail_dkim_selector')?.value || 'default',
      };
    }
    qs('#mail-config-form').onsubmit = async (e) => {
      e.preventDefault();
      try { await apiFetch('/admin/mail/config', { method: 'PUT', body: JSON.stringify(getMailPayload()) }); toast('Đã lưu cấu hình mail', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    };
    qs('#btn-mail-test').onclick = async () => {
      const r = qs('#mail-result'); r.textContent = 'Đang gửi...'; r.style.color = '';
      const to = currentUser?.email || qs('#mail_from_email').value;
      try {
        await apiFetch('/admin/mail/config', { method: 'PUT', body: JSON.stringify(getMailPayload()) });
        const res = await apiFetch('/admin/mail/test', { method: 'POST', body: JSON.stringify({ to_email: to }) });
        r.textContent = '✓ ' + res.message; r.style.color = 'var(--green)';
      } catch (err) { r.textContent = '✗ ' + err.message; r.style.color = 'var(--red)'; }
    };
    const btnGenDkim = qs('#btn-gen-dkim');
    if (btnGenDkim) btnGenDkim.onclick = async () => {
      const domain = qs('#mail_dkim_domain').value;
      const selector = qs('#mail_dkim_selector').value || 'default';
      if (!domain) return toast('Nhập domain trước', 'error');
      const r = qs('#dkim-result'); r.textContent = 'Đang tạo khóa...';
      try {
        const res = await apiFetch('/admin/mail/dkim', { method: 'POST', body: JSON.stringify({ domain, selector }) });
        r.innerHTML = `✓ Đã tạo khóa. Thêm bản ghi DNS TXT:<br><strong>Name:</strong> <code>${esc(res.dns_record_name)}</code><br><strong>Value:</strong> <code>${esc(res.dns_record_value)}</code>`;
        r.style.color = 'var(--green)';
      } catch (err) { r.textContent = '✗ ' + err.message; r.style.color = 'var(--red)'; }
    };
    const btnDnsGuide = qs('#btn-dns-guide');
    if (btnDnsGuide) btnDnsGuide.onclick = async () => {
      const domain = qs('#mail_dkim_domain').value;
      try {
        const res = await apiFetch('/admin/mail/dns-guide' + (domain ? '?domain=' + encodeURIComponent(domain) : ''));
        const rows = res.records.map(r => `<tr><td><strong>${esc(r.type)}</strong></td><td><code>${esc(r.name)}</code></td><td style="word-break:break-all;"><code>${esc(r.value)}</code></td><td class="text-sm text-muted">${esc(r.note)}</td></tr>`).join('');
        openModal(`<h3 class="modal-title mb-16">Bản ghi DNS cần cấu hình (${esc(res.domain)})</h3><div class="table-wrap"><table style="font-size:12px;"><thead><tr><th>Loại</th><th>Name</th><th>Value</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table></div>`, '');
      } catch (err) { toast(err.message, 'error'); }
    };
  } catch (err) {
    showError(err.message);
  }
}

function renderBotList(bots, notifyTypes) {
  if (!bots.length) return '<div class="text-muted text-sm" style="padding:16px 0;">Chưa có bot nào. Bấm "Thêm bot" để tạo.</div>';
  const typeLabel = (id) => (notifyTypes.find(t => t.id === id)?.label || id);
  const deptLabel = { sale: '💼 Sale', tech: '🛠️ Kỹ thuật', accounting: '💰 Kế toán', custom: '📌 Khác' };
  return bots.map(b => `
    <div class="bot-card" data-bot-id="${b.id}">
      <div class="bot-card-head">
        <div>
          <span class="bot-card-name">${esc(b.name)}</span>
          <span class="bot-dept-badge">${deptLabel[b.department] || b.department}</span>
          ${b.is_active ? '<span class="bot-status on">● Bật</span>' : '<span class="bot-status off">○ Tắt</span>'}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" data-bot-edit="${b.id}" title="Sửa"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost btn-sm" data-bot-test="${b.id}" title="Test"><i class="fa-solid fa-plug"></i></button>
          <button class="btn btn-ghost btn-sm" data-bot-msg="${b.id}" title="Gửi test"><i class="fa-solid fa-paper-plane"></i></button>
          <button class="btn btn-ghost btn-sm" data-bot-webhook="${b.id}" title="Webhook"><i class="fa-solid fa-link"></i></button>
          <button class="btn btn-ghost btn-sm" data-bot-del="${b.id}" title="Xóa" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="bot-card-types">${(b.notify_types || []).map(t => `<span class="bot-type-tag">${esc(typeLabel(t))}</span>`).join('') || '<span class="text-muted text-sm">Chưa chọn loại thông báo</span>'}${b.receive_reports ? '<span class="bot-type-tag" style="background:var(--primary);color:#fff;">📊 Báo cáo định kỳ</span>' : ''}</div>
    </div>
  `).join('');
}

function openBotModal(bot, notifyTypes, onSaved) {
  const isEdit = !!bot;
  const depts = [['sale', '💼 Sale'], ['tech', '🛠️ Kỹ thuật'], ['accounting', '💰 Kế toán'], ['custom', '📌 Khác']];
  const checkedTypes = bot?.notify_types || [];
  openModal(`
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa bot' : 'Thêm bot Telegram'}</h3>
    <div class="form-group"><label class="form-label">Tên bot</label><input type="text" class="form-input" id="bm-name" value="${isEdit ? esc(bot.name) : ''}" placeholder="VD: Bot Sale"></div>
    <div class="form-group"><label class="form-label">Bộ phận</label><select class="form-input" id="bm-dept">${depts.map(([v, l]) => `<option value="${v}" ${bot?.department === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Bot Token</label><input type="password" class="form-input" id="bm-token" value="" placeholder="${isEdit && bot.bot_token_set ? 'Đã có — để trống nếu giữ nguyên' : 'Token từ @BotFather'}"></div>
    <div class="form-group"><label class="form-label">Chat ID</label><input type="text" class="form-input" id="bm-chat" value="${isEdit ? esc(bot.chat_id) : ''}" placeholder="123456789 hoặc -100xxx"></div>
    <div class="form-group">
      <label class="form-label">Loại thông báo bot này nhận</label>
      <div class="bot-type-checks">
        ${notifyTypes.map(t => `<label class="tg-check"><input type="checkbox" data-ntype="${t.id}" ${checkedTypes.includes(t.id) ? 'checked' : ''}> ${esc(t.label)}</label>`).join('')}
      </div>
      <label class="tg-check" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;"><input type="checkbox" id="bm-reports" ${bot?.receive_reports ? 'checked' : ''}> 📊 Nhận báo cáo định kỳ (ngày/tuần/tháng)</label>
      <label class="tg-check"><input type="checkbox" id="bm-active" ${!isEdit || bot.is_active ? 'checked' : ''}> Kích hoạt bot</label>
    </div>
    <div id="bm-err" class="form-error mb-12" style="display:none"></div>
    <button class="btn btn-primary btn-full" id="bm-save"><i class="fa-solid fa-check"></i> ${isEdit ? 'Cập nhật' : 'Tạo bot'}</button>
  `);
  qs('#bm-save').onclick = async () => {
    const payload = {
      name: qs('#bm-name').value.trim(),
      department: qs('#bm-dept').value,
      bot_token: qs('#bm-token').value.trim(),
      chat_id: qs('#bm-chat').value.trim(),
      notify_types: qsa('[data-ntype]').filter(c => c.checked).map(c => c.dataset.ntype),
      receive_reports: qs('#bm-reports').checked,
      is_active: qs('#bm-active').checked,
    };
    if (!payload.name || !payload.chat_id || (!isEdit && !payload.bot_token)) {
      const e = qs('#bm-err'); e.textContent = 'Nhập đủ tên, token, chat ID'; e.style.display = 'block'; return;
    }
    try {
      if (isEdit) await apiFetch(`/telegram/bots/${bot.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch('/telegram/bots', { method: 'POST', body: JSON.stringify(payload) });
      closeModal(); toast(isEdit ? 'Đã cập nhật bot' : 'Đã tạo bot', 'success'); onSaved();
    } catch (err) { const e = qs('#bm-err'); e.textContent = err.message; e.style.display = 'block'; }
  };
}

function bindBotListActions(content, bots, notifyTypes, onChanged, baseUrl) {
  qsa('[data-bot-edit]', content).forEach(b => b.onclick = () => {
    const bot = bots.find(x => x.id == b.dataset.botEdit);
    openBotModal(bot, notifyTypes, onChanged);
  });
  qsa('[data-bot-del]', content).forEach(b => b.onclick = async () => {
    if (!confirm('Xóa bot này?')) return;
    try { await apiFetch(`/telegram/bots/${b.dataset.botDel}`, { method: 'DELETE' }); toast('Đã xóa bot', 'success'); onChanged(); }
    catch (e) { toast(e.message, 'error'); }
  });
  qsa('[data-bot-test]', content).forEach(b => b.onclick = async () => {
    try { const r = await apiFetch(`/telegram/bots/${b.dataset.botTest}/test`, { method: 'POST', body: '{}' }); toast(r.message, 'success'); }
    catch (e) { toast(e.message, 'error'); }
  });
  qsa('[data-bot-msg]', content).forEach(b => b.onclick = async () => {
    try { const r = await apiFetch(`/telegram/bots/${b.dataset.botMsg}/test-message`, { method: 'POST', body: '{}' }); toast(r.message, 'success'); }
    catch (e) { toast(e.message, 'error'); }
  });
  qsa('[data-bot-webhook]', content).forEach(b => b.onclick = async () => {
    try { const r = await apiFetch(`/telegram/bots/${b.dataset.botWebhook}/set-webhook`, { method: 'POST', body: '{}' }); toast(r.message, 'success'); }
    catch (e) { toast(e.message, 'error'); }
  });
}


// ═══════════════════════════════════════════════════════════════
//  ADMIN PAYMENTS (SePay Config + Payment History)
// ═══════════════════════════════════════════════════════════════

async function renderAdminPayments(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const [config, historyData] = await Promise.all([
    apiFetch('/admin/payment/config').catch(() => ({})),
    apiFetch('/admin/payment/history?limit=50').catch(() => ({ items: [], stats: {} }))
  ]);

  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const st = historyData.stats || {};

  content.innerHTML = `
    ${cuiPageHeader('Thanh toán', 'Kiểm tra giao dịch và cấu hình thanh toán')}

    <!-- Tabs -->
    <div class="admin-tabs" role="tablist">
      <button class="admin-tab active" data-paytab="config" role="tab" aria-selected="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Cấu hình SePay
      </button>
      <button class="admin-tab" data-paytab="history" role="tab" aria-selected="false">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Lịch sử giao dịch
      </button>
    </div>

    <!-- ═══ Tab: SePay Config ═══ -->
    <div class="settings-section active" data-paysection="config">
      ${config.has_env_override ? `
        <div class="card cui-alert-warn">
          <div class="fw-600 mb-4"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Cấu hình từ biến môi trường</div>
          <div class="text-sm text-muted">Một số giá trị đang được ghi đè bởi biến môi trường (env vars). Các giá trị đó không thể chỉnh sửa tại đây.</div>
        </div>
      ` : ''}
      <div class="settings-card">
        <div class="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Cấu hình SePay
        </div>
        <form id="sepay-config-form">
          <div class="form-group">
            <label class="form-label" for="sepay-api-key">API Key (API Token) <span class="required">*</span></label>
            <input class="form-input" id="sepay-api-key" type="password" value="${esc(config.sepay_api_key)}" placeholder="${config.sepay_api_key ? 'Đã cấu hình — để trống nếu giữ nguyên' : 'Dán API Token từ SePay'}" ${config.has_env_override ? 'disabled' : ''} />
            <div class="form-hint">Lấy tại SePay → Cấu hình → API Access → Tạo API Token</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="sepay-account-number">Số tài khoản nhận tiền <span class="required">*</span></label>
            <input class="form-input" id="sepay-account-number" type="text" value="${esc(config.sepay_account_number)}" placeholder="VD: 0123456789" ${config.has_env_override ? 'disabled' : ''} />
            <div class="form-hint">Số tài khoản ngân hàng đã liên kết với SePay (dùng để tạo mã QR VietQR)</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="sepay-bank-code">Mã ngân hàng (Bank Code) <span class="required">*</span></label>
            <input class="form-input" id="sepay-bank-code" type="text" value="${esc(config.sepay_bank_code)}" placeholder="VD: MB, VCB, TCB, ACB, BIDV..." ${config.has_env_override ? 'disabled' : ''} />
            <div class="form-hint">Mã viết tắt ngân hàng theo chuẩn VietQR (MBBank=MB, Vietcombank=VCB, Techcombank=TCB...)</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="sepay-webhook-secret">Webhook API Key / Secret</label>
            <input class="form-input" id="sepay-webhook-secret" type="password" value="${esc(config.sepay_webhook_secret)}" placeholder="${config.sepay_webhook_secret ? 'Đã cấu hình — để trống nếu giữ nguyên' : 'Tự đặt một chuỗi bí mật'}" ${config.has_env_override ? 'disabled' : ''} />
            <div class="form-hint">Chuỗi bí mật để xác thực callback. Phải khớp với "API Key" cấu hình trong phần Webhooks của SePay</div>
          </div>
          <div id="sepay-config-err" class="form-error mb-12" style="display:none"></div>
          <div style="display: flex; gap: 8px;">
            <button type="submit" class="btn btn-primary" ${config.has_env_override ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Lưu cấu hình
            </button>
            <button type="button" class="btn btn-ghost" id="btn-sepay-test">
              Test kết nối
            </button>
          </div>
          <div id="sepay-test-result" class="form-hint mt-8"></div>
        </form>
      </div>

      <!-- ═══ Link Webhook ═══ -->
      <div class="settings-card">
        <div class="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Link Webhook
        </div>
        <div class="form-group">
          <label class="form-label">URL Webhook (dán vào SePay)</label>
          <div style="display:flex; gap:8px; align-items:stretch;">
            <input class="form-input" id="sepay-webhook-url" type="text" readonly value="${esc((config.app_base_url || location.origin).replace(/\/$/, ''))}/api/payment/webhook/sepay" style="flex:1; font-family:monospace; font-size:13px;" />
            <button type="button" class="btn btn-ghost" id="btn-copy-webhook" style="white-space:nowrap;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
          <div class="form-hint">Vào SePay → Cấu hình → Webhooks → Thêm Webhook, dán URL này vào ô "Gọi đến URL"</div>
        </div>
      </div>

      <!-- ═══ Hướng dẫn cấu hình ═══ -->
      <div class="settings-card">
        <div class="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Hướng dẫn cấu hình SePay
        </div>
        <ol class="sepay-guide">
          <li>Đăng ký & đăng nhập tài khoản tại <strong>sepay.vn</strong>, liên kết tài khoản ngân hàng của bạn.</li>
          <li>Vào <strong>Cấu hình → API Access</strong>, tạo một <strong>API Token</strong> mới rồi dán vào ô <strong>API Key</strong> ở trên.</li>
          <li>Nhập <strong>Số tài khoản</strong> và <strong>Mã ngân hàng</strong> (theo chuẩn VietQR) đúng với tài khoản đã liên kết — dùng để sinh mã QR cho khách thanh toán.</li>
          <li>Vào <strong>Cấu hình → Webhooks → Thêm Webhook</strong>:
            <ul>
              <li><strong>Gọi đến URL:</strong> dán Link Webhook ở mục trên.</li>
              <li><strong>Kiểu xác thực:</strong> chọn <em>API Key</em>, nhập đúng chuỗi đã điền ở ô <strong>Webhook Secret</strong>.</li>
              <li><strong>Loại giao dịch:</strong> chọn <em>Chỉ tiền vào (money in)</em>.</li>
            </ul>
          </li>
          <li>Bấm <strong>Lưu cấu hình</strong>, rồi nhấn <strong>Test kết nối</strong> để kiểm tra API Token hợp lệ.</li>
          <li>Khi khách chuyển khoản đúng nội dung <code>ORD&lt;mã đơn&gt;</code>, SePay gọi webhook và đơn được xác nhận tự động.</li>
        </ol>
      </div>
    </div>

    <!-- ═══ Tab: Payment History ═══ -->
    <div class="settings-section" data-paysection="history">
      <!-- Stats row -->
      <div class="stats-grid mb-16">
        <div class="stat-card"><div class="stat-icon green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><div class="stat-label">Doanh thu</div><div class="stat-value">${fmt(st.total_revenue || 0)}</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><div class="stat-label">Chờ TT</div><div class="stat-value">${st.pending || 0}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div><div class="stat-info"><div class="stat-label">Đã TT</div><div class="stat-value">${st.paid || 0}</div></div></div>
        <div class="stat-card"><div class="stat-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><div class="stat-label">Hoàn thành</div><div class="stat-value">${st.completed || 0}</div></div></div>
      </div>

      <!-- Filter -->
      <div class="filter-pills" id="payment-status-filters">
        ${['', 'pending', 'paid', 'completed', 'cancelled'].map(s => `<button class="filter-pill ${s === '' ? 'active' : ''}" data-pfilter="${s}">${s || 'Tất cả'}</button>`).join('')}
      </div>

      <!-- Table -->
      <div class="table-wrap" id="payment-history-table">
        ${_renderPaymentTable(historyData.items)}
      </div>
    </div>
  `;

  // ── Tab switching ──
  qsa('[data-paytab]', content).forEach(tab => {
    tab.onclick = () => {
      qsa('[data-paytab]', content).forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      qsa('[data-paysection]', content).forEach(s => s.classList.remove('active'));
      qs(`[data-paysection="${tab.dataset.paytab}"]`, content)?.classList.add('active');
    };
  });

  // ── SePay config form ──
  qs('#sepay-config-form', content)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = qs('#sepay-config-err', content);
    errEl.style.display = 'none';
    try {
      const payload = {
        sepay_api_key: qs('#sepay-api-key', content).value,
        sepay_account_number: qs('#sepay-account-number', content).value,
        sepay_bank_code: qs('#sepay-bank-code', content).value,
        sepay_webhook_secret: qs('#sepay-webhook-secret', content).value,
      };
      await apiFetch('/admin/settings', { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Đã lưu cấu hình SePay', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });

  const btnTestSepay = qs('#btn-sepay-test', content);
  if (btnTestSepay) {
    btnTestSepay.onclick = async () => {
      const resultEl = qs('#sepay-test-result', content);
      resultEl.textContent = 'Đang kiểm tra...';
      resultEl.style.color = '';
      try {
        const payload = {
          sepay_api_key: qs('#sepay-api-key', content).value,
          sepay_account_number: qs('#sepay-account-number', content).value,
          sepay_bank_code: qs('#sepay-bank-code', content).value,
        };
        const res = await apiFetch('/payment/test', { method: 'POST', body: JSON.stringify(payload) });
        resultEl.textContent = '✓ ' + (res.message || 'Kết nối thành công');
        resultEl.style.color = 'var(--green)';
      } catch (err) {
        resultEl.textContent = '✗ ' + err.message;
        resultEl.style.color = 'var(--red)';
      }
    };
  }

  // ── Copy webhook URL ──
  const btnCopyWebhook = qs('#btn-copy-webhook', content);
  if (btnCopyWebhook) {
    btnCopyWebhook.onclick = async () => {
      const input = qs('#sepay-webhook-url', content);
      try {
        await navigator.clipboard.writeText(input.value);
        toast('Đã copy link webhook', 'success');
      } catch {
        input.select();
        document.execCommand('copy');
        toast('Đã copy link webhook', 'success');
      }
    };
  }

  // ── Payment history filter ──
  qsa('[data-pfilter]', content).forEach(btn => {
    btn.onclick = async () => {
      qsa('[data-pfilter]', content).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.dataset.pfilter;
      const tableEl = qs('#payment-history-table', content);
      tableEl.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
      try {
        const data = await apiFetch(`/admin/payment/history${status ? '?status=' + status : ''}&limit=50`);
        tableEl.innerHTML = _renderPaymentTable(data.items || []);
      } catch (err) {
        tableEl.innerHTML = `<div class="empty-state"><h3>Lỗi tải dữ liệu</h3></div>`;
      }
    };
  });
}

function _renderPaymentTable(items) {
  if (!items || !items.length) {
    return '<div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><h3>Chưa có giao dịch nào</h3></div>';
  }
  return `<table>
    <thead><tr><th>Mã đơn</th><th>Khách</th><th>Sản phẩm</th><th>Số tiền</th><th>PTTT</th><th>Trạng thái</th><th>Ngày tạo</th><th>Cập nhật</th></tr></thead>
    <tbody>${items.map(o => `<tr>
      <td class="td-mono">${o.order_code}</td>
      <td class="text-sm">${o.user_email || '—'}</td>
      <td class="text-sm">${o.product_name || '—'}</td>
      <td class="text-primary">${fmt(o.total_amount)}</td>
      <td class="text-sm">${({ sepay: 'QR Ngân hàng', balance: 'Số dư' })[o.payment_method] || o.payment_method || 'SePay'}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="text-sm text-muted">${fmtDate(o.created_at)}</td>
      <td class="text-sm text-muted">${fmtDate(o.updated_at)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// ── ADMIN ANNOUNCEMENTS ──────────────────────────────────────

async function renderAdminAnnouncements(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  let currentItems = [];

  content.onclick = async (e) => {
    const addBtn = e.target.closest('#btn-add-ann');
    if (addBtn) {
      showAnnouncementModal(null, refresh);
      return;
    }

    const editBtn = e.target.closest('[data-edit-ann]');
    if (editBtn) {
      const ann = currentItems.find(a => a.id === parseInt(editBtn.dataset.editAnn));
      if (ann) showAnnouncementModal(ann, refresh);
      return;
    }

    const delBtn = e.target.closest('[data-del-ann]');
    if (delBtn) {
      e.preventDefault();
      if (!confirm('Xóa thông báo này?')) return;
      try {
        await apiFetch(`/announcements/admin/${delBtn.dataset.delAnn}`, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        await refresh();
      }
      catch (e) { toast(e.message, 'error'); }
      return;
    }
  };

  const refresh = async () => {
    const items = await apiFetch('/announcements/admin/all');
    currentItems = items;
    const typeLabels = { info: 'Thông tin', warning: 'Cảnh báo', promo: 'Khuyến mãi', update: 'Cập nhật' };
    const typeBadge = (t) => {
      const colors = { info: 'badge-blue', warning: 'badge-yellow', promo: 'badge-green', update: 'badge-blue' };
      return `<span class="badge ${colors[t] || 'badge-gray'}">${typeLabels[t] || t}</span>`;
    };
    content.innerHTML = `
      ${cuiPageHeader('Thông báo', 'Đăng và quản lý thông báo hệ thống', '<button class="btn btn-primary" id="btn-add-ann"><i class="fa-solid fa-plus"></i> Thêm thông báo</button>')}
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Tiêu đề</th><th>Loại</th><th>Trạng thái</th><th>Thứ tự</th><th>Ngày tạo</th><th></th></tr></thead>
        <tbody>${items.length ? items.map(a => `<tr>
          <td class="text-muted">#${a.id}</td>
          <td class="td-bold">${a.title}</td>
          <td>${typeBadge(a.type)}</td>
          <td>${a.is_active ? '<span class="badge badge-green">Hiện</span>' : '<span class="badge badge-gray">Ẩn</span>'}</td>
          <td>${a.sort_order}</td>
          <td class="text-sm text-muted">${fmtDate(a.created_at)}</td>
          <td><div class="tbl-actions">
            <button class="tbl-btn tbl-edit" data-edit-ann="${a.id}">Sửa</button>
            <button class="tbl-btn tbl-delete" data-del-ann="${a.id}">Xóa</button>
          </div></td>
        </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Chưa có thông báo nào</td></tr>'}</tbody>
      </table></div>
    `;
  };
  await refresh();
}

function showAnnouncementModal(ann, onDone) {
  const isEdit = !!ann;
  openModal(`
    <h3 class="modal-title mb-16">${isEdit ? 'Sửa thông báo' : 'Thêm thông báo'}</h3>
    <form id="ann-form">
      <div class="form-group">
        <label class="form-label">Tiêu đề</label>
        <input type="text" class="form-input" id="ann-title" value="${ann?.title || ''}" required placeholder="Tiêu đề thông báo..." />
      </div>
      <div class="form-group">
        <label class="form-label">Nội dung <span class="text-muted text-sm">(hỗ trợ HTML)</span></label>
        <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;" id="ann-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-insert="bold" title="In đậm"><b>B</b></button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="italic" title="In nghiêng"><i>I</i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="link" title="Chèn link">🔗</button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="img" title="Chèn ảnh">🖼️</button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="ul" title="Danh sách">• List</button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="h3" title="Heading">H3</button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="quote" title="Trích dẫn">❝</button>
          <button type="button" class="btn btn-ghost btn-sm" data-insert="br" title="Xuống dòng">↵</button>
        </div>
        <textarea class="form-textarea" id="ann-content" rows="8" required placeholder="Nội dung thông báo... Hỗ trợ HTML: <b>, <i>, <a>, <img>, <ul>, <h3>, <blockquote>...">${ann?.content || ''}</textarea>
        <div class="text-sm text-muted" style="margin-top:4px;">Preview:</div>
        <div id="ann-preview" style="border:1px solid var(--border);border-radius:var(--radius);padding:12px;min-height:40px;font-size:13px;line-height:1.6;margin-top:4px;background:var(--bg-page);"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label">Loại</label>
          <select class="form-select" id="ann-type">
            <option value="info" ${ann?.type === 'info' ? 'selected' : ''}>Thông tin</option>
            <option value="warning" ${ann?.type === 'warning' ? 'selected' : ''}>Cảnh báo</option>
            <option value="promo" ${ann?.type === 'promo' ? 'selected' : ''}>Khuyến mãi</option>
            <option value="update" ${ann?.type === 'update' ? 'selected' : ''}>Cập nhật</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Thứ tự</label>
          <input type="number" class="form-input" id="ann-sort" value="${ann?.sort_order || 0}" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="ann-active" ${ann ? (ann.is_active ? 'checked' : '') : 'checked'} />
          <span>Hiển thị</span>
        </label>
      </div>
      <div class="flex gap-8">
        <button type="submit" class="btn btn-primary flex-1">Lưu</button>
        <button type="button" class="btn btn-ghost" id="ann-cancel">Hủy</button>
      </div>
    </form>
  `);

  createRichTextEditor({
    textareaId: 'ann-content',
    toolbarId: 'ann-content-toolbar',
    previewId: 'ann-preview',
    placeholder: 'Nhập nội dung thông báo...',
  });

  const ta = qs('#ann-content');
  const preview = qs('#ann-preview');
  const updatePreview = () => { if (window.syncRichTextEditors) window.syncRichTextEditors(); preview.innerHTML = DOMPurify?.sanitize ? DOMPurify.sanitize(ta.value) : ta.value.replace(/<script[\s\S]*?<\/script>/gi, ''); };
  ta.oninput = updatePreview;
  updatePreview();

  qs('#ann-cancel').onclick = closeModal;
  qs('#ann-form').onsubmit = async (e) => {
    e.preventDefault();
    if (window.syncRichTextEditors) window.syncRichTextEditors();
    const body = {
      title: qs('#ann-title').value.trim(),
      content: qs('#ann-content').value.trim(),
      type: qs('#ann-type').value,
      sort_order: parseInt(qs('#ann-sort').value) || 0,
      is_active: qs('#ann-active').checked,
    };
    try {
      if (isEdit) {
        await apiFetch(`/announcements/admin/${ann.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/announcements/admin/', { method: 'POST', body: JSON.stringify(body) });
      }
      closeModal();
      toast('Đã lưu', 'success');
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN BALANCE
// ═══════════════════════════════════════════════════════════════

async function renderAdminBalance(view) {
  if (!view) return; const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const [usersData, txnData, auditData, withdrawData] = await Promise.all([
      apiFetch('/auth/admin/users'),
      apiFetch('/balance/admin/transactions?limit=30'),
      apiFetch('/balance/admin/audit').catch(() => ({ ok: true, mismatches: [] })),
      apiFetch('/balance/admin/withdrawals?status=pending'),
    ]);
    const pendingCount = withdrawData.total || 0;
    const activeTab = content.dataset.tab || 'users';

    content.innerHTML = `
      ${cuiPageHeader('Quản lý user', 'Quản lý tài khoản, vai trò và số dư người dùng', `
          ${!auditData.ok ? '<span class="badge badge-red">⚠ ' + auditData.mismatches.length + ' bất thường</span>' : '<span class="badge badge-green">✓ Hệ thống OK</span>'}
          <button class="btn btn-primary btn-sm" id="admin-create-user-btn">Thêm user</button>
      `)}

      <div class="admin-tabs" role="tablist">
        <button class="admin-tab ${activeTab === 'users' ? 'active' : ''}" data-tab-btn="users" role="tab" aria-selected="${activeTab === 'users'}">Người dùng</button>
        <button class="admin-tab ${activeTab === 'txn' ? 'active' : ''}" data-tab-btn="txn" role="tab" aria-selected="${activeTab === 'txn'}">Giao dịch</button>
        <button class="admin-tab ${activeTab === 'withdraw' ? 'active' : ''}" data-tab-btn="withdraw" role="tab" aria-selected="${activeTab === 'withdraw'}">
          Yêu cầu rút ${pendingCount > 0 ? `<span class="badge badge-red" style="margin-left:4px">${pendingCount}</span>` : ''}
        </button>
      </div>

      <div id="balance-tab-users" style="${activeTab !== 'users' ? 'display:none' : ''}">
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Email</th><th>Tên</th><th>Role</th><th>Số dư</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            ${usersData.items.map(u => `
              <tr>
                <td>${u.id}</td>
                <td class="text-sm">${u.email}</td>
                <td class="text-sm">${u.display_name || '—'}</td>
                <td class="text-sm">${u.role || 'user'}</td>
                <td class="fw-700 text-success-600">${fmt(u.balance)}</td>
                <td class="text-sm">${u.is_active ? 'Hoạt động' : 'Khóa'}</td>
                <td>
                  <div class="tbl-actions">
                    <button class="tbl-btn tbl-view" data-edit-user='${JSON.stringify(u).replace(/'/g, '&apos;')}'>Sửa</button>
                    <button class="tbl-btn tbl-view" data-adjust-user="${u.id}" data-adjust-email="${u.email}" data-adjust-bal="${u.balance}">Số dư</button>
                    <button class="tbl-btn tbl-view" data-reset-user="${u.id}">Reset MK</button>
                    <button class="tbl-btn tbl-delete" data-delete-user="${u.id}">Xóa</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>

      <div id="balance-tab-txn" style="${activeTab !== 'txn' ? 'display:none' : ''}">
        <div class="table-wrap"><table>
          <thead><tr><th>Thời gian</th><th>User</th><th>Loại</th><th>Số tiền</th><th>Sau GD</th><th>Mô tả</th></tr></thead>
          <tbody>
            ${txnData.items.map(t => {
              const isPos = t.amount > 0;
              const typeLabels = { topup:'Nạp', purchase:'Mua', affiliate_withdraw:'Rút HH', admin_adjust:'Admin', refund:'Hoàn' };
              return `<tr>
                <td class="text-sm text-muted">${fmtDate(t.created_at)}</td>
                <td class="text-sm">${t.user_email || t.user_id}</td>
                <td><span class="badge">${typeLabels[t.type] || t.type}</span></td>
                <td class="fw-700 ${isPos ? 'text-success-600' : 'text-danger-600'}">${isPos ? '+' : ''}${fmt(t.amount)}</td>
                <td class="text-sm">${fmt(t.balance_after)}</td>
                <td class="text-sm text-muted">${t.description || t.reference || '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>

      <div id="balance-tab-withdraw" style="${activeTab !== 'withdraw' ? 'display:none' : ''}">
        ${pendingCount === 0 ? '<div class="empty-state" style="padding:32px 0;"><p class="text-muted">Không có yêu cầu rút nào đang chờ duyệt</p></div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Thời gian</th><th>User</th><th>Số tiền</th><th>Trạng thái</th><th>Mô tả</th><th style="width:140px"></th></tr></thead>
          <tbody>
            ${withdrawData.items.map(w => `
              <tr id="wd-row-${w.id}">
                <td class="text-sm text-muted">${fmtDate(w.created_at)}</td>
                <td class="text-sm">${w.user_email || w.user_name || w.user_id}</td>
                <td class="fw-700 text-warn-600">${fmt(w.amount)}</td>
                <td><span class="badge badge-yellow">Chờ duyệt</span></td>
                <td class="text-sm text-muted">${w.description || '—'}</td>
                <td>
                  <div class="tbl-actions">
                    <button class="tbl-btn tbl-success" data-approve-wd="${w.id}" title="Duyệt">✓ Duyệt</button>
                    <button class="tbl-btn tbl-delete" data-reject-wd="${w.id}" title="Từ chối">✗ Từ chối</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
        `}
      </div>
    `;

    // Create user
    qs('#admin-create-user-btn', content).onclick = () => {
      openModal(`
        <h3 class="modal-title mb-16">Thêm user</h3>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="new-user-email" /></div>
        <div class="form-group"><label class="form-label">Tên hiển thị</label><input type="text" class="form-input" id="new-user-name" /></div>
        <div class="form-group"><label class="form-label">Role</label><select class="form-input" id="new-user-role"><option value="">user</option><option value="staff">staff</option><option value="admin">admin</option></select></div>
        <div id="new-user-err" class="form-error mb-12" style="display:none"></div>
        <button class="btn btn-primary btn-full" id="new-user-submit">Tạo user</button>
      `);
      qs('#new-user-submit').onclick = async () => {
        try {
          await apiFetch('/auth/admin/users', {
            method: 'POST',
            body: JSON.stringify({
              email: qs('#new-user-email').value.trim(),
              display_name: qs('#new-user-name').value.trim(),
              role: qs('#new-user-role').value
            })
          });
          closeModal();
          toast('Đã tạo user', 'success');
          renderAdminBalance(view);
        } catch (err) {
          const elErr = qs('#new-user-err');
          elErr.textContent = err.message;
          elErr.style.display = 'block';
        }
      };
    };

    qsa('[data-edit-user]', content).forEach(btn => {
      btn.onclick = () => {
        const user = JSON.parse(btn.dataset.editUser.replace(/&apos;/g, "'"));
        openModal(`
          <h3 class="modal-title mb-16">Chỉnh sửa user</h3>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="edit-user-email" value="${esc(user.email || '')}" /></div>
          <div class="form-group"><label class="form-label">Tên hiển thị</label><input type="text" class="form-input" id="edit-user-name" value="${esc(user.display_name || '')}" /></div>
          <div class="form-group"><label class="form-label">Avatar URL</label><input type="text" class="form-input" id="edit-user-avatar" value="${esc(user.avatar_url || '')}" /></div>
          <div class="form-group"><label class="form-label">Role</label><select class="form-input" id="edit-user-role"><option value="" ${!user.role ? 'selected' : ''}>user</option><option value="staff" ${user.role === 'staff' ? 'selected' : ''}>staff</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option></select></div>
          <div class="form-group"><label class="form-label"><input type="checkbox" id="edit-user-active" ${user.is_active ? 'checked' : ''} /> Tài khoản hoạt động</label></div>
          <div id="edit-user-err" class="form-error mb-12" style="display:none"></div>
          <button class="btn btn-primary btn-full" id="edit-user-submit">Lưu thay đổi</button>
        `);
        qs('#edit-user-submit').onclick = async () => {
          try {
            await apiFetch(`/auth/admin/users/${user.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                email: qs('#edit-user-email').value.trim(),
                display_name: qs('#edit-user-name').value.trim(),
                avatar_url: qs('#edit-user-avatar').value.trim(),
                role: qs('#edit-user-role').value,
                is_active: qs('#edit-user-active').checked,
              })
            });
            closeModal();
            toast('Đã cập nhật user', 'success');
            renderAdminBalance(view);
          } catch (err) {
            const elErr = qs('#edit-user-err');
            elErr.textContent = err.message;
            elErr.style.display = 'block';
          }
        };
      };
    });

    qsa('[data-reset-user]', content).forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Reset mật khẩu user này và gửi mật khẩu mới qua email?')) return;
        try {
          await apiFetch(`/auth/admin/users/${btn.dataset.resetUser}/reset-password`, { method: 'POST' });
          toast('Đã reset mật khẩu và gửi email', 'success');
        } catch (err) { toast(err.message, 'error'); }
      };
    });

    qsa('[data-delete-user]', content).forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Xóa user này?')) return;
        try {
          await apiFetch(`/auth/admin/users/${btn.dataset.deleteUser}`, { method: 'DELETE' });
          toast('Đã xóa user', 'success');
          renderAdminBalance(view);
        } catch (err) { toast(err.message, 'error'); }
      };
    });

    // Tab switching
    const tabs = ['users', 'txn', 'withdraw'];
    qsa('[data-tab-btn]', content).forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tabBtn;
        content.dataset.tab = tab;
        tabs.forEach(t => {
          const el = qs(`#balance-tab-${t}`, content);
          if (el) el.style.display = t === tab ? '' : 'none';
        });
        qsa('[data-tab-btn]', content).forEach(b => {
          b.classList.toggle('active', b.dataset.tabBtn === tab);
          b.setAttribute('aria-selected', b.dataset.tabBtn === tab);
        });
      };
    });

    // Approve withdrawal
    qsa('[data-approve-wd]', content).forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Duyệt yêu cầu rút hoa hồng này? Số tiền sẽ được cộng vào số dư người dùng.')) return;
        try {
          btn.disabled = true;
          await apiFetch(`/balance/admin/withdrawals/${btn.dataset.approveWd}/approve`, { method: 'POST' });
          toast('Đã duyệt yêu cầu rút', 'success');
          content.dataset.tab = 'withdraw';
          renderAdminBalance(view);
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      };
    });

    // Reject withdrawal
    qsa('[data-reject-wd]', content).forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Từ chối yêu cầu rút hoa hồng này?')) return;
        try {
          btn.disabled = true;
          await apiFetch(`/balance/admin/withdrawals/${btn.dataset.rejectWd}/reject`, { method: 'POST' });
          toast('Đã từ chối yêu cầu', 'success');
          content.dataset.tab = 'withdraw';
          renderAdminBalance(view);
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      };
    });

    // Adjust balance modal
    qsa('[data-adjust-user]', content).forEach(btn => {
      btn.onclick = () => {
        const userId = btn.dataset.adjustUser;
        const email = btn.dataset.adjustEmail;
        const bal = btn.dataset.adjustBal;
        openModal(`
          <h3 class="modal-title mb-16">Điều chỉnh số dư</h3>
          <div class="text-sm text-muted mb-16">${email} — Hiện tại: <strong style="color:#10b981">${fmt(parseFloat(bal))}</strong></div>
          <div class="form-group">
            <label class="form-label">Số tiền (+ nạp, - trừ)</label>
            <input type="number" class="form-input" id="adj-amount" placeholder="VD: 100000 hoặc -50000" />
          </div>
          <div class="form-group">
            <label class="form-label">Lý do</label>
            <input type="text" class="form-input" id="adj-desc" placeholder="Nạp thưởng, hoàn tiền..." />
          </div>
          <div id="adj-err" class="form-error mb-12" style="display:none"></div>
          <div class="flex gap-8">
            <button class="btn btn-primary flex-1" id="adj-submit">Xác nhận</button>
            <button class="btn btn-ghost" id="adj-cancel">Hủy</button>
          </div>
        `);
        qs('#adj-cancel').onclick = closeModal;
        qs('#adj-submit').onclick = async () => {
          const amount = parseInt(qs('#adj-amount').value);
          if (!amount) { qs('#adj-err').textContent = 'Nhập số tiền'; qs('#adj-err').style.display = 'block'; return; }
          try {
            await apiFetch('/balance/admin/adjust', { method: 'POST', body: JSON.stringify({ user_id: parseInt(userId), amount, description: qs('#adj-desc').value }) });
            closeModal();
            toast('Đã điều chỉnh', 'success');
            renderAdminBalance(view);
          } catch (err) { qs('#adj-err').textContent = err.message; qs('#adj-err').style.display = 'block'; }
        };
      };
    });
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Lỗi tải dữ liệu</h3><p class="text-muted">${err.message}</p></div>`;
  }
}

// ── API PROVIDERS ──────────────────────────────────
async function renderAdminApiProviders(view) {
  if (!view) return;
  const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const refresh = async () => {
    const providers = await apiFetch('/api-providers/');
    content.innerHTML = `
      ${cuiPageHeader('Đấu nối API', 'Kết nối nguồn sản phẩm bên ngoài', '<button class="btn btn-primary" id="btn-add-provider"><i class="fa-solid fa-plus"></i> Thêm nguồn</button>')}
      ${providers.length === 0 ? '<div class="empty-state"><i class="fa-solid fa-plug"></i><p>Chưa có nguồn API nào</p></div>' : `
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Tên</th><th>Loại</th><th>Domain</th><th>Số dư</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${providers.map(p => `
          <tr>
            <td class="text-muted">#${p.id}</td>
            <td class="td-bold">${esc(p.name)}</td>
            <td><span class="badge ${p.provider_type === 'account_premium' ? 'badge-blue' : p.provider_type === 'giftcard' ? 'badge-orange' : p.provider_type === 'smm_panel' ? 'badge-cyan' : 'badge-purple'}">${p.provider_type === 'account_premium' ? 'Account Premium' : p.provider_type === 'giftcard' ? 'Gift Card' : p.provider_type === 'smm_panel' ? 'SMM Panel' : 'Topup Game'}</span></td>
            <td class="td-mono text-sm">${esc(p.base_url)}</td>
            <td class="td-balance" id="bal-${p.id}"><span class="text-muted">—</span></td>
            <td>${p.is_active ? '<span class="badge badge-green">Hoạt động</span>' : '<span class="badge badge-gray">Tắt</span>'}</td>
            <td><div class="tbl-actions">
              <button class="tbl-btn" data-test-provider="${p.id}"><i class="fa-solid fa-wifi"></i> Test</button>
              <button class="tbl-btn tbl-edit" data-edit-provider="${p.id}">Sửa</button>
              <button class="tbl-btn tbl-delete" data-del-provider="${p.id}">Xóa</button>
            </div></td>
          </tr>
        `).join('')}</tbody>
      </table></div>`}
    `;
    // Auto-fetch balance for active providers
    for (const p of providers) {
      if (!p.is_active) continue;
      const cell = document.getElementById('bal-' + p.id);
      if (!cell) continue;
      cell.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-muted"></i>';
      apiFetch('/api-providers/' + p.id + '/test', { method: 'POST' }).then(res => {
        if (res.ok && res.data) {
          const d = res.data;
          const bal = d.balance !== undefined ? Number(d.balance).toLocaleString('vi-VN') + ' ₫' : (d.formatted || '—');
          cell.innerHTML = '<span class="text-success fw-600">' + bal + '</span>';
        } else {
          cell.innerHTML = '<span class="text-danger">Lỗi</span>';
        }
      }).catch(() => { cell.innerHTML = '<span class="text-danger">Lỗi</span>'; });
    }
  };

  content.onclick = async (e) => {
    const addBtn = e.target.closest('#btn-add-provider');
    if (addBtn) { showProviderModal(null, refresh); return; }

    const editBtn = e.target.closest('[data-edit-provider]');
    if (editBtn) {
      const providers = await apiFetch('/api-providers/');
      const p = providers.find(x => x.id === parseInt(editBtn.dataset.editProvider));
      showProviderModal(p, refresh);
      return;
    }

    const delBtn = e.target.closest('[data-del-provider]');
    if (delBtn) {
      if (!confirm('Xóa nguồn API này?')) return;
      try {
        await apiFetch('/api-providers/' + delBtn.dataset.delProvider, { method: 'DELETE' });
        toast('Đã xóa', 'success');
        refresh();
      } catch(err) { toast(err.message, 'error'); }
      return;
    }

    const testBtn = e.target.closest('[data-test-provider]');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang test...';
      try {
        const res = await apiFetch('/api-providers/' + testBtn.dataset.testProvider + '/test', { method: 'POST' });
        if (res.ok) {
          const d = res.data || {};
          const info = d.formatted || (d.balance !== undefined ? Number(d.balance).toLocaleString('vi-VN') + ' ₫' : '') || d.username || 'OK';
          toast('Kết nối thành công! ' + info, 'success');
          // Update balance cell
          const cell = document.getElementById('bal-' + testBtn.dataset.testProvider);
          if (cell && d.balance !== undefined) {
            cell.innerHTML = '<span class="text-success fw-600">' + Number(d.balance).toLocaleString('vi-VN') + ' ₫</span>';
          }
        } else {
          toast('Lỗi: ' + (res.error || res.detail || 'Unknown'), 'error');
        }
      } catch(err) { toast('Test thất bại: ' + (err.message || err), 'error'); }
      testBtn.disabled = false;
      testBtn.innerHTML = '<i class="fa-solid fa-wifi"></i> Test';
    }
  };

  await refresh();
}

function showProviderModal(prov, refresh) {
  const isEdit = !!prov;
  openModal(`
    <form id="provider-form">
      <div class="form-group"><label class="form-label">Tên hiển thị<span class="req">*</span></label><input class="form-input" id="prov-name" value="${prov?.name || ''}" required placeholder="Ví dụ: Shop ABC" /></div>
      <div class="form-group"><label class="form-label">Loại API<span class="req">*</span></label>
        <select class="form-select" id="prov-type" ${isEdit ? 'disabled' : ''}>
          <option value="account_premium" ${prov?.provider_type === 'account_premium' || !prov ? 'selected' : ''}>Account Premium</option>
          <option value="topup_game" ${prov?.provider_type === 'topup_game' ? 'selected' : ''}>Topup Game</option>
          <option value="giftcard" ${prov?.provider_type === 'giftcard' ? 'selected' : ''}>Gift Card</option>
          <option value="smm_panel" ${prov?.provider_type === 'smm_panel' ? 'selected' : ''}>SMM Panel</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Domain / Base URL<span class="req">*</span></label><input class="form-input" id="prov-url" value="${prov?.base_url || ''}" required placeholder="https://shop.example.com" /></div>
      <div class="form-group"><label class="form-label">API Key<span class="req">*</span></label><input class="form-input" id="prov-key" value="" required placeholder="${isEdit ? '(giữ nguyên nếu không đổi)' : 'Nhập API Key'}" ${isEdit ? '' : ''} /></div>
      <div class="form-group" id="prov-secret-group"><label class="form-label">API Secret</label><input class="form-input" id="prov-secret" value="" placeholder="${isEdit ? '(giữ nguyên nếu không đổi)' : 'Nhập API Secret'}" /></div>
      <div class="form-group" id="prov-partner-group" style="display:none"><label class="form-label">Partner ID</label><input class="form-input" id="prov-partner-id" value="${prov?.partner_id || ''}" placeholder="Partner ID từ hệ thống thẻ cào" /></div>
      <div class="form-group" id="prov-callback-group" style="display:none">
        <label class="form-label">Callback URL</label>
        <div style="display:flex;gap:8px;align-items:stretch;">
          <input class="form-input" id="prov-callback-url" readonly value="${location.origin}/api/card-charge/callback" style="flex:1;font-family:monospace;font-size:13px;" />
          <button type="button" class="btn btn-ghost" id="prov-copy-callback" style="white-space:nowrap;"><i class="fa-solid fa-copy"></i> Copy</button>
        </div>
        <div class="text-muted text-sm mt-4">Copy link này dán vào cấu hình callback bên nhà cung cấp thẻ. Khi thẻ được duyệt, hệ thống tự cộng số dư.</div>
      </div>
      <div id="prov-exchange-group" style="display:none">
        <div class="form-group">
          <label class="form-label">Đổi thẻ (nạp số dư)</label>
          <label class="toggle-switch"><input type="checkbox" id="prov-exchange-toggle" ${prov?.card_rates?.discount_rate != null ? 'checked' : ''} /><span class="toggle-slider"></span></label>
          <div class="text-muted text-sm mt-4">Bật để cho phép user nạp thẻ cào đổi số dư</div>
        </div>
        <div id="prov-exchange-panel" style="display:${prov?.card_rates?.discount_rate != null ? '' : 'none'}">
          <div class="form-group">
            <label class="form-label">Chiết khấu chung (%)</label>
            <input type="number" class="form-input" id="prov-discount-rate" value="${prov?.card_rates?.discount_rate ?? ''}" placeholder="20" min="0" max="100" step="0.5" />
            <div class="text-muted text-sm mt-4">Áp dụng cho tất cả nhà mạng. VD: 20% → thẻ 100k nhận 80k</div>
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-select" id="prov-active"><option value="true" ${prov?.is_active !== false ? 'selected' : ''}>Hoạt động</option><option value="false" ${prov?.is_active === false ? 'selected' : ''}>Tắt</option></select></div>
      <div id="prov-form-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">${isEdit ? 'Cập nhật' : 'Tạo mới'}</button><button type="button" class="btn btn-ghost" id="prov-cancel">Hủy</button></div>
    </form>
  `, isEdit ? 'Sửa nguồn API' : 'Thêm nguồn API');

  const typeSelect = qs('#prov-type');
  const secretGroup = qs('#prov-secret-group');
  const partnerGroup = qs('#prov-partner-group');
  const callbackGroup = qs('#prov-callback-group');
  const exchangeGroup = qs('#prov-exchange-group');
  const updateSecretVis = () => {
    const t = typeSelect.value;
    secretGroup.style.display = t === 'account_premium' ? '' : 'none';
    partnerGroup.style.display = t === 'giftcard' ? '' : 'none';
    callbackGroup.style.display = t === 'giftcard' ? '' : 'none';
    exchangeGroup.style.display = t === 'giftcard' ? '' : 'none';
    // Update API Key label based on type
    const keyLabel = qs('#prov-key').closest('.form-group').querySelector('.form-label');
    if (keyLabel) keyLabel.innerHTML = t === 'giftcard' ? 'Partner Key<span class="req">*</span>' : 'API Key<span class="req">*</span>';
  };
  typeSelect.onchange = updateSecretVis;
  updateSecretVis();

  // Copy callback URL
  const copyCallbackBtn = qs('#prov-copy-callback');
  if (copyCallbackBtn) copyCallbackBtn.onclick = async () => {
    const inp = qs('#prov-callback-url');
    try { await navigator.clipboard.writeText(inp.value); toast('Đã copy callback URL', 'success'); }
    catch { inp.select(); document.execCommand('copy'); toast('Đã copy callback URL', 'success'); }
  };

  // Exchange toggle
  const exchangeToggle = qs('#prov-exchange-toggle');
  const exchangePanel = qs('#prov-exchange-panel');
  if (exchangeToggle) {
    exchangeToggle.onchange = () => { exchangePanel.style.display = exchangeToggle.checked ? '' : 'none'; };
  }

  // Copy callback URL on click
  const cbUrl = qs('#prov-callback-url');
  if (cbUrl) cbUrl.onclick = () => { navigator.clipboard.writeText(cbUrl.value); toast('Đã copy callback URL', 'success'); };

  qs('#prov-cancel').onclick = closeModal;
  qs('#provider-form').onsubmit = async (e) => {
    e.preventDefault();
    const provType = prov?.provider_type || qs('#prov-type').value;
    const body = {
      name: qs('#prov-name').value,
      provider_type: provType,
      base_url: qs('#prov-url').value,
      api_key: qs('#prov-key').value,
      api_secret: provType === 'account_premium' ? (qs('#prov-secret').value || undefined) : null,
      is_active: qs('#prov-active').value === 'true',
    };
    if (provType === 'giftcard') {
      body.partner_id = qs('#prov-partner-id')?.value || null;
      if (qs('#prov-exchange-toggle')?.checked) {
        const dr = parseFloat(qs('#prov-discount-rate')?.value);
        body.card_rates = { discount_rate: isNaN(dr) ? 0 : dr, exchange_enabled: true };
      } else {
        body.card_rates = { exchange_enabled: false };
      }
    }
    // If editing and key is empty, don't send it (keep old)
    if (isEdit && !body.api_key) delete body.api_key;
    if (isEdit && body.api_secret === undefined) delete body.api_secret;

    try {
      if (isEdit) await apiFetch('/api-providers/' + prov.id, { method: 'PUT', body: JSON.stringify(body) });
      else await apiFetch('/api-providers/', { method: 'POST', body: JSON.stringify(body) });
      closeModal();
      toast(isEdit ? 'Đã cập nhật' : 'Đã tạo nguồn mới', 'success');
      refresh();
    } catch(err) {
      const el = qs('#prov-form-err');
      el.textContent = err.message;
      el.style.display = 'block';
    }
  };
}

// ── SMM PANEL ──────────────────────────────────────────────────

// ═══════════════ 1. PLATFORMS ═══════════════
async function renderAdminSmmPlatforms(view) {
  if (!view) return;
  const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const refresh = async () => {
    const platforms = await apiFetch('/smm/platforms');
    content.innerHTML = `
      ${cuiPageHeader('Nền tảng SMM', 'Quản lý nền tảng mạng xã hội', '<button class="btn btn-primary" id="btn-add-platform"><i class="fa-solid fa-plus"></i> Thêm nền tảng</button>')}
      ${platforms.length === 0 ? '<div class="empty-state"><i class="fa-solid fa-share-nodes"></i><p>Chưa có nền tảng nào</p></div>' : `
      <div class="table-wrap"><table>
        <thead><tr><th>Icon</th><th>Tên</th><th>Slug</th><th>Danh mục</th><th>Dịch vụ</th><th>Trạng thái</th><th>Thứ tự</th><th></th></tr></thead>
        <tbody>${platforms.map(p => `<tr>
          <td>${p.icon_url ? `<img src="${p.icon_url}" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />` : '<span class="text-muted">—</span>'}</td>
          <td class="td-bold">${esc(p.name)}</td><td class="td-mono text-sm">${esc(p.slug)}</td>
          <td>${p.category_count??0}</td><td>${p.service_count??0}</td>
          <td>${p.is_active?'<span class="badge badge-green">Hoạt động</span>':'<span class="badge badge-gray">Tắt</span>'}</td>
          <td>${p.sort_order??0}</td>
          <td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit-platform="${p.id}">Sửa</button><button class="tbl-btn tbl-delete" data-del-platform="${p.id}">Xóa</button></div></td>
        </tr>`).join('')}</tbody></table></div>`}`;
  };
  const showModal = (platform) => {
    const isEdit = !!platform;
    openModal(`<form id="smm-platform-form">
      <div class="form-group"><label class="form-label">Tên nền tảng<span class="req">*</span></label><input class="form-input" id="sp-name" value="${platform?.name||''}" required placeholder="Ví dụ: Instagram" /></div>
      <div class="form-group">
        <label class="form-label">Icon</label>
        <div class="flex gap-8 items-center">
          <input class="form-input flex-1" id="sp-icon" value="${platform?.icon_url||''}" placeholder="https://... hoặc dùng nút Upload" />
          ${imageUploadControl('sp-icon', 'sp-icon-upload', 'Upload', 'sp-icon-preview')}
        </div>
        <div class="admin-upload-preview admin-upload-preview-sm" id="sp-icon-preview">${platform?.icon_url ? `<img src="${platform.icon_url}" alt="Icon preview" />` : '<span>Chưa có icon</span>'}</div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Thứ tự</label><input type="number" class="form-input" id="sp-order" value="${platform?.sort_order??0}" /></div>
        <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-select" id="sp-active"><option value="true" ${platform?.is_active!==false?'selected':''}>Hoạt động</option><option value="false" ${platform?.is_active===false?'selected':''}>Tắt</option></select></div>
      </div>
      <div id="sp-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8 justify-end"><button type="button" class="btn btn-ghost" id="sp-cancel">Hủy</button><button type="submit" class="btn btn-primary">${isEdit?'Cập nhật':'Tạo mới'}</button></div>
    </form>`, isEdit ? `Sửa: ${platform.name}` : 'Thêm nền tảng');
    qs('#sp-cancel').onclick = closeModal;
    bindImageUploads(qs('#modal-content'));
    qs('#smm-platform-form').onsubmit = async (e) => {
      e.preventDefault();
      const body = { name: qs('#sp-name').value, icon_url: qs('#sp-icon').value||null, sort_order: parseInt(qs('#sp-order').value)||0, is_active: qs('#sp-active').value==='true' };
      try {
        if (isEdit) await apiFetch(`/smm/platforms/${platform.id}`,{method:'PUT',body:JSON.stringify(body)});
        else await apiFetch('/smm/platforms',{method:'POST',body:JSON.stringify(body)});
        closeModal(); toast(isEdit?'Đã cập nhật':'Đã tạo','success'); refresh();
      } catch(err){ qs('#sp-err').textContent=err.message; qs('#sp-err').style.display='block'; }
    };
  };
  content.onclick = async (e) => {
    if (e.target.closest('#btn-add-platform')) { showModal(null); return; }
    const eb = e.target.closest('[data-edit-platform]');
    if (eb) { const ps = await apiFetch('/smm/platforms'); const p = ps.find(x=>x.id===parseInt(eb.dataset.editPlatform)); if(p) showModal(p); return; }
    const db = e.target.closest('[data-del-platform]');
    if (db) { if(!confirm('Xóa nền tảng này?')) return; try{ await apiFetch(`/smm/platforms/${db.dataset.delPlatform}`,{method:'DELETE'}); toast('Đã xóa','success'); refresh(); }catch(err){toast(err.message,'error');} }
  };
  await refresh();
}

// ═══════════════ 2. CATEGORIES ═══════════════
async function renderAdminSmmCategories(view) {
  if (!view) return;
  const content = view;
  let filterPlatformId = '';
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const refresh = async () => {
    const [platforms, allCats, providers] = await Promise.all([
      apiFetch('/smm/platforms'),
      apiFetch('/smm/categories/all'),
      apiFetch('/api-providers/').catch(()=>[]),
    ]);
    const smmProviders = (providers || []).filter(p => p.provider_type === 'smm_panel' && p.is_active && (p.settings?.sync_categories !== false));
    const cats = filterPlatformId ? allCats.filter(c=>c.platform_id===parseInt(filterPlatformId)) : allCats;
    const syncBtn = smmProviders.length > 0
      ? `<button class="smm-svc-sync-btn" id="btn-sync-cats" style="padding:7px 14px;font-size:13px" title="Đồng bộ danh mục từ nguồn"><i class="fa-solid fa-arrows-rotate"></i> Đồng bộ từ nguồn</button>`
      : '';
    content.innerHTML = `
      ${cuiPageHeader('Danh mục SMM', `${cats.length} danh mục`, `${syncBtn}<button class="btn btn-primary" id="btn-add-category"><i class="fa-solid fa-plus"></i> Thêm danh mục</button>`)}
      <div class="d-flex align-center gap-8 mb-16 p-16" style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:8px;">
        <label class="form-label mb-0">Lọc nền tảng:</label>
        <select class="form-select" id="smm-filter-plat-cat" style="width:200px;"><option value="">Tất cả</option>${platforms.map(p=>`<option value="${p.id}" ${filterPlatformId==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      </div>
      ${cats.length===0?'<div class="empty-state"><i class="fa-solid fa-folder"></i><p>Chưa có danh mục</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Nền tảng</th><th>Tên</th><th>Dịch vụ</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${cats.map(c=>`<tr>
          <td class="text-muted">#${c.id}</td>
          <td class="text-sm">${c.platform_icon?`<img src="${c.platform_icon}" style="width:16px;height:16px;border-radius:2px;vertical-align:middle;margin-right:4px;" />`:''}${esc(c.platform_name)}</td>
          <td class="td-bold">${esc(c.name)}</td><td>${c.service_count??0}</td><td>${c.sort_order??0}</td>
          <td>${c.is_active?'<span class="badge badge-green">Hiện</span>':'<span class="badge badge-gray">Ẩn</span>'}</td>
          <td><div class="tbl-actions"><button class="tbl-btn tbl-edit" data-edit-category="${c.id}">Sửa</button><button class="tbl-btn tbl-delete" data-del-category="${c.id}">Xóa</button></div></td>
        </tr>`).join('')}</tbody></table></div>`}`;
  };
  const showModal = async (cat) => {
    const isEdit = !!cat;
    const platforms = await apiFetch('/smm/platforms');
    const selPlat = isEdit ? cat.platform_id : filterPlatformId;
    openModal(`<form id="smm-cat-form">
      <div class="form-group"><label class="form-label">Nền tảng<span class="req">*</span></label><select class="form-select" id="sc-platform" required ${isEdit?'disabled':''}><option value="">Chọn nền tảng</option>${platforms.map(p=>`<option value="${p.id}" ${selPlat==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Tên danh mục<span class="req">*</span></label><input class="form-input" id="sc-name" value="${cat?.name||''}" required /></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Thứ tự</label><input type="number" class="form-input" id="sc-order" value="${cat?.sort_order??0}" /></div>
        <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-select" id="sc-active"><option value="true" ${cat?.is_active!==false?'selected':''}>Hiện</option><option value="false" ${cat?.is_active===false?'selected':''}>Ẩn</option></select></div>
      </div>
      <div id="sc-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8 justify-end"><button type="button" class="btn btn-ghost" id="sc-cancel">Hủy</button><button type="submit" class="btn btn-primary">${isEdit?'Cập nhật':'Tạo mới'}</button></div>
    </form>`, isEdit ? `Sửa: ${cat.name}` : 'Thêm danh mục');
    qs('#sc-cancel').onclick = closeModal;
    qs('#smm-cat-form').onsubmit = async (e) => {
      e.preventDefault();
      const platId = isEdit ? cat.platform_id : qs('#sc-platform').value;
      if (!platId) { qs('#sc-err').textContent='Chọn nền tảng'; qs('#sc-err').style.display='block'; return; }
      const body = { name: qs('#sc-name').value, sort_order: parseInt(qs('#sc-order').value)||0, is_active: qs('#sc-active').value==='true' };
      try {
        if (isEdit) await apiFetch(`/smm/categories/${cat.id}`,{method:'PUT',body:JSON.stringify(body)});
        else await apiFetch(`/smm/platforms/${platId}/categories`,{method:'POST',body:JSON.stringify(body)});
        closeModal(); toast(isEdit?'Đã cập nhật':'Đã tạo','success'); refresh();
      } catch(err){ qs('#sc-err').textContent=err.message; qs('#sc-err').style.display='block'; }
    };
  };
  const showSyncModal = async () => {
    const [smmProviders, platforms] = await Promise.all([
      apiFetch('/smm/providers').catch(()=>[]),
      apiFetch('/smm/platforms'),
    ]);
    const usable = (smmProviders||[]).filter(p => p.is_active && (p.settings?.sync_categories !== false));
    if (!usable.length) { toast('Chưa có nguồn SMM hoặc tất cả đều tắt "Đồng bộ Chuyên mục".','warning'); return; }
    if (!platforms.length) { toast('Chưa có nền tảng — tạo nền tảng trước.','warning'); return; }

    const state = {
      step: 1,
      providerId: '',
      platformId: filterPlatformId || '',
      remoteCats: [], // [{name,count,exists,slug}]
      selected: new Set(),
      searchQ: '',
    };

    openModal(`
      <div class="smm-sync-wizard">
        <div class="smm-sync-stepper">
          <div class="smm-sync-step is-active" data-step="1"><span>1</span>Nguồn</div>
          <div class="smm-sync-step" data-step="2"><span>2</span>Chọn danh mục</div>
          <div class="smm-sync-step" data-step="3"><span>3</span>Đồng bộ</div>
        </div>
        <div id="csw-body"></div>
        <div id="csw-err" class="form-error mb-12" style="display:none"></div>
        <div class="smm-sync-footer">
          <button type="button" class="btn btn-ghost" id="csw-cancel">Hủy</button>
          <button type="button" class="btn btn-outline" id="csw-back" style="display:none">← Quay lại</button>
          <button type="button" class="btn btn-primary" id="csw-next">Tiếp tục →</button>
        </div>
      </div>
    `, 'Đồng bộ danh mục từ nguồn');

    const $body = qs('#csw-body');
    const $err = qs('#csw-err');
    const $next = qs('#csw-next');
    const $back = qs('#csw-back');
    const showErr = (m) => { $err.textContent = m||''; $err.style.display = m?'block':'none'; };
    const updateStepper = () => {
      qsa('.smm-sync-step', qs('.smm-sync-wizard')).forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.toggle('is-active', s === state.step);
        el.classList.toggle('is-done', s < state.step);
      });
      $back.style.display = state.step > 1 ? '' : 'none';
      $next.innerHTML = state.step === 3 ? '<i class="fa-solid fa-arrows-rotate"></i> Đồng bộ' : 'Tiếp tục →';
    };

    const renderStep1 = () => {
      $body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Chọn nguồn API (SMM)<span class="req">*</span></label>
          <select class="form-select" id="csw-prov">
            <option value="">— Chọn nguồn —</option>
            ${usable.map(p=>`<option value="${p.id}" ${state.providerId==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nền tảng đích<span class="req">*</span></label>
          <select class="form-select" id="csw-plat">
            <option value="">— Chọn nền tảng —</option>
            ${platforms.map(p=>`<option value="${p.id}" ${state.platformId==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
          <div class="form-hint">Các danh mục được chọn sẽ tạo trong nền tảng này.</div>
        </div>
      `;
      qs('#csw-prov').onchange = (e) => { state.providerId = e.target.value; showErr(''); };
      qs('#csw-plat').onchange = (e) => { state.platformId = e.target.value; showErr(''); };
    };

    const renderListInto = (containerId, q='') => {
      const ql = q.toLowerCase();
      const filtered = state.remoteCats.filter(c => !ql || c.name.toLowerCase().includes(ql));
      const $c = qs(containerId, $body);
      if (!$c) return;
      $c.innerHTML = filtered.length ? `<div class="smm-sync-cats">${filtered.map(c => {
        const checked = state.selected.has(c.name) ? 'checked' : '';
        const badge = c.exists ? '<span class="badge badge-gray">đã có</span>' : '<span class="badge badge-green">mới</span>';
        return `<label class="smm-sync-cat${state.selected.has(c.name)?' is-active':''}">
          <input type="checkbox" class="csw-item" data-name="${esc(c.name)}" ${checked}/>
          <div class="smm-sync-cat-name">${esc(c.name)} ${badge}</div>
          <div class="smm-sync-cat-count">${c.count} dịch vụ</div>
        </label>`;
      }).join('')}</div>` : '<div class="empty-state"><p>Không khớp</p></div>';
      qs('#csw-count').textContent = `Đã chọn ${state.selected.size} / ${state.remoteCats.length}`;
    };

    const renderStep2 = () => {
      $body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Tìm danh mục</label>
          <input type="text" id="csw-search" class="form-input" placeholder="Lọc theo tên..." value="${esc(state.searchQ)}"/>
        </div>
        <div class="d-flex gap-8 mb-12 align-center text-sm">
          <button type="button" class="btn btn-ghost btn-sm" id="csw-all">Tất cả</button>
          <button type="button" class="btn btn-ghost btn-sm" id="csw-none">Bỏ chọn</button>
          <button type="button" class="btn btn-ghost btn-sm" id="csw-new">Chỉ mục mới</button>
          <span class="text-muted" id="csw-count" style="margin-left:auto"></span>
        </div>
        <div id="csw-list"></div>
      `;
      renderListInto('#csw-list', state.searchQ);
      qs('#csw-search').oninput = (e) => { state.searchQ = e.target.value; renderListInto('#csw-list', state.searchQ); };
      qs('#csw-all').onclick = () => { state.remoteCats.forEach(c => state.selected.add(c.name)); renderListInto('#csw-list', state.searchQ); };
      qs('#csw-none').onclick = () => { state.selected.clear(); renderListInto('#csw-list', state.searchQ); };
      qs('#csw-new').onclick = () => { state.selected.clear(); state.remoteCats.forEach(c => { if (!c.exists) state.selected.add(c.name); }); renderListInto('#csw-list', state.searchQ); };
      $body.addEventListener('change', (e) => {
        if (e.target.classList?.contains('csw-item')) {
          const n = e.target.dataset.name;
          if (e.target.checked) state.selected.add(n); else state.selected.delete(n);
          qs('#csw-count').textContent = `Đã chọn ${state.selected.size} / ${state.remoteCats.length}`;
          e.target.closest('.smm-sync-cat')?.classList.toggle('is-active', e.target.checked);
        }
      });
    };

    const renderStep3 = () => {
      const provName = (usable.find(p => p.id == state.providerId) || {}).name || '';
      const platName = (platforms.find(p => p.id == state.platformId) || {}).name || '';
      const newCount = Array.from(state.selected).filter(n => {
        const c = state.remoteCats.find(x => x.name === n);
        return c && !c.exists;
      }).length;
      $body.innerHTML = `
        <div class="form-group">
          <div class="form-label">Xác nhận đồng bộ</div>
          <div class="text-muted text-sm mb-12">Sẽ tạo danh mục mới trong nền tảng đích. Các tên đã tồn tại sẽ bỏ qua.</div>
          <div class="cui-card" style="padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-surface)">
            <div><b>Nguồn:</b> ${esc(provName)}</div>
            <div><b>Nền tảng đích:</b> ${esc(platName)}</div>
            <div><b>Đã chọn:</b> ${state.selected.size} danh mục (${newCount} mục mới sẽ được tạo)</div>
          </div>
        </div>
      `;
    };

    const renderStep = () => {
      updateStepper();
      if (state.step === 1) renderStep1();
      else if (state.step === 2) renderStep2();
      else renderStep3();
    };

    const goNext = async () => {
      showErr('');
      if (state.step === 1) {
        if (!state.providerId) { showErr('Chọn nguồn'); return; }
        if (!state.platformId) { showErr('Chọn nền tảng đích'); return; }
        $next.disabled = true; $next.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
        try {
          const r = await apiFetch(`/smm/providers/${state.providerId}/remote-categories?platform_id=${state.platformId}`);
          state.remoteCats = r.categories || [];
          state.selected = new Set(state.remoteCats.filter(c => !c.exists).map(c => c.name));
          if (!state.remoteCats.length) { showErr('Nguồn không trả về danh mục nào'); $next.disabled=false; updateStepper(); return; }
          state.step = 2; renderStep();
        } catch (err) { showErr(err.message); }
        finally { $next.disabled = false; updateStepper(); }
        return;
      }
      if (state.step === 2) {
        if (state.selected.size === 0) { showErr('Chọn ít nhất 1 danh mục'); return; }
        state.step = 3; renderStep(); return;
      }
      if (state.step === 3) {
        $next.disabled = true; $next.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
        try {
          const r = await apiFetch('/smm/categories/sync', { method:'POST', body: JSON.stringify({
            provider_id: parseInt(state.providerId),
            platform_id: parseInt(state.platformId),
            category_names: Array.from(state.selected),
          }) });
          closeModal();
          toast(`Đã tạo ${r.created} / ${r.existed} đã tồn tại`, 'success');
          refresh();
        } catch (err) { showErr(err.message); $next.disabled = false; updateStepper(); }
      }
    };

    qs('#csw-cancel').onclick = closeModal;
    $back.onclick = () => { if (state.step > 1) { state.step--; showErr(''); renderStep(); } };
    $next.onclick = goNext;
    renderStep();
  };
  content.onclick = async (e) => {
    if (e.target.closest('#btn-sync-cats')) { showSyncModal(); return; }
    if (e.target.closest('#btn-add-category')) { showModal(null); return; }
    const eb = e.target.closest('[data-edit-category]');
    if (eb) { const cs = await apiFetch('/smm/categories/all'); const c = cs.find(x=>x.id===parseInt(eb.dataset.editCategory)); if(c) showModal(c); return; }
    const db = e.target.closest('[data-del-category]');
    if (db) { if(!confirm('Xóa danh mục này?')) return; try{ await apiFetch(`/smm/categories/${db.dataset.delCategory}`,{method:'DELETE'}); toast('Đã xóa','success'); refresh(); }catch(err){toast(err.message,'error');} }
  };
  content.onchange = async (e) => { if (e.target.id==='smm-filter-plat-cat') { filterPlatformId=e.target.value; await refresh(); } };
  await refresh();
}

// ═══════════════ 3. SERVICES ═══════════════
async function renderAdminSmmServices(view) {
  if (!view) return;
  const content = view;
  let filterPlatformId = '', filterCategoryId = '', filterProviderId = '', searchQuery = '';
  let currentPage = 1;
  const PAGE_SIZE = 10;
  const selectedIds = new Set();
  let currentFilteredIds = [];
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const refresh = async () => {
    const [platforms, allCats, allSvcs, providers] = await Promise.all([
      apiFetch('/smm/platforms'),
      apiFetch('/smm/categories/all'),
      apiFetch('/smm/services/all'),
      apiFetch('/api-providers/').catch(()=>[]),
    ]);
    const smmProviders = providers.filter(p => p.provider_type === 'smm_panel');
    const filtCats = filterPlatformId ? allCats.filter(c=>c.platform_id===parseInt(filterPlatformId)) : allCats;
    let svcs = allSvcs;
    if (filterPlatformId) svcs = svcs.filter(s=>s.platform_id===parseInt(filterPlatformId));
    if (filterCategoryId) svcs = svcs.filter(s=>s.category_id===parseInt(filterCategoryId));
    if (filterProviderId) svcs = svcs.filter(s=>String(s.api_provider_id||'')===String(filterProviderId));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      svcs = svcs.filter(s => (s.name||'').toLowerCase().includes(q) || String(s.id).includes(q));
    }
    const totalCount = svcs.length;
    currentFilteredIds = svcs.map(s => s.id);
    const allFilteredSelected = totalCount > 0 && currentFilteredIds.every(id => selectedIds.has(id));
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const pageSvcs = svcs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const buildPager = () => {
      if (totalPages <= 1) return '';
      const btns = [];
      btns.push(`<button class="smm-pg-btn" data-page="prev" ${currentPage===1?'disabled':''}>‹</button>`);
      const maxBtns = 7;
      let start = Math.max(1, currentPage - 3), end = Math.min(totalPages, start + maxBtns - 1);
      start = Math.max(1, end - maxBtns + 1);
      if (start > 1) { btns.push(`<button class="smm-pg-btn" data-page="1">1</button>`); if (start > 2) btns.push(`<span class="smm-pg-ellipsis">…</span>`); }
      for (let p = start; p <= end; p++) btns.push(`<button class="smm-pg-btn${p===currentPage?' is-active':''}" data-page="${p}">${p}</button>`);
      if (end < totalPages) { if (end < totalPages-1) btns.push(`<span class="smm-pg-ellipsis">…</span>`); btns.push(`<button class="smm-pg-btn" data-page="${totalPages}">${totalPages}</button>`); }
      btns.push(`<button class="smm-pg-btn" data-page="next" ${currentPage===totalPages?'disabled':''}>›</button>`);
      const from = (currentPage-1)*PAGE_SIZE + 1, to = Math.min(currentPage*PAGE_SIZE, totalCount);
      return `<div class="smm-svc-pagination"><div class="smm-pg-info">Hiển thị ${from}-${to} / ${totalCount}</div><div class="smm-pg-btns">${btns.join('')}</div></div>`;
    };

    const cardsHtml = svcs.length === 0
      ? '<div class="empty-state"><i class="fa-solid fa-list"></i><p>Chưa có dịch vụ phù hợp</p></div>'
      : `<div class="smm-svc-list">${pageSvcs.map((s, i) => `
          <div class="smm-svc-card${selectedIds.has(s.id)?' is-selected':''}" data-svc-id="${s.id}">
            <div class="smm-svc-card-top">
              <label class="smm-svc-cb"><input type="checkbox" data-svc-select="${s.id}" ${selectedIds.has(s.id)?'checked':''}/><span></span></label>
              <label class="smm-switch sm" title="Bật/Tắt"><input type="checkbox" data-svc-toggle="${s.id}" ${s.is_active?'checked':''}/><span class="smm-switch-slider"></span></label>
            </div>
            <div class="smm-svc-num">#${s.sort_order || (i+1)}</div>
            <div class="smm-svc-name" title="${esc(s.name)}">${esc(s.name)}${s.can_refill?'':' <span class="smm-svc-norefill">🚫 No Refill</span>'}</div>
            <div class="smm-svc-tags">
              ${s.category_name?`<span class="smm-tag smm-tag-cat">${esc(s.category_name)}</span>`:''}
              ${s.api_provider_name?`<span class="smm-tag smm-tag-prov">${esc(s.api_provider_name)}${s.external_service_id?` (SID: ${esc(String(s.external_service_id))})`:''}</span>`:''}
            </div>
            <div class="smm-svc-price-box">
              <div class="smm-svc-price-row"><span>Giá bán:</span><span class="smm-svc-price-sale">${fmt(s.rate)} <u>đ</u></span></div>
              <div class="smm-svc-price-row"><span>Giá gốc:</span><span class="smm-svc-price-cost">${s.cost_rate>0?fmt(s.cost_rate):'—'}${s.cost_rate>0?' <u>đ</u>':''}</span></div>
            </div>
            <div class="smm-svc-minmax">Min: <b>${Number(s.min_quantity||0).toLocaleString()}</b> | Max: <b>${Number(s.max_quantity||0).toLocaleString()}</b></div>
            <div class="smm-svc-actions">
              <button class="btn btn-outline btn-sm" data-edit-service="${s.id}"><i class="fa-solid fa-pen"></i> Chỉnh sửa</button>
              <button class="btn btn-outline btn-sm smm-svc-del" data-del-service="${s.id}"><i class="fa-regular fa-trash-can"></i> Xóa bỏ</button>
            </div>
          </div>`).join('')}</div>`;

    content.innerHTML = `
      <div class="smm-svc-header">
        <h1 class="smm-svc-title">Quản lý Dịch vụ SMM</h1>
        <p class="smm-svc-subtitle">Quản lý giá bán, tình trạng và nhà cung cấp cho các dịch vụ</p>
        <div class="smm-svc-header-btns">
          ${smmProviders.some(p => p.is_active && (p.settings?.sync_services !== false)) ? `<button class="smm-svc-sync-btn" id="btn-sync-services"><i class="fa-solid fa-arrows-rotate"></i> Đồng bộ từ nguồn</button>` : ''}
          <button class="smm-svc-sync-btn" id="btn-round-prices" title="Làm tròn giá bán về số nguyên (<.5 làm tròn xuống, ≥.5 làm tròn lên)"><i class="fa-solid fa-calculator"></i> Làm tròn giá</button>
          <button class="btn btn-primary" id="btn-add-service"><i class="fa-solid fa-plus"></i> Thêm dịch vụ</button>
        </div>
      </div>
      <div class="smm-svc-toolbar">
        <div class="smm-svc-filters">
          <select class="form-select" id="smm-filter-cat-svc">
            <option value="">Lọc theo danh mục</option>
            ${filtCats.map(c=>`<option value="${c.id}" ${filterCategoryId==c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
          <select class="form-select" id="smm-filter-prov-svc">
            <option value="">Lọc theo nhà cung cấp</option>
            ${smmProviders.map(p=>`<option value="${p.id}" ${filterProviderId==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
          <div class="smm-svc-search">
            <input type="text" id="smm-svc-search" class="form-input" placeholder="Tìm theo tên dịch vụ..." value="${esc(searchQuery)}" />
            <button class="smm-svc-search-btn" type="button"><i class="fa-solid fa-magnifying-glass"></i></button>
          </div>
        </div>
        <label class="smm-svc-select-all">
          <input type="checkbox" id="smm-select-all" ${allFilteredSelected?'checked':''}/>
          <span></span>
          Chọn tất cả (${totalCount})
        </label>
        ${selectedIds.size>0?`<div class="smm-svc-bulk-bar">
          <span>Đã chọn ${selectedIds.size}</span>
          <button class="btn btn-outline btn-sm" id="smm-bulk-on">Bật</button>
          <button class="btn btn-outline btn-sm" id="smm-bulk-off">Tắt</button>
          <button class="btn btn-outline btn-sm smm-svc-del" id="smm-bulk-del">Xóa</button>
        </div>`:''}
        ${cardsHtml}
        ${buildPager()}
      </div>`;
  };
  const showServiceModal = async (svc) => {
    const isEdit = !!svc;
    const [platforms, allCats, providers] = await Promise.all([apiFetch('/smm/platforms'), apiFetch('/smm/categories/all'), apiFetch('/api-providers/').catch(()=>[])]);
    const smmP = providers.filter(p=>p.provider_type==='smm_panel');
    const selCatId = isEdit?svc.category_id:filterCategoryId;
    const selCat = allCats.find(c=>c.id===parseInt(selCatId));
    const selPlatId = isEdit?(svc.platform_id||selCat?.platform_id):(filterPlatformId||selCat?.platform_id||'');
    const avgIsAuto = svc?.avg_time_minutes == null;
    const serviceTypeMeta = [
      { v: 'Default', label: 'Default (Mặc định)', desc: 'Phù hợp cho dịch vụ truyền thống' },
      { v: 'Package', label: 'Package', desc: 'Dùng cho dịch vụ theo gói, đặt hàng mỗi lần 1 gói, không hiển thị ô số lượng khi order' },
      { v: 'Custom Comments', label: 'Custom Comments', desc: 'Phù hợp cho dịch vụ tăng bình luận, mỗi dòng bình luận tương ứng với số lượng 1, không hiển thị ô nhập số lượng' },
      { v: 'Custom Comments Package', label: 'Custom Comments Package', desc: 'Phù hợp cho dịch vụ tăng bình luận theo gói, có ô nhập số lượng' },
      { v: 'Mentions Hashtag', label: 'Mentions Hashtag', desc: 'Có ô nhập hashtag' },
      { v: 'Subscriptions', label: 'Subscriptions', desc: 'Phù hợp cho dịch vụ đăng ký gói' },
      { v: 'SEO', label: 'SEO', desc: 'Phù hợp cho dịch vụ SEO' },
    ];
    const currentType = svc?.service_type || 'Default';
    const platOptions = platforms.map(p=>`<option value="${p.id}" ${selPlatId==p.id?'selected':''}>${esc(p.name)}</option>`).join('');
    const catOptionsFor = (pid) => allCats.filter(c=>!pid||c.platform_id===parseInt(pid))
      .map(c=>`<option value="${c.id}" ${selCatId==c.id?'selected':''}>${esc(c.name)}</option>`).join('');
    openModal(`<form id="smm-svc-form" class="smm-svc-form">
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label">Danh mục <span class="form-hint-inline">(Yêu cầu chọn danh mục con)</span><span class="req">*</span></label>
          <select class="form-select" id="ss-platform"><option value="">— Chọn nền tảng —</option>${platOptions}</select>
          <select class="form-select mt-8" id="ss-category" required ${selPlatId?'':'disabled'}><option value="">— Chọn danh mục con —</option>${catOptionsFor(selPlatId)}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Nhà cung cấp (API)</label>
          <select class="form-select" id="ss-provider"><option value="">Không (thủ công)</option>${smmP.map(p=>`<option value="${p.id}" ${svc?.api_provider_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Tên dịch vụ<span class="req">*</span></label><input class="form-input" id="ss-name" value="${esc(svc?.name||'')}" required placeholder="VD: FB Like Giá Rẻ" /></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">ID hiển thị <span class="form-hint-inline">(tự đặt, 0 = auto theo thứ tự)</span></label><input type="number" class="form-input" id="ss-order" value="${svc?.sort_order??0}" placeholder="VD: 101" /></div>
        <div class="form-group"><label class="form-label">ID dịch vụ từ Provider</label><input class="form-input" id="ss-ext-id" value="${esc(svc?.external_service_id||'')}" placeholder="VD: 145" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Giá bán (1,000)<span class="req">*</span></label><input type="number" step="0.01" class="form-input" id="ss-rate" value="${svc?.rate??0}" required /></div>
        <div class="form-group"><label class="form-label">Giá gốc (lấy từ API)</label><input type="number" step="0.01" class="form-input" id="ss-cost" value="${svc?.cost_rate??0}" placeholder="0" readonly tabindex="-1" style="background:var(--bg-page,#f3f4f6);cursor:not-allowed;color:var(--text-muted);" title="Tự động lấy từ nguồn khi đồng bộ — không chỉnh sửa" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Số lượng Min</label><input type="number" class="form-input" id="ss-min" value="${svc?.min_quantity??100}" /></div>
        <div class="form-group"><label class="form-label">Số lượng Max</label><input type="number" class="form-input" id="ss-max" value="${svc?.max_quantity??100000}" /></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label class="form-label">Loại dịch vụ (Type)</label>
          <select class="form-select" id="ss-stype">${serviceTypeMeta.map(t=>`<option value="${t.v}" ${currentType===t.v?'selected':''}>${t.label}</option>`).join('')}</select>
          <div class="smm-type-hint" id="ss-stype-hint">
            <i class="fa-regular fa-circle-info"></i>
            <div><b>Mô tả loại dịch vụ:</b><br/><span id="ss-stype-hint-text"></span></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Thời gian hoàn thành TB (Phút)</label>
          <div class="flex gap-8 items-center">
            <input type="number" class="form-input flex-1" id="ss-avg" value="${svc?.avg_time_minutes??0}" ${avgIsAuto?'disabled':''} placeholder="0" />
            <label class="flex items-center gap-6" style="white-space:nowrap;cursor:pointer;font-size:13px;"><input type="checkbox" id="ss-avg-auto" ${avgIsAuto?'checked':''} /> Auto</label>
          </div>
          <div class="form-hint" id="ss-avg-hint" style="${avgIsAuto?'':'display:none'}">
            ${svc?.computed_avg_time_minutes != null
              ? `Auto: <b>${svc.computed_avg_time_minutes}</b> phút / 1.000 (TB 10 đơn gần nhất)`
              : 'Auto: chưa đủ dữ liệu — tính từ 10 đơn hoàn thành gần nhất, chuẩn hoá về số lượng 1.000'}
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <label class="smm-switch"><input type="checkbox" id="ss-active" ${svc?.is_active!==false?'checked':''} /><span class="smm-switch-slider"></span><span class="smm-switch-label">Bật</span></label>
      </div>
      <div class="smm-feature-card">
        <div class="smm-feature-card-title">Tính năng bổ sung</div>
        <div class="smm-feature-grid">
          <label class="smm-feature-item"><span>Drip-feed</span><span class="smm-switch sm"><input type="checkbox" id="ss-drip" ${svc?.drip_feed?'checked':''} /><span class="smm-switch-slider"></span></span></label>
          <label class="smm-feature-item"><span>Refill</span><span class="smm-switch sm"><input type="checkbox" id="ss-refill" ${svc?.can_refill?'checked':''} /><span class="smm-switch-slider"></span></span></label>
          <label class="smm-feature-item"><span>Cho phép Hủy</span><span class="smm-switch sm"><input type="checkbox" id="ss-cancel" ${svc?.can_cancel?'checked':''} /><span class="smm-switch-slider"></span></span></label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả dịch vụ</label>
        <div class="editor-toolbar" id="ss-desc-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="bold"><b>B</b></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="italic"><i>I</i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="underline"><u>U</u></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="link"><i class="fa-solid fa-link"></i> Link</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ul"><i class="fa-solid fa-list-ul"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="ol"><i class="fa-solid fa-list-ol"></i></button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="h2">H2</button>
          <button type="button" class="btn btn-ghost btn-sm" data-editor-action="html"><i class="fa-solid fa-code"></i> HTML</button>
        </div>
        <textarea class="form-textarea rich-textarea" id="ss-desc" rows="6" placeholder="Nhập mô tả chi tiết dịch vụ...">${svc?.description||''}</textarea>
      </div>
      <div id="ss-err" class="form-error mb-12" style="display:none"></div>
      <div class="flex gap-8 justify-end"><button type="button" class="btn btn-ghost" id="ss-cancel-btn">Cancel</button><button type="submit" class="btn btn-primary">OK</button></div>
    </form>`, isEdit ? `Sửa: ${svc.name}` : 'Thêm dịch vụ mới');
    // Cascade: platform → category
    const platSel = qs('#ss-platform'), catSel = qs('#ss-category');
    platSel.onchange = () => {
      const pid = platSel.value;
      const kids = allCats.filter(c=>!pid||c.platform_id===parseInt(pid));
      catSel.disabled = !pid;
      catSel.innerHTML = '<option value="">— Chọn danh mục con —</option>' + kids.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
    };
    // Avg time auto checkbox
    const avgInput = qs('#ss-avg'), avgAuto = qs('#ss-avg-auto'), avgHint = qs('#ss-avg-hint');
    avgAuto.onchange = () => { avgInput.disabled = avgAuto.checked; avgHint.style.display = avgAuto.checked?'':'none'; };
    // Service type hint
    const stypeSel = qs('#ss-stype'), stypeHintTxt = qs('#ss-stype-hint-text');
    const _updateStypeHint = () => {
      const meta = serviceTypeMeta.find(m => m.v === stypeSel.value) || serviceTypeMeta[0];
      stypeHintTxt.textContent = meta.desc;
    };
    stypeSel.onchange = _updateStypeHint;
    _updateStypeHint();
    qs('#ss-cancel-btn').onclick = closeModal;
    createRichTextEditor({ textarea: qs('#ss-desc'), toolbarId: 'ss-desc-toolbar', placeholder: 'Nhập mô tả chi tiết dịch vụ...', minHeight: 220 });
    qs('#smm-svc-form').onsubmit = async (e) => {
      e.preventDefault();
      if (window.syncRichTextEditors) window.syncRichTextEditors();
      const catId = catSel.value;
      if (!catId) { qs('#ss-err').textContent='Vui lòng chọn danh mục con'; qs('#ss-err').style.display='block'; return; }
      const providerId = qs('#ss-provider').value;
      const body = {
        name: qs('#ss-name').value,
        description: qs('#ss-desc').value || null,
        rate: parseFloat(qs('#ss-rate').value)||0,
        cost_rate: parseFloat(qs('#ss-cost').value)||0,
        min_quantity: parseInt(qs('#ss-min').value)||1,
        max_quantity: parseInt(qs('#ss-max').value)||10000,
        delivery_type: providerId ? 'api' : 'manual',
        api_provider_id: providerId ? parseInt(providerId) : null,
        external_service_id: qs('#ss-ext-id').value || null,
        can_refill: qs('#ss-refill').checked,
        can_cancel: qs('#ss-cancel').checked,
        drip_feed: qs('#ss-drip').checked,
        service_type: qs('#ss-stype').value || 'Default',
        avg_time_minutes: avgAuto.checked ? null : (parseInt(avgInput.value)||0),
        sort_order: parseInt(qs('#ss-order').value)||0,
        is_active: qs('#ss-active').checked,
      };
      try {
        if (isEdit) await apiFetch(`/smm/services/${svc.id}`,{method:'PUT',body:JSON.stringify(body)});
        else await apiFetch(`/smm/categories/${catId}/services`,{method:'POST',body:JSON.stringify(body)});
        closeModal(); toast(isEdit?'Đã cập nhật':'Đã tạo','success'); refresh();
      } catch(err){ qs('#ss-err').textContent=err.message; qs('#ss-err').style.display='block'; }
    };
  };
  const showSyncModal = async () => {
    const [smmProviders, platforms, allCats] = await Promise.all([
      apiFetch('/smm/providers').catch(()=>[]),
      apiFetch('/smm/platforms'),
      apiFetch('/smm/categories/all'),
    ]);
    if(!smmProviders.length){toast('Chưa có nguồn SMM. Tạo nguồn ở mục Nhà cung cấp API trước.','warning');return;}
    if(!allCats.length){toast('Chưa có danh mục SMM nội bộ. Tạo danh mục trước.','warning');return;}

    // Wizard state
    const state = {
      step: 1,
      providerId: '',
      remoteCats: [],         // [{name, count}]
      remoteServices: [],     // full list
      selectedCat: '',        // remote category name
      searchQ: '',
      selectedSids: new Set(),
      targetCatId: '',
      targetPlatId: filterPlatformId || '',
    };

    openModal(`
      <div class="smm-sync-wizard">
        <div class="smm-sync-stepper">
          <div class="smm-sync-step is-active" data-step="1"><span>1</span>Nguồn</div>
          <div class="smm-sync-step" data-step="2"><span>2</span>Danh mục</div>
          <div class="smm-sync-step" data-step="3"><span>3</span>Chọn dịch vụ</div>
          <div class="smm-sync-step" data-step="4"><span>4</span>Đồng bộ</div>
        </div>
        <div id="smm-sync-body"></div>
        <div id="smm-sync-err" class="form-error mb-12" style="display:none"></div>
        <div class="smm-sync-footer">
          <button type="button" class="btn btn-ghost" id="sync-cancel">Hủy</button>
          <button type="button" class="btn btn-outline" id="sync-back" style="display:none">← Quay lại</button>
          <button type="button" class="btn btn-primary" id="sync-next">Tiếp tục →</button>
        </div>
      </div>
    `, 'Đồng bộ dịch vụ từ nguồn');

    const $body = qs('#smm-sync-body');
    const $err = qs('#smm-sync-err');
    const $next = qs('#sync-next');
    const $back = qs('#sync-back');
    const showErr = (m) => { $err.textContent = m || ''; $err.style.display = m ? 'block' : 'none'; };

    const updateStepper = () => {
      qsa('.smm-sync-step', qs('.smm-sync-wizard')).forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.toggle('is-active', s === state.step);
        el.classList.toggle('is-done', s < state.step);
      });
      $back.style.display = state.step > 1 ? '' : 'none';
      $next.textContent = state.step === 4 ? '✓ Đồng bộ' : (state.step === 3 ? 'Tiếp tục →' : 'Tiếp tục →');
    };

    const renderStep1 = () => {
      $body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Chọn nguồn API (SMM)<span class="req">*</span></label>
          <select class="form-select" id="sw-prov">
            <option value="">— Chọn nguồn —</option>
            ${smmProviders.map(p=>`<option value="${p.id}" ${state.providerId==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
          <div class="form-hint">Nguồn sẽ cung cấp danh sách danh mục và dịch vụ để chọn.</div>
        </div>
      `;
      qs('#sw-prov', $body).onchange = (e) => { state.providerId = e.target.value; showErr(''); };
    };

    const renderStep2 = () => {
      const list = state.remoteCats.length === 0
        ? '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Nguồn không trả về danh mục.</p></div>'
        : `<div class="smm-sync-cats">${state.remoteCats.map(c => `
            <label class="smm-sync-cat${state.selectedCat===c.name?' is-active':''}">
              <input type="radio" name="sw-cat" value="${esc(c.name)}" ${state.selectedCat===c.name?'checked':''}/>
              <div class="smm-sync-cat-name">${esc(c.name)}</div>
              <div class="smm-sync-cat-count">${c.count} dịch vụ</div>
            </label>
          `).join('')}</div>`;
      $body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Tìm danh mục</label>
          <input type="text" id="sw-cat-search" class="form-input" placeholder="Lọc theo tên danh mục..." />
        </div>
        <div id="sw-cat-list">${list}</div>
      `;
      const renderList = (q='') => {
        const ql = q.toLowerCase();
        const filtered = state.remoteCats.filter(c => !ql || c.name.toLowerCase().includes(ql));
        qs('#sw-cat-list', $body).innerHTML = filtered.length === 0
          ? '<div class="empty-state"><p>Không có danh mục phù hợp</p></div>'
          : `<div class="smm-sync-cats">${filtered.map(c => `
              <label class="smm-sync-cat${state.selectedCat===c.name?' is-active':''}">
                <input type="radio" name="sw-cat" value="${esc(c.name)}" ${state.selectedCat===c.name?'checked':''}/>
                <div class="smm-sync-cat-name">${esc(c.name)}</div>
                <div class="smm-sync-cat-count">${c.count} dịch vụ</div>
              </label>
            `).join('')}</div>`;
      };
      qs('#sw-cat-search', $body).oninput = (e) => renderList(e.target.value);
      $body.addEventListener('change', (e) => {
        if (e.target.name === 'sw-cat') {
          state.selectedCat = e.target.value;
          qsa('.smm-sync-cat', $body).forEach(el => el.classList.toggle('is-active', el.querySelector('input').checked));
          showErr('');
        }
      });
    };

    const renderStep3 = () => {
      const inCat = state.remoteServices.filter(s => s.category === state.selectedCat);
      const renderTable = (q='') => {
        const ql = (q||'').toLowerCase().trim();
        const filtered = ql
          ? inCat.filter(s => String(s.service).includes(ql) || (s.name||'').toLowerCase().includes(ql))
          : inCat;
        const allOnPageChecked = filtered.length > 0 && filtered.every(s => state.selectedSids.has(s.service));
        qs('#sw-svc-list', $body).innerHTML = `
          <div class="smm-sync-svc-head">
            <label class="smm-sync-svc-check-all">
              <input type="checkbox" id="sw-all" ${allOnPageChecked?'checked':''}/>
              <span>Chọn tất cả (${filtered.length})</span>
            </label>
            <div class="smm-sync-svc-selected">Đã chọn: <b>${state.selectedSids.size}</b></div>
          </div>
          <div class="smm-sync-svc-list">
            ${filtered.length === 0
              ? '<div class="empty-state"><p>Không có dịch vụ phù hợp</p></div>'
              : filtered.map(s => `
                <label class="smm-sync-svc${state.selectedSids.has(s.service)?' is-selected':''}">
                  <input type="checkbox" data-sid="${s.service}" ${state.selectedSids.has(s.service)?'checked':''}/>
                  <div class="smm-sync-svc-main">
                    <div class="smm-sync-svc-id">#${s.service}</div>
                    <div class="smm-sync-svc-name">${esc(s.name)}</div>
                  </div>
                  <div class="smm-sync-svc-meta">
                    <span class="smm-sync-svc-price">${fmt(s.rate_local)} đ/1000</span>
                    <span class="smm-sync-svc-mm">Min ${Number(s.min).toLocaleString()} · Max ${Number(s.max).toLocaleString()}</span>
                    <span class="smm-sync-svc-type">${esc(s.type)}</span>
                  </div>
                </label>
              `).join('')}
          </div>`;
        qs('#sw-all', $body).onchange = (e) => {
          if (e.target.checked) filtered.forEach(s => state.selectedSids.add(s.service));
          else filtered.forEach(s => state.selectedSids.delete(s.service));
          renderTable(qs('#sw-svc-search', $body).value);
        };
        qsa('[data-sid]', $body).forEach(cb => {
          cb.onchange = (e) => {
            const sid = parseInt(e.target.dataset.sid);
            if (e.target.checked) state.selectedSids.add(sid);
            else state.selectedSids.delete(sid);
            e.target.closest('.smm-sync-svc').classList.toggle('is-selected', e.target.checked);
            qs('.smm-sync-svc-selected', $body).innerHTML = `Đã chọn: <b>${state.selectedSids.size}</b>`;
          };
        });
      };
      $body.innerHTML = `
        <div class="smm-sync-cat-pill">Danh mục provider: <b>${esc(state.selectedCat)}</b> (${inCat.length} dịch vụ)</div>
        <div class="form-group">
          <input type="text" id="sw-svc-search" class="form-input" placeholder="Tìm theo ID hoặc tên dịch vụ..." value="${esc(state.searchQ)}"/>
        </div>
        <div id="sw-svc-list"></div>
      `;
      renderTable(state.searchQ);
      qs('#sw-svc-search', $body).oninput = (e) => {
        state.searchQ = e.target.value;
        renderTable(state.searchQ);
      };
    };

    const renderStep4 = () => {
      const platOptions = platforms.map(p=>`<option value="${p.id}" ${state.targetPlatId==p.id?'selected':''}>${esc(p.name)}</option>`).join('');
      const catFor = (pid) => allCats.filter(c=>!pid||c.platform_id===parseInt(pid))
        .map(c=>`<option value="${c.id}" ${state.targetCatId==c.id?'selected':''}>${esc(c.name)}</option>`).join('');
      $body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Đồng bộ <b>${state.selectedSids.size}</b> dịch vụ vào danh mục nội bộ</label>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Nền tảng<span class="req">*</span></label>
            <select class="form-select" id="sw-plat"><option value="">— Chọn —</option>${platOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Danh mục đích<span class="req">*</span></label>
            <select class="form-select" id="sw-tcat" ${state.targetPlatId?'':'disabled'}>
              <option value="">— Chọn —</option>${catFor(state.targetPlatId)}
            </select>
          </div>
        </div>
        <div class="form-hint">Các dịch vụ đã chọn sẽ được tạo mới hoặc cập nhật nếu đã tồn tại (cùng nguồn + SID).</div>
      `;
      qs('#sw-plat', $body).onchange = (e) => {
        state.targetPlatId = e.target.value;
        state.targetCatId = '';
        const sel = qs('#sw-tcat', $body);
        sel.disabled = !state.targetPlatId;
        sel.innerHTML = `<option value="">— Chọn —</option>${catFor(state.targetPlatId)}`;
      };
      qs('#sw-tcat', $body).onchange = (e) => { state.targetCatId = e.target.value; showErr(''); };
    };

    const render = () => {
      updateStepper();
      showErr('');
      if (state.step === 1) renderStep1();
      else if (state.step === 2) renderStep2();
      else if (state.step === 3) renderStep3();
      else if (state.step === 4) renderStep4();
    };

    $back.onclick = () => { if (state.step > 1) { state.step--; render(); } };
    qs('#sync-cancel').onclick = closeModal;

    $next.onclick = async () => {
      try {
        if (state.step === 1) {
          if (!state.providerId) { showErr('Chọn nguồn API trước.'); return; }
          $next.disabled = true; $next.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
          const data = await apiFetch(`/smm/providers/${state.providerId}/remote-services`);
          state.remoteCats = data.categories || [];
          state.remoteServices = data.services || [];
          state.step = 2; render();
        } else if (state.step === 2) {
          if (!state.selectedCat) { showErr('Chọn một danh mục từ nguồn.'); return; }
          state.step = 3; render();
        } else if (state.step === 3) {
          if (state.selectedSids.size === 0) { showErr('Chọn ít nhất một dịch vụ.'); return; }
          state.step = 4; render();
        } else if (state.step === 4) {
          if (!state.targetCatId) { showErr('Chọn danh mục đích.'); return; }
          $next.disabled = true; $next.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
          const res = await apiFetch('/smm/services/sync-selected', {
            method: 'POST',
            body: JSON.stringify({
              provider_id: parseInt(state.providerId),
              target_category_id: parseInt(state.targetCatId),
              external_service_ids: [...state.selectedSids],
            }),
          });
          toast(`Đã đồng bộ ${res.selected||0} dịch vụ (Tạo ${res.created||0}, Cập nhật ${res.updated||0})`, 'success');
          closeModal();
          refresh();
        }
      } catch (err) {
        showErr(err.message || String(err));
      } finally {
        $next.disabled = false;
        $next.textContent = state.step === 4 ? '✓ Đồng bộ' : 'Tiếp tục →';
      }
    };

    render();
  };
  content.onclick = async (e) => {
    if(e.target.closest('#btn-add-service')){showServiceModal(null);return;}
    if(e.target.closest('#btn-sync-services')){showSyncModal();return;}
    const eb=e.target.closest('[data-edit-service]');
    if(eb){const ss=await apiFetch('/smm/services/all');const s=ss.find(x=>x.id===parseInt(eb.dataset.editService));if(s)showServiceModal(s);return;}
    const db=e.target.closest('[data-del-service]');
    if(db){if(!confirm('Xóa dịch vụ này?'))return;try{await apiFetch(`/smm/services/${db.dataset.delService}`,{method:'DELETE'});toast('Đã xóa','success');refresh();}catch(err){toast(err.message,'error');}return;}
    if(e.target.closest('.smm-svc-search-btn')){currentPage=1;refresh();return;}
    const pgBtn = e.target.closest('[data-page]');
    if(pgBtn && !pgBtn.disabled){
      const v = pgBtn.dataset.page;
      if(v==='prev') currentPage = Math.max(1, currentPage-1);
      else if(v==='next') currentPage = currentPage + 1;
      else currentPage = parseInt(v) || 1;
      refresh();
      return;
    }
    if(e.target.closest('#smm-bulk-on') || e.target.closest('#smm-bulk-off')){
      const onMode = !!e.target.closest('#smm-bulk-on');
      try {
        await Promise.all([...selectedIds].map(id =>
          apiFetch(`/smm/services/${id}/active`,{method:'PATCH',body:JSON.stringify({is_active:onMode})})
        ));
        toast(onMode?'Đã bật':'Đã tắt','success'); selectedIds.clear(); refresh();
      } catch(err){ toast(err.message,'error'); }
      return;
    }
    if(e.target.closest('#smm-bulk-del')){
      if(!confirm(`Xóa ${selectedIds.size} dịch vụ?`))return;
      try {
        const ids = [...selectedIds];
        const r = await apiFetch('/smm/services/bulk-delete',{method:'POST',body:JSON.stringify({ids})});
        toast(`Đã xóa ${r.deleted||ids.length}`,'success');
        selectedIds.clear(); refresh();
      } catch(err){ toast(err.message,'error'); }
      return;
    }
    if(e.target.closest('#btn-round-prices')){
      const ids = selectedIds.size > 0 ? [...selectedIds] : currentFilteredIds;
      if(!ids.length){ toast('Không có dịch vụ nào để làm tròn','warning'); return; }
      const scope = selectedIds.size > 0 ? `${ids.length} dịch vụ đã chọn` : `${ids.length} dịch vụ đang lọc`;
      const unitStr = prompt(`Làm tròn theo bội số nào? (vd 100, 500, 1000)\n\nPhạm vi: ${scope}\nQuy tắc: <½ bội số → làm tròn xuống, ≥½ → làm tròn lên`, '1000');
      if(unitStr === null) return;
      const unit = parseInt(unitStr);
      if(!unit || unit < 1){ toast('Bội số không hợp lệ','error'); return; }
      try {
        const r = await apiFetch('/smm/services/round-prices',{method:'POST',body:JSON.stringify({ids, unit})});
        toast(`Đã làm tròn ${r.updated}/${r.total} dịch vụ (bội ${r.unit})`,'success');
        refresh();
      } catch(err){ toast(err.message,'error'); }
      return;
    }
  };
  content.onchange = async (e) => {
    if(e.target.id==='smm-filter-cat-svc'){filterCategoryId=e.target.value;currentPage=1;await refresh();return;}
    if(e.target.id==='smm-filter-prov-svc'){filterProviderId=e.target.value;currentPage=1;await refresh();return;}
    if(e.target.id==='smm-select-all'){
      if(e.target.checked){currentFilteredIds.forEach(id=>selectedIds.add(id));}
      else { currentFilteredIds.forEach(id=>selectedIds.delete(id)); }
      await refresh();
      return;
    }
    if(e.target.dataset.svcSelect){
      const id = parseInt(e.target.dataset.svcSelect);
      if(e.target.checked) selectedIds.add(id); else selectedIds.delete(id);
      const card = e.target.closest('.smm-svc-card');
      if(card) card.classList.toggle('is-selected', e.target.checked);
      return;
    }
    if(e.target.dataset.svcToggle){
      const id = parseInt(e.target.dataset.svcToggle);
      const wantActive = e.target.checked;
      try {
        await apiFetch(`/smm/services/${id}/active`,{method:'PATCH',body:JSON.stringify({is_active:wantActive})});
        toast(wantActive?'Đã bật':'Đã tắt','success');
      } catch(err){ toast(err.message,'error'); e.target.checked = !wantActive; }
      return;
    }
  };
  content.oninput = (e) => {
    if(e.target.id==='smm-svc-search'){
      searchQuery = e.target.value || '';
      currentPage = 1;
      clearTimeout(content._smmSearchT);
      content._smmSearchT = setTimeout(refresh, 250);
    }
  };
  await refresh();
}

// ═══════════════ 4. ORDERS ═══════════════
async function renderAdminSmmOrders(view) {
  if (!view) return;
  const content = view;
  let orderStatus = '', orderSearch = '', orderPage = 1;
  const LIMIT = 10;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const sLabels = { pending:'Chờ xử lý', processing:'Đang xử lý', in_progress:'Đang chạy', completed:'Hoàn thành', partial:'Hoàn một phần', canceled:'Đã hủy' };
  const sOpts = ['pending','processing','in_progress','completed','partial','canceled'];
  const fmtD = (iso) => { if(!iso) return '—'; const d=new Date(iso); return d.toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}); };
  const fmtD2 = (iso) => { if(!iso) return '—'; const d=new Date(iso); return d.toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); };
  const copyBtn = (text) => `<button class="smm-copy-btn" data-copy="${esc(text)}" title="Sao chép"><i class="fa-regular fa-clipboard"></i></button>`;

  const refresh = async () => {
    let url = `/smm/admin/orders?limit=${LIMIT}&page=${orderPage}`;
    if (orderStatus) url += `&status=${orderStatus}`;
    if (orderSearch) url += `&search=${encodeURIComponent(orderSearch)}`;
    const data = await apiFetch(url);
    const orders = data.orders || [], total = data.total || 0, totalPages = Math.ceil(total / LIMIT) || 1;
    const st = data.stats || {};

    content.innerHTML = `
      ${cuiPageHeader('Quản lý Đơn hàng SMM', 'Theo dõi, cập nhật và xử lý tất cả các đơn hàng của người dùng')}

      <!-- Controls -->
      <div class="smm-admin-controls">
        <button class="smm-admin-filter-btn${orderStatus||orderSearch?' active':''}" id="smm-filter-toggle">
          <i class="fa-solid fa-filter"></i> Bộ lọc
        </button>
        <button class="smm-admin-refresh-btn" id="btn-check-all">
          <i class="fa-solid fa-arrows-rotate"></i> Làm mới dữ liệu
        </button>
      </div>

      <!-- Filter panel -->
      <div class="smm-admin-filter-panel${orderStatus||orderSearch?' open':''}" id="smm-filter-panel">
        <select class="form-select" id="smm-order-status">
          <option value="">Tất cả trạng thái</option>
          ${sOpts.map(s => `<option value="${s}" ${orderStatus===s?'selected':''}>${sLabels[s]}</option>`).join('')}
        </select>
        <input type="text" class="smm-search-input" id="smm-order-search" placeholder="Tìm mã đơn, link, dịch vụ..." value="${esc(orderSearch)}">
      </div>

      <!-- Stats -->
      <div class="smm-admin-stats">
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon blue"><i class="fa-solid fa-list-check"></i></div>
          <div><div class="smm-admin-stat-label">Tổng đơn hàng</div><div class="smm-admin-stat-value">${st.total||0}</div></div>
        </div>
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon orange"><i class="fa-regular fa-clock"></i></div>
          <div><div class="smm-admin-stat-label">Chờ xử lý</div><div class="smm-admin-stat-value">${st.pending||0}</div></div>
        </div>
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon cyan"><i class="fa-solid fa-spinner"></i></div>
          <div><div class="smm-admin-stat-label">Đang chạy</div><div class="smm-admin-stat-value">${st.in_progress||0}</div></div>
        </div>
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
          <div><div class="smm-admin-stat-label">Hoàn thành</div><div class="smm-admin-stat-value">${st.completed||0}</div></div>
        </div>
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon yellow"><i class="fa-solid fa-circle-half-stroke"></i></div>
          <div><div class="smm-admin-stat-label">Một phần</div><div class="smm-admin-stat-value">${st.partial||0}</div></div>
        </div>
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon red"><i class="fa-solid fa-circle-xmark"></i></div>
          <div><div class="smm-admin-stat-label">Đã hủy</div><div class="smm-admin-stat-value">${st.canceled||0}</div></div>
        </div>
        <div class="smm-admin-stat-card">
          <div class="smm-admin-stat-icon blue"><i class="fa-solid fa-file-invoice-dollar"></i></div>
          <div><div class="smm-admin-stat-label">Doanh thu</div><div class="smm-admin-stat-value" style="color:#ef4444;">${fmt(st.revenue||0)}</div></div>
        </div>
      </div>

      <!-- Order cards -->
      <div class="smm-admin-orders">
        ${orders.length === 0 ? '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Chưa có đơn hàng</p></div>' : ''}
        ${orders.map(o => {
          const rem = o.remains != null ? o.remains : o.quantity;
          const profit = (o.charge || 0);
          const linkShort = o.link && o.link.length > 40 ? o.link.substring(0, 40) + '…' : (o.link || '—');
          const isUrl = o.link && (o.link.startsWith('http://') || o.link.startsWith('https://'));
          return `
          <div class="smm-admin-order" data-order-id="${o.id}">
            <!-- Head: code + status -->
            <div class="smm-admin-order-head">
              <div class="smm-admin-order-id">
                <input type="checkbox" data-oid="${o.id}">
                <div>
                  <div class="smm-admin-order-code">#${esc(String(o.code||o.id))}</div>
                  <div class="smm-admin-order-date">${fmtD(o.created_at)}</div>
                </div>
              </div>
              <div class="smm-admin-order-status smm-admin-order-status-pill smmao-pill-${o.status||'pending'}">
                <select data-change-status="${o.id}">${sOpts.map(s => `<option value="${s}" ${o.status===s?'selected':''}>${sLabels[s].toUpperCase()}</option>`).join('')}</select>
                <i class="fa-solid fa-chevron-down"></i>
              </div>
            </div>

            <!-- Service + Link -->
            <div class="smm-admin-order-service">
              <div class="smm-admin-order-svc-row">
                ${o.service_id ? `<span class="smm-admin-order-svc-id">${o.service_id}</span>` : ''}
                <span class="smm-admin-order-svc-name">${esc(o.service_name||'—')}</span>
              </div>
              <div class="smm-admin-order-link-row">
                ${isUrl ? `<a href="${esc(o.link)}" target="_blank" class="smm-order-link">${esc(linkShort)}</a>` : `<span class="smm-admin-order-link">${esc(linkShort)}</span>`}
                ${copyBtn(o.link||'')}
              </div>
            </div>

            <!-- Customer + API -->
            <div class="smm-admin-order-info">
              <div class="smm-admin-order-info-cell">
                <div class="smm-admin-order-info-label">Khách hàng</div>
                <div class="smm-admin-order-info-value"><strong>${esc(o.user_name||'—')}</strong></div>
                <div class="smm-admin-order-info-value"><span class="smm-admin-muted">${esc(o.user_email||'')}</span> ${copyBtn(o.user_email||'')}</div>
              </div>
              ${o.delivery_type === 'api' ? `
              <div class="smm-admin-order-info-cell">
                <div class="smm-admin-order-info-label">API / Provider</div>
                <div class="smm-admin-order-info-value">API: <span class="smm-admin-api-id">#${esc(o.external_order_id||'—')}</span> ${copyBtn(o.external_order_id||'')}</div>
                <div class="smm-admin-order-info-value"><span class="smm-admin-muted">${esc(o.provider_name||'—')}</span></div>
              </div>` : `
              <div class="smm-admin-order-info-cell">
                <div class="smm-admin-order-info-label">Giao hàng</div>
                <div class="smm-admin-order-info-value">${_delivBadge(o.delivery_type)}</div>
              </div>`}
            </div>

            <!-- Quantity & Progress -->
            <div class="smm-admin-order-qty">
              <div class="smm-admin-order-section-title">Số lượng & Tiến độ</div>
              <div class="smm-admin-order-qty-row">
                <div class="smm-admin-order-qty-item">Tổng: <span>${o.quantity}</span></div>
                <div class="smm-admin-order-qty-item">C.Lại: <span class="${rem>0?'red':''}">${rem!=null?rem:'—'}</span></div>
                <div class="smm-admin-order-qty-item">Đầu: <span class="${o.start_count?'green':''}">${o.start_count!=null?Number(o.start_count).toLocaleString('vi-VN'):'0'}</span></div>
              </div>
            </div>

            <!-- Finance -->
            <div class="smm-admin-order-finance">
              <div class="smm-admin-order-section-title">Tài chính (VND)</div>
              <div class="smm-admin-order-fin-row">
                <div class="smm-admin-order-fin-item"><span class="red">${fmt(o.charge||0)}</span></div>
                <div class="smm-admin-order-fin-item"><span class="gray">0 đ</span></div>
                <div class="smm-admin-order-fin-item"><span class="green">+${fmt(profit)}</span></div>
              </div>
            </div>

            <!-- Schedule & Repeat -->
            ${o.scheduled_at || o.repeat_count > 0 ? `
            <div class="smm-admin-order-schedule">
              ${o.scheduled_at ? `<span class="badge badge-purple"><i class="fa-regular fa-clock"></i> Lịch: ${fmtD(o.scheduled_at)}</span>` : ''}
              ${o.repeat_count > 0 ? `<span class="badge badge-blue"><i class="fa-solid fa-rotate"></i> Lặp ${o.repeat_count}x (còn ${o.repeat_remaining||0})</span>` : ''}
              ${o.parent_order_id ? `<span class="badge badge-gray"><i class="fa-solid fa-link"></i> Từ #${o.parent_order_id}</span>` : ''}
            </div>` : ''}

            <!-- Actions -->
            <div class="smm-admin-order-actions smm-admin-order-actions-v2">
              <button class="smmao-edit-btn" data-edit-order="${o.id}"><i class="fa-solid fa-pen-to-square"></i> Chi tiết / Sửa</button>
              <button class="smmao-del-btn" data-delete-order="${o.id}" title="Xóa đơn hàng"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Pagination -->
      ${totalPages > 1 ? buildPagination(orderPage, totalPages) : ''}`;
  };

  function buildPagination(page, totalPages) {
    const range = [];
    if (totalPages <= 5) { for (let i=1; i<=totalPages; i++) range.push(i); }
    else { range.push(1); if(page>3) range.push('…'); for(let i=Math.max(2,page-1);i<=Math.min(totalPages-1,page+1);i++) range.push(i); if(page<totalPages-2) range.push('…'); range.push(totalPages); }
    return `<div class="smm-pagination">
      <button class="smm-page-btn${page<=1?' disabled':''}" data-order-page="${page-1}"><i class="fa-solid fa-chevron-left"></i></button>
      ${range.map(p => p==='…' ? '<span class="smm-page-dots">…</span>' : `<button class="smm-page-btn${p===page?' active':''}" data-order-page="${p}">${p}</button>`).join('')}
      <button class="smm-page-btn${page>=totalPages?' disabled':''}" data-order-page="${page+1}"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  }

  // ── Detail/Edit Modal ──
  function showEditModal(o) {
    const copyLinkBtn = (text) => `<button class="smmao-modal-copy" data-copy="${esc(text)}"><i class="fa-regular fa-clipboard"></i> Sao chép</button>`;
    openModal(`
      <div class="smmao-modal">
        <div class="smmao-modal-section">
          <div class="smmao-modal-section-title">Thông tin cơ bản</div>
          <table class="smmao-modal-table">
            <tr><td class="lbl">Mã đơn hàng</td><td><span class="smmao-link">#${esc(String(o.code||o.id))}</span> ${copyBtn(String(o.code||o.id))}</td></tr>
            <tr><td class="lbl">Ngày đặt</td><td>${fmtD2(o.created_at)}</td></tr>
            <tr><td class="lbl">Khách hàng</td><td><span class="smmao-link smmao-strong">${esc(o.user_name||'—')}</span><div class="smmao-muted">${esc(o.user_email||'')}</div></td></tr>
            <tr><td class="lbl">Dịch vụ</td><td><strong>${o.service_id?`[${o.service_id}] `:''}${esc(o.service_name||'—')}</strong></td></tr>
            <tr><td class="lbl">Số lượng</td><td>${o.quantity}</td></tr>
            <tr><td class="lbl">Tổng thanh toán</td><td class="smmao-fin-red">${fmt(o.charge||0)}</td></tr>
            <tr><td class="lbl">Giá vốn (Ước tính)</td><td class="smmao-fin-blue">${fmt(0)}</td></tr>
            <tr><td class="lbl">Lợi nhuận</td><td class="smmao-fin-green">${fmt(o.charge||0)}</td></tr>
            <tr><td class="lbl">Liên kết (Link)</td><td class="smmao-link-row"><a href="${esc(o.link||'')}" target="_blank" class="smmao-underline">${esc(o.link||'—')}</a>${copyLinkBtn(o.link||'')}</td></tr>
          </table>
        </div>

        ${(true) ? `
        <div class="smmao-modal-section">
          <div class="smmao-modal-section-title">Thông tin API đối tác</div>
          <table class="smmao-modal-table">
            <tr><td class="lbl">Mã đơn API</td><td>${o.external_order_id ? `<span class="smmao-link">#${esc(String(o.external_order_id))}</span> ${copyBtn(String(o.external_order_id))}` : '<span class="smmao-muted">—</span>'}</td></tr>
            <tr><td class="lbl">Nhà cung cấp</td><td>${o.provider_name ? esc(o.provider_name) : '<span class="smmao-muted">Manual (không qua API)</span>'}</td></tr>
            <tr><td class="lbl">API URL</td><td class="smmao-break">${o.provider_url ? esc(o.provider_url) : '<span class="smmao-muted">—</span>'}</td></tr>
          </table>
        </div>` : ''}

        <div class="smmao-modal-section">
          <div class="smmao-modal-section-title smmao-accent">Cập nhật xử lý</div>
          <div class="smmao-form-group">
            <label>Trạng thái đơn hàng</label>
            <select class="form-select smmao-input" id="modal-status">
              ${sOpts.map(s => `<option value="${s}" ${o.status===s?'selected':''}>${sLabels[s]}</option>`).join('')}
            </select>
          </div>
          <div class="smmao-form-group">
            <label>Số lượng bắt đầu</label>
            <input type="number" class="form-input smmao-input" id="modal-start-count" value="${o.start_count||0}">
          </div>
          <div class="smmao-form-group">
            <label>Số lượng còn lại</label>
            <input type="number" class="form-input smmao-input" id="modal-remains" value="${o.remains!=null?o.remains:o.quantity}">
          </div>
          <div class="smmao-form-group">
            <label>Bình luận đặt đơn (từ user)</label>
            <textarea class="form-input smmao-input smmao-readonly" id="modal-user-comment" rows="2" readonly>${esc(o.user_comment||'—')}</textarea>
          </div>
          <div class="smmao-form-group">
            <label>Ghi chú Admin</label>
            <textarea class="form-input smmao-input" id="modal-admin-notes" rows="3" placeholder="Nhập ghi chú nội bộ">${esc(o.admin_notes||'')}</textarea>
          </div>
        </div>

        <div class="smmao-modal-actions">
          <button class="smmao-btn-cancel" id="modal-cancel">Cancel</button>
          <button class="smmao-btn-ok" id="modal-ok">OK</button>
        </div>
      </div>
    `, 'Chi tiết & Cập nhật đơn hàng');

    // Copy buttons inside modal
    setTimeout(() => {
      const mc = qs('#modal-content');
      if (!mc) return;
      mc.querySelectorAll('.smm-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(btn.dataset.copy).then(() => toast('Đã sao chép', 'success'));
        });
      });
      qs('#modal-cancel', mc).onclick = () => closeModal();
      qs('#modal-ok', mc).onclick = async () => {
        const btn = qs('#modal-ok', mc);
        btn.disabled = true; btn.textContent = 'Đang lưu...';
        try {
          await apiFetch(`/smm/admin/orders/${o.id}/status`, { method: 'PUT', body: JSON.stringify({
            status: qs('#modal-status', mc).value,
            start_count: parseInt(qs('#modal-start-count', mc).value) || 0,
            remains: parseInt(qs('#modal-remains', mc).value) || 0,
            admin_notes: qs('#modal-admin-notes', mc).value || null,
          })});
          toast('Đã cập nhật', 'success');
          closeModal();
          refresh();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'OK'; }
      };
    }, 50);
  }

  // ── Event delegation ──
  content.onclick = async (e) => {
    // Check all / Refresh
    if (e.target.closest('#btn-check-all')) {
      const b = e.target.closest('#btn-check-all');
      b.disabled = true; b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';
      try { await apiFetch('/smm/admin/orders/check-all', {method:'POST'}); toast('Đã kiểm tra tất cả', 'success'); refresh(); } catch(err) { toast(err.message, 'error'); b.disabled=false; b.innerHTML='<i class="fa-solid fa-arrows-rotate"></i> Làm mới dữ liệu'; }
      return;
    }
    // Filter toggle
    if (e.target.closest('#smm-filter-toggle')) {
      const panel = content.querySelector('#smm-filter-panel');
      const btn = content.querySelector('#smm-filter-toggle');
      panel.classList.toggle('open');
      btn.classList.toggle('active');
      return;
    }
    // Pagination
    const pg = e.target.closest('[data-order-page]');
    if (pg) { const p = parseInt(pg.dataset.orderPage); if (p >= 1 && p !== orderPage) { orderPage = p; await refresh(); } return; }
    // Edit
    const ed = e.target.closest('[data-edit-order]');
    if (ed) {
      const oid = parseInt(ed.dataset.editOrder);
      try {
        const data = await apiFetch(`/smm/admin/orders?limit=${LIMIT}&page=${orderPage}`);
        const o = (data.orders || []).find(x => x.id === oid);
        if (o) showEditModal(o); else toast('Không tìm thấy đơn hàng', 'error');
      } catch(err) { toast(err.message, 'error'); }
      return;
    }
    // Delete
    const del = e.target.closest('[data-delete-order]');
    if (del) {
      if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) return;
      try { await apiFetch(`/smm/admin/orders/${del.dataset.deleteOrder}`, {method:'DELETE'}); toast('Đã xóa', 'success'); refresh(); } catch(err) { toast(err.message, 'error'); }
      return;
    }
    // Copy
    const cp = e.target.closest('.smm-copy-btn');
    if (cp) { navigator.clipboard.writeText(cp.dataset.copy).then(() => toast('Đã sao chép', 'success')); return; }
    // Check single order
    const ck = e.target.closest('[data-check-order]');
    if (ck) { ck.disabled=true; ck.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; try{await apiFetch(`/smm/admin/orders/${ck.dataset.checkOrder}/check`,{method:'POST'});toast('OK','success');refresh();}catch(err){toast(err.message,'error');ck.disabled=false;ck.innerHTML='<i class="fa-solid fa-arrows-rotate"></i>';} return; }
  };

  content.onchange = async (e) => {
    // Status filter
    if (e.target.id === 'smm-order-status') { orderStatus = e.target.value; orderPage = 1; await refresh(); return; }
    // Inline status change
    const sc = e.target.closest('[data-change-status]');
    if (sc && sc.value) {
      try { await apiFetch(`/smm/admin/orders/${sc.dataset.changeStatus}/status`, {method:'PUT', body:JSON.stringify({status:sc.value})}); toast('Đã cập nhật trạng thái', 'success'); refresh(); } catch(err) { toast(err.message, 'error'); }
    }
  };

  // Search debounce
  content.addEventListener('input', (e) => {
    if (e.target.id === 'smm-order-search') {
      clearTimeout(content._searchTimer);
      content._searchTimer = setTimeout(() => { orderSearch = e.target.value.trim(); orderPage = 1; refresh(); }, 400);
    }
  });

  await refresh();
}

// ═══════════════ 5. PROVIDERS ═══════════════
async function renderAdminSmmProviders(view) {
  if (!view) return;
  const content = view;
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const checkBal = async (pid, msg) => {
    const el=content.querySelector(`[data-provider-balance="${pid}"]`);if(!el)return;
    el.textContent='...';el.title='';
    try{
      const r=await apiFetch(`/smm/providers/${pid}/balance`,{method:'POST'});
      if(r && r.ok===false){
        el.textContent='Lỗi'; el.title=r.error||'Không lấy được số dư'; el.classList.add('smmprov-balance-err');
        if(msg)toast(r.error||'Không lấy được số dư','error');
        return;
      }
      el.classList.remove('smmprov-balance-err');
      const vnd=Number(r.balance_vnd||0);
      if(vnd>0){ el.innerHTML=`${fmt(vnd)}`; }
      else{ const raw=r.balance_raw??0; el.textContent=`${fmt(raw)} ${r.currency||''}`.trim(); }
      if(msg)toast('OK','success');
    }catch(err){ el.textContent='Lỗi'; el.title=err.message||''; el.classList.add('smmprov-balance-err'); if(msg)toast(err.message,'error'); }
  };
  const refresh = async () => {
    const providers=await apiFetch('/smm/providers');
    content.innerHTML = `
      <div class="smmprov-page">
        <div class="smmprov-head">
          <h1 class="smmprov-title">Đấu API SMM</h1>
          <p class="smmprov-subtitle">Kết nối và quản lý các nguồn cung cấp dịch vụ SMM bên ngoài</p>
        </div>
        <button class="smmprov-add-btn" id="btn-add-provider"><i class="fa-solid fa-plus"></i> Thêm nhà cung cấp</button>
        ${providers.length===0?'<div class="empty-state"><i class="fa-solid fa-server"></i><p>Chưa có nhà cung cấp</p></div>':`
        <div class="smmprov-grid">${providers.map(p=>`
          <div class="smmprov-card" data-provider-card="${p.id}">
            <div class="smmprov-card-head">
              <h3 class="smmprov-name">${esc(p.name)}</h3>
              <label class="smmprov-toggle"><input type="checkbox" ${p.is_active?'checked':''} data-toggle-provider="${p.id}" /><span></span></label>
            </div>
            <div class="smmprov-divider"></div>
            <div class="smmprov-section">
              <div class="smmprov-label">SỐ DƯ:</div>
              <div class="smmprov-balance-row">
                <span class="smmprov-balance" data-provider-balance="${p.id}">—</span>
                <button class="smmprov-refresh-btn" data-check-balance="${p.id}" title="Làm mới"><i class="fa-solid fa-arrows-rotate"></i></button>
              </div>
            </div>
            <div class="smmprov-section">
              <div class="smmprov-label">THỐNG KÊ:</div>
              <div class="smmprov-stat-line">Dịch vụ: <b>${(p.stats?.services??0).toLocaleString()}</b></div>
              <div class="smmprov-stat-line">Danh mục: <b>${(p.stats?.categories??0).toLocaleString()}</b></div>
              <div class="smmprov-stat-line">Đơn hàng: <b>${(p.stats?.orders??0).toLocaleString()}</b></div>
            </div>
            <div class="smmprov-section">
              <div class="smmprov-label">TÀI CHÍNH:</div>
              <div class="smmprov-stat-line">Thu: <b>${fmt(p.stats?.revenue||0)}</b></div>
              <div class="smmprov-stat-line">Vốn: <b>${fmt(p.stats?.cost||0)}</b></div>
              <div class="smmprov-stat-line">Lãi: <b>${fmt(p.stats?.profit||0)}</b></div>
            </div>
            <div class="smmprov-section">
              <div class="smmprov-label">API URL:</div>
              <div class="smmprov-url-pill">${esc(p.base_url||'—')}</div>
            </div>
            <div class="smmprov-dashed"></div>
            <div class="smmprov-card-actions">
              <button class="smmprov-action-btn smmprov-edit" data-edit-provider="${p.id}">Chỉnh sửa</button>
              <button class="smmprov-action-btn smmprov-del" data-del-provider="${p.id}">Xóa bỏ</button>
            </div>
          </div>`).join('')}</div>`}
      </div>`;
    for(const p of providers) checkBal(p.id,false);
  };
  const showProviderModal = (prov) => {
    const isEdit=!!prov; const s=prov?.settings||{};
    openModal(`<form id="smm-prov-form" class="smmprov-form">
      <div class="smmprov-tabs" id="prov-tabs">
        <button type="button" class="smmprov-tab active" data-pm-tab="api">Cấu hình API</button>
        <button type="button" class="smmprov-tab" data-pm-tab="sync">Cài đặt Đồng bộ</button>
        <button type="button" class="smmprov-tab" data-pm-tab="currency">Tiền tệ &amp; Giới hạn</button>
      </div>
      <div data-pm-panel="api" class="smmprov-panel">
        <div class="form-row form-row-2">
          <div class="form-group"><label class="form-label"><span class="req">*</span> Tên nhà cung cấp</label><input class="form-input" id="spv-name" value="${prov?.name||''}" required placeholder="VD: JAP Panel" /></div>
          <div class="form-group"><label class="form-label">Trạng thái</label><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-active" ${prov?.is_active!==false?'checked':''} /><span class="smmprov-bigtoggle-track"><span class="smmprov-bigtoggle-text"></span></span></label></div>
        </div>
        <div class="form-group"><label class="form-label"><span class="req">*</span> API URL</label><input class="form-input" id="spv-url" value="${prov?.base_url||''}" required placeholder="https://provider.com/api/v2" /></div>
        <div class="form-row form-row-2">
          <div class="form-group"><label class="form-label"><span class="req">*</span> API KEY</label><div style="position:relative"><input class="form-input" id="spv-apikey" type="password" ${isEdit?'':'required'} placeholder="${isEdit?'•••••••••••':'••••••••••••'}" style="padding-right:36px" /><button type="button" class="btn-icon" id="spv-toggle-key" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px"><i class="fa-solid fa-eye-slash"></i></button></div></div>
          <div class="form-group"><label class="form-label">Mã giảm giá (Coupon)</label><input class="form-input" id="spv-coupon" value="${s.coupon||''}" placeholder="Mã giảm giá bên API" /></div>
        </div>
      </div>
      <div data-pm-panel="sync" class="smmprov-panel" style="display:none">
        <div class="smmprov-sync-grid">
          <div class="smmprov-sync-col">
            <div class="smmprov-sync-col-title">Đồng bộ Cơ bản</div>
            <div class="smmprov-sync-row"><span>Đồng bộ Chuyên mục</span><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-sync-categories" ${s.sync_categories!==false?'checked':''} /><span class="smmprov-bigtoggle-track"></span></label></div>
            <div class="smmprov-sync-row"><span>Đồng bộ Dịch vụ</span><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-sync-services" ${s.sync_services!==false?'checked':''} /><span class="smmprov-bigtoggle-track"></span></label></div>
            <div class="smmprov-sync-row"><span>Đồng bộ Giá<small style="display:block;font-size:11px;opacity:.65;font-weight:400">Bật → refresh giá vốn + áp Lợi nhuận %</small></span><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-sync-prices" ${s.sync_prices!==false?'checked':''} /><span class="smmprov-bigtoggle-track"></span></label></div>
          </div>
          <div class="smmprov-sync-col">
            <div class="smmprov-sync-col-title">Xử lý Nội dung</div>
            <div class="smmprov-sync-row"><span>Cập nhật Tên &amp; Mô tả</span><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-sync-desc" ${s.sync_descriptions?'checked':''} /><span class="smmprov-bigtoggle-track"></span></label></div>
            <div class="smmprov-sync-row"><span>Lọc HTML độc hại</span><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-filter-html" ${s.filter_html!==false?'checked':''} /><span class="smmprov-bigtoggle-track"></span></label></div>
            <div class="smmprov-sync-row"><span>Đồng bộ Nâng cao (Refill/Cancel)</span><label class="smmprov-bigtoggle"><input type="checkbox" id="spv-sync-adv" ${s.sync_advanced?'checked':''} /><span class="smmprov-bigtoggle-track"></span></label></div>
          </div>
        </div>
      </div>
      <div data-pm-panel="currency" class="smmprov-panel" style="display:none">
        <div class="form-row form-row-2">
          <div class="form-group"><label class="form-label">Tiền tệ API</label><select class="form-select" id="spv-currency"><option value="USD" ${s.currency==='USD'||!s.currency?'selected':''}>USD</option><option value="VND" ${s.currency==='VND'?'selected':''}>VND</option><option value="EUR" ${s.currency==='EUR'?'selected':''}>EUR</option></select></div>
          <div class="form-group"><label class="form-label">Tỷ giá hối đoái</label><input type="number" class="form-input" id="spv-rate" value="${s.exchange_rate??1}" /><div class="smmprov-hint">VD: 1 USD = 25,000 VND (Nhập 25000)</div></div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group"><label class="form-label">Định dạng giá API</label><select class="form-select" id="spv-price-format"><option value="per1000" ${s.price_format!=='per1'?'selected':''}>Giá cho 1,000 lượt</option><option value="per1" ${s.price_format==='per1'?'selected':''}>Giá cho 1 lượt</option></select></div>
          <div class="form-group"><label class="form-label">Lợi nhuận (%)</label><input type="number" class="form-input" id="spv-markup" value="${s.price_markup??0}" /><div class="smmprov-hint">VD: 10 (%) — chỉ áp dụng khi bật "Đồng bộ Giá"</div></div>
        </div>
        <div class="form-group"><label class="form-label">Giới hạn đồng bộ đơn (Cron)</label><input type="number" class="form-input" id="spv-cron-limit" value="${s.cron_limit??50}" /><div class="smmprov-hint">Khuyến nghị: 50 - 100 đơn / lần</div></div>
      </div>
      <div id="spv-err" class="form-error mb-12" style="display:none"></div>
      <div class="smmprov-modal-actions"><button type="button" class="smmprov-btn-cancel" id="spv-cancel">Cancel</button><button type="submit" class="smmprov-btn-ok">OK</button></div>
    </form>`, isEdit?`Sửa: ${prov.name}`:'Thêm nhà cung cấp mới');
    qs('#prov-tabs').onclick=(e)=>{const b=e.target.closest('[data-pm-tab]');if(!b)return;const t=b.dataset.pmTab;qsa('#prov-tabs .smmprov-tab').forEach(x=>x.classList.toggle('active',x.dataset.pmTab===t));qsa('[data-pm-panel]').forEach(p=>p.style.display=p.dataset.pmPanel===t?'':'none');};
    qs('#spv-toggle-key').onclick=()=>{const i=qs('#spv-apikey'),ic=qs('#spv-toggle-key i');if(i.type==='password'){i.type='text';ic.className='fa-solid fa-eye';}else{i.type='password';ic.className='fa-solid fa-eye-slash';}};
    qs('#spv-cancel').onclick=closeModal;
    qs('#smm-prov-form').onsubmit=async(e)=>{
      e.preventDefault();
      const body={name:qs('#spv-name').value,base_url:qs('#spv-url').value,is_active:qs('#spv-active').checked,settings:{
        currency:qs('#spv-currency').value,exchange_rate:parseFloat(qs('#spv-rate').value)||1,price_markup:parseFloat(qs('#spv-markup').value)||0,
        price_format:qs('#spv-price-format').value,cron_limit:parseInt(qs('#spv-cron-limit').value)||50,
        sync_categories:qs('#spv-sync-categories').checked,sync_services:qs('#spv-sync-services').checked,sync_prices:qs('#spv-sync-prices').checked,
        sync_descriptions:qs('#spv-sync-desc').checked,filter_html:qs('#spv-filter-html').checked,sync_advanced:qs('#spv-sync-adv').checked,
        coupon:qs('#spv-coupon').value.trim(),
      }};
      const apiKey=qs('#spv-apikey').value;if(apiKey)body.api_key=apiKey;
      try{
        if(isEdit)await apiFetch(`/smm/providers/${prov.id}`,{method:'PUT',body:JSON.stringify(body)});
        else{if(!apiKey){qs('#spv-err').textContent='API KEY bắt buộc';qs('#spv-err').style.display='block';return;}await apiFetch('/smm/providers',{method:'POST',body:JSON.stringify(body)});}
        closeModal();toast(isEdit?'Đã cập nhật':'Đã tạo','success');refresh();
      }catch(err){qs('#spv-err').textContent=err.message;qs('#spv-err').style.display='block';}
    };
  };
  const showSyncModal = async (providerId) => {
    const platforms=await apiFetch('/smm/platforms');
    if(!platforms.length){toast('Chưa có nền tảng.','warning');return;}
    openModal(`<form id="prov-sync-form">
      <div class="form-group"><label class="form-label">Nền tảng đích<span class="req">*</span></label><select class="form-select" id="psync-plat" required><option value="">Chọn</option>${platforms.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
      <div id="psync-err" class="form-error mb-12" style="display:none"></div>
      <div id="psync-result" style="display:none" class="mb-12"></div>
      <div class="flex gap-8 justify-end"><button type="button" class="btn btn-ghost" id="psync-cancel">Hủy</button><button type="submit" class="btn btn-primary" id="psync-submit"><i class="fa-solid fa-arrows-rotate"></i> Đồng bộ</button></div>
    </form>`,'Đồng bộ dịch vụ');
    qs('#psync-cancel').onclick=closeModal;
    qs('#prov-sync-form').onsubmit=async(e)=>{
      e.preventDefault();const platId=parseInt(qs('#psync-plat').value);if(!platId)return;
      const btn=qs('#psync-submit');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Đang sync...';
      try{
        const r=await apiFetch('/smm/services/sync',{method:'POST',body:JSON.stringify({provider_id:providerId,platform_id:platId})});
        qs('#psync-result').style.display='block';qs('#psync-result').innerHTML=`<div class="text-success">Tạo: ${r.created??0}, Cập nhật: ${r.updated??0}, Bỏ qua: ${r.skipped??0}</div>`;
        toast('OK','success');setTimeout(()=>{closeModal();refresh();},1500);
      }catch(err){qs('#psync-err').textContent=err.message;qs('#psync-err').style.display='block';btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-arrows-rotate"></i> Đồng bộ';}
    };
  };
  content.onclick = async (e) => {
    if(e.target.closest('#btn-add-provider')){showProviderModal(null);return;}
    const eb=e.target.closest('[data-edit-provider]');
    if(eb){const ps=await apiFetch('/smm/providers');const p=ps.find(x=>x.id===parseInt(eb.dataset.editProvider));if(p)showProviderModal(p);return;}
    const db=e.target.closest('[data-del-provider]');
    if(db){if(!confirm('Xóa?'))return;try{await apiFetch(`/smm/providers/${db.dataset.delProvider}`,{method:'DELETE'});toast('Đã xóa','success');refresh();}catch(err){toast(err.message,'error');}return;}
    const tb=e.target.closest('[data-toggle-provider]');
    if(tb){try{const ps=await apiFetch('/smm/providers');const p=ps.find(x=>x.id===parseInt(tb.dataset.toggleProvider));if(p)await apiFetch(`/smm/providers/${p.id}`,{method:'PUT',body:JSON.stringify({name:p.name,base_url:p.base_url,is_active:tb.checked,settings:p.settings})});toast('OK','success');}catch(err){toast(err.message,'error');refresh();}return;}
    const cb=e.target.closest('[data-check-balance]');
    if(cb){await checkBal(cb.dataset.checkBalance,true);return;}
    const sb=e.target.closest('[data-sync-provider]');
    if(sb){await showSyncModal(parseInt(sb.dataset.syncProvider));return;}
  };
  await refresh();
}
