// ═══════════════════════════════════════════════════════════════
//  SMM PANEL — Storefront Pages
// ═══════════════════════════════════════════════════════════════

function smmStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  const map = {
    pending:        { label: 'Chờ xử lý',   cls: 'badge-yellow' },
    processing:     { label: 'Đang xử lý',  cls: 'badge-blue' },
    in_progress:    { label: 'Đang chạy',   cls: 'badge-blue' },
    completed:      { label: 'Hoàn thành',  cls: 'badge-green' },
    partial:        { label: 'Hoàn một phần', cls: 'badge-orange' },
    canceled:       { label: 'Đã hủy',      cls: 'badge-red' },
    cancelled:      { label: 'Đã hủy',      cls: 'badge-red' },
    scheduled:      { label: 'Đã lên lịch', cls: 'badge-purple' },
    failed:         { label: 'Thất bại',     cls: 'badge-red' },
  };
  const info = map[s] || { label: status || '—', cls: 'badge-gray' };
  return `<span class="badge ${info.cls}">${esc(info.label)}</span>`;
}

function smmRefillBadge(status) {
  const s = String(status || '').toLowerCase();
  const map = {
    pending:    { label: 'Bảo hành: Chờ',   cls: 'badge-yellow' },
    processing: { label: 'Bảo hành: Xử lý', cls: 'badge-blue' },
    completed:  { label: 'Bảo hành: Xong',  cls: 'badge-green' },
    rejected:   { label: 'Bảo hành: Từ chối', cls: 'badge-red' },
    canceled:   { label: 'Bảo hành: Hủy',   cls: 'badge-red' },
  };
  const info = map[s] || { label: `Bảo hành: ${status || '—'}`, cls: 'badge-gray' };
  return `<span class="badge ${info.cls}">${esc(info.label)}</span>`;
}

// ── Page 1: Services Catalog ────────────────────────────────
async function renderSmmServices(view) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const catalog = await apiFetch('/smm/catalog');
    if (!catalog || !catalog.length) {
      view.innerHTML = `
        <div class="empty-state" style="padding:60px 20px;">
          <div class="empty-state-icon"><i class="fa-solid fa-share-nodes"></i></div>
          <h3>Chưa có dịch vụ SMM</h3>
          <p class="text-muted">Hiện chưa có dịch vụ nào khả dụng.</p>
        </div>`;
      return;
    }

    // Flatten all services for filtering/pagination
    const allServices = [];
    catalog.forEach(p => {
      p.categories.forEach(c => {
        c.services.forEach(s => {
          allServices.push({ ...s, platform_id: p.id, platform_name: p.name, platform_icon: p.icon_url, category_id: c.id, category_name: c.name });
        });
      });
    });

    let platformFilter = '';
    let categoryFilter = '';
    let searchQuery = '';
    let currentPage = 1;
    const perPage = 15;
    // Trạng thái thu gọn/mở rộng theo platform_id (default: mở)
    const collapsedPlatforms = new Set();

    view.innerHTML = '';

    // ── Filter bar ──
    const filterCard = el('div', 'card svc-filter-card');
    filterCard.innerHTML = `
      <div class="svc-filter-row">
        <select id="svc-platform-filter" class="svc-filter-select">
          <option value="">Nền tảng</option>
          ${catalog.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
        </select>
        <select id="svc-category-filter" class="svc-filter-select">
          <option value="">Tất cả phân loại</option>
        </select>
      </div>
      <div class="svc-search-row">
        <input type="text" id="svc-search-input" class="svc-search-input" placeholder="Tên dịch vụ">
        <button class="svc-search-btn" id="svc-search-btn"><i class="fa-solid fa-magnifying-glass"></i></button>
        <button class="svc-clear-btn" id="svc-clear-btn"><i class="fa-regular fa-trash-can"></i></button>
      </div>`;
    view.appendChild(filterCard);

    const listWrap = el('div');
    view.appendChild(listWrap);

    const platformSel = qs('#svc-platform-filter', filterCard);
    const categorySel = qs('#svc-category-filter', filterCard);
    const searchInput = qs('#svc-search-input', filterCard);
    const searchBtn = qs('#svc-search-btn', filterCard);
    const clearBtn = qs('#svc-clear-btn', filterCard);

    function updateCategories() {
      const pid = platformFilter;
      categorySel.innerHTML = '<option value="">Tất cả phân loại</option>';
      if (pid) {
        const plat = catalog.find(p => String(p.id) === String(pid));
        if (plat) {
          plat.categories.forEach(c => {
            categorySel.innerHTML += `<option value="${c.id}">${esc(c.name)}</option>`;
          });
        }
      }
    }

    function getFiltered() {
      const q = searchQuery.toLowerCase().trim();
      return allServices.filter(s => {
        if (platformFilter && String(s.platform_id) !== String(platformFilter)) return false;
        if (categoryFilter && String(s.category_id) !== String(categoryFilter)) return false;
        if (q && !s.name.toLowerCase().includes(q) && !String(s.id).includes(q) && !String(s.display_id ?? '').includes(q)) return false;
        return true;
      });
    }

    function render() {
      const filtered = getFiltered();
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * perPage;
      const pageItems = filtered.slice(start, start + perPage);

      if (!pageItems.length) {
        listWrap.innerHTML = `
          <div class="empty-state" style="padding:40px 20px;">
            <div class="empty-state-icon"><i class="fa-solid fa-search"></i></div>
            <h3>Không tìm thấy dịch vụ</h3>
            <p class="text-muted">Thử từ khóa khác.</p>
          </div>`;
        return;
      }

      let html = `<div class="card svc-table-wrap">
        <table class="svc-table">
          <thead>
            <tr>
              <th class="svc-th-id">ID</th>
              <th class="svc-th-name">Dịch vụ</th>
              <th class="svc-th-price">Giá / 1K</th>
              <th class="svc-th-qty">Min/Max</th>
              <th class="svc-th-action"></th>
            </tr>
          </thead>
          <tbody>`;

      pageItems.forEach((s, i) => {
        const iconHtml = s.platform_icon
          ? `<img src="${s.platform_icon}" alt="" class="svc-platform-icon">`
          : '';
        const refillBadge = s.can_refill
          ? `<span class="svc-refill-badge svc-refill-yes">♻️ Refill</span>`
          : `<span class="svc-refill-badge svc-refill-no">🚫 No Refill</span>`;

        // Group header: chèn 1 hàng khi đổi nền tảng (trên cùng cũng chèn)
        const prevPlat = i > 0 ? pageItems[i - 1].platform_id : null;
        if (s.platform_id !== prevPlat) {
          const platIconHtml = s.platform_icon
            ? `<img src="${s.platform_icon}" alt="" class="svc-group-icon">`
            : '<i class="fa-solid fa-share-nodes svc-group-icon-fallback"></i>';
          const isCollapsed = collapsedPlatforms.has(s.platform_id);
          html += `
            <tr class="svc-group-row${isCollapsed ? ' is-collapsed' : ''}" data-platform-toggle="${s.platform_id}">
              <td colspan="5" class="svc-group-cell">
                <div class="svc-group-cell-inner">
                  ${platIconHtml}
                  <span class="svc-group-name">${esc(s.platform_name || '—')}</span>
                  <i class="fa-solid fa-chevron-down svc-group-chevron"></i>
                </div>
              </td>
            </tr>`;
        }

        const hidden = collapsedPlatforms.has(s.platform_id) ? ' style="display:none;"' : '';
        html += `
            <tr class="svc-row" data-platform-row="${s.platform_id}"${hidden} onclick="navigateTo('/smm/order?service=${s.id}')">
              <td class="svc-td-id">#${s.display_id ?? s.id}</td>
              <td class="svc-td-name">
                <div class="svc-name-wrap">
                  ${iconHtml}
                  <span>${esc(s.name)} | ${refillBadge}</span>
                </div>
              </td>
              <td class="svc-td-price">
                <div class="svc-price">${fmt(s.rate)}</div>
              </td>
              <td class="svc-td-qty">${Number(s.min_quantity).toLocaleString('vi-VN')} — ${Number(s.max_quantity).toLocaleString('vi-VN')}</td>
              <td class="svc-td-action"><button class="svc-order-btn" onclick="event.stopPropagation();navigateTo('/smm/order?service=${s.id}')">Đặt hàng</button></td>
            </tr>`;
      });

      html += `</tbody></table></div>`;

      // Pagination
      if (totalPages > 1) {
        html += `<div class="smm-pagination">
          <button class="smm-page-btn${currentPage<=1?' disabled':''}" data-svc-page="${currentPage-1}"><i class="fa-solid fa-chevron-left"></i></button>`;
        const range = [];
        if (totalPages <= 5) { for (let i=1;i<=totalPages;i++) range.push(i); }
        else {
          range.push(1);
          if(currentPage>3) range.push('…');
          for(let i=Math.max(2,currentPage-1);i<=Math.min(totalPages-1,currentPage+1);i++) range.push(i);
          if(currentPage<totalPages-2) range.push('…');
          range.push(totalPages);
        }
        range.forEach(p => {
          if (p==='…') { html += `<span class="smm-page-dots">…</span>`; }
          else { html += `<button class="smm-page-btn${p===currentPage?' active':''}" data-svc-page="${p}">${p}</button>`; }
        });
        html += `<button class="smm-page-btn${currentPage>=totalPages?' disabled':''}" data-svc-page="${currentPage+1}"><i class="fa-solid fa-chevron-right"></i></button>
        </div>`;
      }

      // Info
      html += `<div class="svc-info-bar">${total} dịch vụ · Trang ${currentPage}/${totalPages}</div>`;

      listWrap.innerHTML = html;

      // Pagination clicks
      listWrap.querySelectorAll('[data-svc-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.svcPage);
          if (p >= 1 && p <= totalPages && p !== currentPage) { currentPage = p; render(); window.scrollTo({top:0,behavior:'smooth'}); }
        });
      });

      // Toggle collapse theo platform
      listWrap.querySelectorAll('[data-platform-toggle]').forEach(row => {
        row.addEventListener('click', () => {
          const pid = row.dataset.platformToggle;
          if (collapsedPlatforms.has(pid)) collapsedPlatforms.delete(pid);
          else collapsedPlatforms.add(pid);
          row.classList.toggle('is-collapsed');
          listWrap.querySelectorAll(`[data-platform-row="${pid}"]`).forEach(tr => {
            tr.style.display = collapsedPlatforms.has(pid) ? 'none' : '';
          });
        });
      });
    }

    // Events
    platformSel.addEventListener('change', () => { platformFilter = platformSel.value; categoryFilter = ''; updateCategories(); currentPage = 1; render(); });
    categorySel.addEventListener('change', () => { categoryFilter = categorySel.value; currentPage = 1; render(); });
    searchBtn.addEventListener('click', () => { searchQuery = searchInput.value; currentPage = 1; render(); });
    searchInput.addEventListener('keydown', (e) => { if(e.key==='Enter'){searchQuery=searchInput.value;currentPage=1;render();} });
    clearBtn.addEventListener('click', () => { searchInput.value=''; searchQuery=''; platformFilter=''; categoryFilter=''; platformSel.value=''; updateCategories(); currentPage=1; render(); });

    let searchTimer;
    searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { searchQuery = searchInput.value; currentPage = 1; render(); }, 300); });

    render();

  } catch (err) {
    view.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3>Lỗi tải dịch vụ</h3>
        <p class="text-muted">${esc(err.message || 'Không thể kết nối máy chủ.')}</p>
      </div>`;
  }
}

// ── Page 1.5: Service Detail → redirect to Order page ──────
async function renderSmmServiceDetail(view, { id }) {
  navigateTo(`/smm/order?service=${id}`);
}

// ── Page 2: Place Order (Professional SMM Panel Design) ────
async function renderSmmOrder(view) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const catalog = await apiFetch('/smm/catalog');
    if (!catalog || !catalog.length) {
      view.innerHTML = `
        <div class="empty-state" style="padding:60px 20px;">
          <div class="empty-state-icon"><i class="fa-solid fa-share-nodes"></i></div>
          <h3>Chưa có dịch vụ SMM</h3>
          <p class="text-muted">Hiện chưa có dịch vụ nào để đặt đơn.</p>
        </div>`;
      return;
    }

    const urlParams = new URLSearchParams(location.search || '');
    const preselectedServiceId = urlParams.get('service');
    const preselectedPlatformSlug = (urlParams.get('platform') || '').trim().toLowerCase();

    // Flatten services for lookup
    const allServices = [];
    catalog.forEach(p => p.categories.forEach(c => c.services.forEach(s => {
      allServices.push({ ...s, platform_name: p.name, platform_slug: p.slug, platform_icon: p.icon_url, category_name: c.name, platform_id: p.id, category_id: c.id });
    })));

    view.innerHTML = '';

    const formCard = el('div', 'card mb-16');
    formCard.style.padding = '24px';

    // ── Section 1: Quick Search ──
    formCard.innerHTML = `
      <div style="margin-bottom:20px;">
        <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
          <i class="fa-solid fa-magnifying-glass" style="margin-right:4px;"></i> Tìm nhanh dịch vụ
        </label>
        <div style="position:relative;">
          <input type="text" id="smm-quick-search" class="form-input" placeholder="Nhập tên hoặc ID dịch vụ để tìm kiếm nhanh..." style="border-radius:10px;font-size:14px;">
          <div id="smm-quick-results" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:#fff;border:1px solid var(--border);border-radius:0 0 10px 10px;box-shadow:var(--shadow);max-height:260px;overflow-y:auto;"></div>
        </div>
      </div>

      <div style="height:1px;background:var(--border);margin:20px 0;"></div>

      <!-- Section 2: Cascading Dropdowns -->
      <div class="form-group mb-16">
        <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
          <i class="fa-solid fa-layer-group" style="margin-right:4px;"></i> Nền tảng
        </label>
        <div id="smm-platform-chips" class="smm-platform-chips"></div>
        <select id="smm-platform" class="form-select" style="border-radius:10px;padding:10px 14px;font-size:14px;display:none;">
          <option value="">— Chọn nền tảng —</option>
        </select>
      </div>
      <div class="form-group mb-16">
        <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
          <i class="fa-solid fa-tags" style="margin-right:4px;"></i> Phân loại
        </label>
        <select id="smm-category" class="form-select" style="border-radius:10px;padding:10px 14px;font-size:14px;" disabled>
          <option value="">— Chọn phân loại —</option>
        </select>
      </div>
      <div class="form-group mb-16">
        <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
          <i class="fa-solid fa-cube" style="margin-right:4px;"></i> Dịch vụ
        </label>
        <select id="smm-service" class="form-select" style="border-radius:10px;padding:10px 14px;font-size:14px;" disabled>
          <option value="">— Chọn dịch vụ —</option>
        </select>
      </div>

      <!-- Section 3: Service Info Grid (2x2) -->
      <div id="smm-service-info" style="display:none;"></div>

      <!-- Section 4: Service Description (collapsible) -->
      <div id="smm-service-desc" style="display:none;"></div>

      <div style="height:1px;background:var(--border);margin:20px 0;"></div>

      <!-- Section 5: Link Input -->
      <div class="form-group mb-16">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin:0;">
            <i class="fa-solid fa-link" style="margin-right:4px;"></i> Liên kết cần tăng
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-muted);user-select:none;">
            Nhiều link
            <div id="smm-multi-toggle" style="width:40px;height:22px;background:var(--border);border-radius:11px;position:relative;cursor:pointer;transition:background 0.2s;">
              <div style="width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
            </div>
          </label>
        </div>
        <div id="smm-link-single" style="position:relative;">
          <input type="text" id="smm-link" class="form-input" placeholder="Nhập liên kết cần tăng tương tác..." style="border-radius:10px;padding-right:70px;font-size:14px;">
          <button id="smm-paste-btn" type="button" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:var(--primary);color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:opacity 0.15s;"><i class="fa-regular fa-clipboard" style="margin-right:4px;"></i> Dán</button>
        </div>
        <div id="smm-link-multi" style="display:none;">
          <textarea id="smm-link-textarea" class="form-input" rows="5" placeholder="Mỗi link một dòng&#10;https://facebook.com/post/1&#10;https://facebook.com/post/2&#10;https://facebook.com/post/3" style="border-radius:10px;font-size:14px;resize:vertical;line-height:1.6;"></textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <span id="smm-link-count" class="text-sm text-muted">0 link</span>
            <button id="smm-paste-btn-multi" type="button" style="background:none;border:none;color:var(--primary);font-size:12px;font-weight:700;cursor:pointer;padding:0;"><i class="fa-regular fa-clipboard" style="margin-right:4px;"></i> Dán từ clipboard</button>
          </div>
        </div>
      </div>

      <!-- Section 6: Quantity Input -->
      <div class="form-group mb-16" id="smm-qty-wrap">
        <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
          Số lượng
        </label>
        <input type="number" id="smm-quantity" class="form-input" placeholder="Nhập số lượng" style="border-radius:10px;font-size:15px;padding:14px 16px;" min="1">
        <div id="smm-qty-hint" class="text-sm text-muted" style="margin-top:6px;font-size:13px;"></div>
      </div>

      <!-- Section 6c: Service-type specific extras -->
      <div id="smm-extras-wrap" class="form-group mb-16" style="display:none;"></div>

      <!-- Section 6b: Schedule & Repeat toggles -->
      <div style="margin-bottom:20px;">
        <div class="smm-toggle-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fa-regular fa-clock" style="color:var(--text-muted);"></i>
            <span style="font-size:14px;font-weight:600;">Đặt lịch chạy</span>
          </div>
          <label class="smm-toggle-switch">
            <input type="checkbox" id="smm-schedule-toggle">
            <span class="smm-toggle-slider"></span>
          </label>
        </div>
        <div id="smm-schedule-panel" style="display:none;padding:12px 0 4px;">
          <label class="form-label" style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Thời gian chạy</label>
          <input type="datetime-local" id="smm-schedule-time" class="form-input" style="border-radius:10px;font-size:14px;padding:12px 14px;">
        </div>
        <div class="smm-toggle-row" style="border-top:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fa-solid fa-rotate" style="color:var(--text-muted);"></i>
            <span style="font-size:14px;font-weight:600;">Lặp lại đơn hàng</span>
          </div>
          <label class="smm-toggle-switch">
            <input type="checkbox" id="smm-repeat-toggle">
            <span class="smm-toggle-slider"></span>
          </label>
        </div>
        <div id="smm-repeat-panel" style="display:none;padding:12px 0 4px;">
          <div style="display:flex;gap:12px;">
            <div style="flex:1;">
              <label class="form-label" style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Số lần lặp</label>
              <input type="number" id="smm-repeat-count" class="form-input" value="1" min="1" max="100" style="border-radius:10px;font-size:14px;padding:12px 14px;">
            </div>
            <div style="flex:1;">
              <label class="form-label" style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Khoảng cách (phút)</label>
              <input type="number" id="smm-repeat-interval" class="form-input" value="60" min="1" style="border-radius:10px;font-size:14px;padding:12px 14px;">
            </div>
          </div>
          <div class="text-sm text-muted" style="margin-top:6px;">Đơn hàng sẽ tự lặp lại sau mỗi khoảng thời gian khi đơn trước hoàn thành.</div>
        </div>
      </div>

      <!-- Section 7: Price Summary -->
      <div id="smm-price-preview" style="display:none;border:2px dashed var(--border);border-radius:12px;padding:16px 20px;margin-bottom:20px;background:var(--bg-page);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed var(--border);">
          <span style="font-size:14px;color:var(--text-body);">Giá trị đơn hàng:</span>
          <span id="smm-price-value" style="font-size:16px;font-weight:600;color:var(--text-heading);"></span>
        </div>
        <div id="smm-tax-row" style="display:none;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed var(--border);">
          <span id="smm-tax-label" style="font-size:14px;color:var(--text-body);">Thuế VAT:</span>
          <span id="smm-tax-value" style="font-size:15px;font-weight:600;color:var(--text-heading);"></span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:15px;font-weight:700;color:var(--text-heading);">Tổng tiền cần thanh toán:</span>
          <span id="smm-total-value" style="font-size:22px;font-weight:800;color:var(--red);"></span>
        </div>
      </div>

      <!-- Section 8: Submit Button -->
      <button id="smm-submit-btn" class="btn btn-primary smm-submit-btn" disabled>
        <i class="fa-solid fa-paper-plane"></i> Đặt hàng
      </button>
    `;
    view.appendChild(formCard);

    const resultWrap = el('div');
    view.appendChild(resultWrap);

    // ── DOM refs ──
    const quickSearch   = qs('#smm-quick-search', formCard);
    const quickResults  = qs('#smm-quick-results', formCard);
    const platformSel   = qs('#smm-platform', formCard);
    const categorySel   = qs('#smm-category', formCard);
    const serviceSel    = qs('#smm-service', formCard);
    const serviceInfo   = qs('#smm-service-info', formCard);
    const serviceDesc   = qs('#smm-service-desc', formCard);
    const linkInput     = qs('#smm-link', formCard);
    const linkTextarea  = qs('#smm-link-textarea', formCard);
    const linkSingle    = qs('#smm-link-single', formCard);
    const linkMulti     = qs('#smm-link-multi', formCard);
    const linkCount     = qs('#smm-link-count', formCard);
    const multiToggle   = qs('#smm-multi-toggle', formCard);
    const pasteBtn      = qs('#smm-paste-btn', formCard);
    const pasteBtnMulti = qs('#smm-paste-btn-multi', formCard);
    const qtyInput      = qs('#smm-quantity', formCard);
    const qtyHint       = qs('#smm-qty-hint', formCard);
    const qtyWrap       = qs('#smm-qty-wrap', formCard);
    const extrasWrap    = qs('#smm-extras-wrap', formCard);
    const pricePreview  = qs('#smm-price-preview', formCard);
    const priceValue    = qs('#smm-price-value', formCard);
    const totalValue    = qs('#smm-total-value', formCard);
    const taxRow        = qs('#smm-tax-row', formCard);
    const taxLabel      = qs('#smm-tax-label', formCard);
    const taxValue      = qs('#smm-tax-value', formCard);
    const submitBtn     = qs('#smm-submit-btn', formCard);

    // Schedule & Repeat refs
    const scheduleToggle = qs('#smm-schedule-toggle', formCard);
    const schedulePanel  = qs('#smm-schedule-panel', formCard);
    const scheduleTime   = qs('#smm-schedule-time', formCard);
    const repeatToggle   = qs('#smm-repeat-toggle', formCard);
    const repeatPanel    = qs('#smm-repeat-panel', formCard);
    const repeatCountIn  = qs('#smm-repeat-count', formCard);
    const repeatIntervalIn = qs('#smm-repeat-interval', formCard);

    // Toggle panels
    scheduleToggle.onchange = () => { schedulePanel.style.display = scheduleToggle.checked ? 'block' : 'none'; };
    repeatToggle.onchange = () => { repeatPanel.style.display = repeatToggle.checked ? 'block' : 'none'; };

    let selectedService = null;

    // ── Custom dropdown enhancer (popup full-width của card, bỏ native picker iOS) ──
    function enhanceSelect(sel, placeholder) {
      if (!sel || sel.dataset.cddEnhanced === '1') return;
      sel.dataset.cddEnhanced = '1';
      const wrap = document.createElement('div');
      wrap.className = 'smm-cdd-wrap';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('smm-cdd-native');
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'smm-cdd-trigger form-select';
      trigger.innerHTML = `<span class="smm-cdd-label"></span><i class="fa-solid fa-chevron-down smm-cdd-caret"></i>`;
      const popup = document.createElement('div');
      popup.className = 'smm-cdd-popup';
      wrap.appendChild(trigger);
      wrap.appendChild(popup);
      const labelEl = trigger.querySelector('.smm-cdd-label');
      function syncLabel() {
        const opt = sel.options[sel.selectedIndex];
        const txt = opt ? opt.textContent : '';
        const m = txt.match(/^\s*(#\d+)\s*(.*)$/);
        if (m && sel.value) {
          labelEl.innerHTML = `<span class="smm-cdd-id">${m[1]}</span> <span class="smm-cdd-text">${m[2].replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`;
        } else {
          labelEl.textContent = txt || placeholder || '';
        }
        labelEl.classList.toggle('is-placeholder', !sel.value);
        trigger.disabled = sel.disabled;
        trigger.classList.toggle('is-disabled', sel.disabled);
      }
      function renderItems() {
        popup.innerHTML = '';
        Array.from(sel.options).forEach((opt, idx) => {
          const item = document.createElement('div');
          item.className = 'smm-cdd-item' + (idx === sel.selectedIndex ? ' is-selected' : '') + (opt.value === '' ? ' is-placeholder' : '');
          const raw = opt.textContent || '';
          // Highlight leading #ID (vd: "#123 Facebook Post...")
          const m = raw.match(/^\s*(#\d+)\s*(.*)$/);
          if (m) {
            item.innerHTML = `<span class="smm-cdd-id">${m[1]}</span> <span class="smm-cdd-text">${m[2].replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`;
          } else {
            item.textContent = raw;
          }
          item.dataset.value = opt.value;
          item.addEventListener('click', () => {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            close();
          });
          popup.appendChild(item);
        });
      }
      function open() {
        if (sel.disabled) return;
        renderItems();
        popup.classList.add('is-open');
        trigger.classList.add('is-open');
        setTimeout(() => document.addEventListener('click', onDocClick), 0);
      }
      function close() {
        popup.classList.remove('is-open');
        trigger.classList.remove('is-open');
        document.removeEventListener('click', onDocClick);
      }
      function onDocClick(e) {
        if (!wrap.contains(e.target)) close();
      }
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup.classList.contains('is-open')) close(); else open();
      });
      sel.addEventListener('change', () => { syncLabel(); if (popup.classList.contains('is-open')) renderItems(); });
      // Watch for options/disabled changes
      const mo = new MutationObserver(() => { syncLabel(); if (popup.classList.contains('is-open')) renderItems(); });
      mo.observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] });
      syncLabel();
    }
    enhanceSelect(categorySel, '— Chọn phân loại —');
    enhanceSelect(serviceSel, '— Chọn dịch vụ —');

    // ── Populate platform dropdown with icons ──
    catalog.forEach(p => {
      const iconHtml = p.icon_url
        ? `<img src="${p.icon_url}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;border-radius:3px;">`
        : '';
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.innerHTML = iconHtml + esc(p.name);
      platformSel.appendChild(opt);
    });

    // ── Populate platform chips (visual picker with icons) ──
    const platformChips = qs('#smm-platform-chips', formCard);
    if (platformChips) {
      platformChips.innerHTML = catalog.map(p => `
        <button type="button" class="smm-platform-chip" data-platform-id="${p.id}">
          ${p.icon_url ? `<img src="${esc(p.icon_url)}" alt="" class="smm-platform-chip-icon">` : '<i class="fa-solid fa-layer-group smm-platform-chip-icon"></i>'}
          <span class="smm-platform-chip-name">${esc(p.name)}</span>
        </button>
      `).join('');
      platformChips.addEventListener('click', (e) => {
        const btn = e.target.closest('.smm-platform-chip');
        if (!btn) return;
        platformSel.value = btn.dataset.platformId;
        platformSel.dispatchEvent(new Event('change'));
      });
    }
    function syncPlatformChips() {
      if (!platformChips) return;
      const cur = String(platformSel.value || '');
      platformChips.querySelectorAll('.smm-platform-chip').forEach(b => {
        b.classList.toggle('active', b.dataset.platformId === cur);
      });
    }
    syncPlatformChips();

    // ── Helper: get platform icon HTML ──
    function platformIconHtml(platformId, size) {
      size = size || 18;
      const p = catalog.find(x => x.id === platformId);
      if (!p) return '';
      return p.icon_url
        ? `<img src="${p.icon_url}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;vertical-align:middle;margin-right:6px;border-radius:3px;">`
        : '';
    }

    // ── Quick Search ──
    let searchTimer;
    quickSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = quickSearch.value.toLowerCase().trim();
        if (!q) { quickResults.style.display = 'none'; return; }
        const matches = allServices.filter(s =>
          s.name.toLowerCase().includes(q) || String(s.id).includes(q) || String(s.display_id ?? '').includes(q)
        ).slice(0, 20);
        if (!matches.length) {
          quickResults.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:13px;">Không tìm thấy dịch vụ</div>';
          quickResults.style.display = 'block';
          return;
        }
        quickResults.innerHTML = matches.map(s => {
          const icon = platformIconHtml(s.platform_id, 16);
          return `<div class="smm-quick-item" data-sid="${s.id}" style="padding:10px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;transition:background 0.1s;">
            ${icon}
            <span style="background:var(--primary);color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;">#${s.display_id ?? s.id}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.name)}</span>
            <span style="color:var(--primary);font-weight:600;font-size:12px;white-space:nowrap;">${fmt(s.rate)}</span>
          </div>`;
        }).join('');
        quickResults.style.display = 'block';

        // Click handler for results
        quickResults.querySelectorAll('.smm-quick-item').forEach(item => {
          item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg-page)'; });
          item.addEventListener('mouseleave', () => { item.style.background = ''; });
          item.addEventListener('click', () => {
            const sid = parseInt(item.dataset.sid);
            const svc = allServices.find(s => s.id === sid);
            if (svc) {
              quickSearch.value = '';
              quickResults.style.display = 'none';
              selectServiceByCascade(svc.platform_id, svc.category_id, svc.id);
            }
          });
        });
      }, 200);
    });

    // Close quick results on outside click
    document.addEventListener('click', (e) => {
      if (!formCard.contains(e.target)) quickResults.style.display = 'none';
    });

    // ── Cascading dropdown logic ──
    function populateCategories(platformId) {
      categorySel.innerHTML = '<option value="">— Chọn phân loại —</option>';
      serviceSel.innerHTML = '<option value="">— Chọn dịch vụ —</option>';
      serviceInfo.style.display = 'none';
      serviceDesc.style.display = 'none';
      selectedService = null;
      pricePreview.style.display = 'none';
      qtyHint.textContent = '';
      if (!platformId) { categorySel.disabled = true; serviceSel.disabled = true; validateForm(); return; }
      const platform = catalog.find(p => p.id === platformId);
      if (!platform) { categorySel.disabled = true; serviceSel.disabled = true; validateForm(); return; }
      categorySel.disabled = false;
      platform.categories.forEach(c => {
        const icon = platformIconHtml(platformId, 16);
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerHTML = icon + esc(c.name);
        categorySel.appendChild(opt);
      });
      validateForm();
    }

    function populateServices(platformId, categoryId) {
      serviceSel.innerHTML = '<option value="">— Chọn dịch vụ —</option>';
      serviceInfo.style.display = 'none';
      serviceDesc.style.display = 'none';
      selectedService = null;
      pricePreview.style.display = 'none';
      qtyHint.textContent = '';
      if (!platformId || !categoryId) { serviceSel.disabled = true; validateForm(); return; }
      const platform = catalog.find(p => p.id === platformId);
      if (!platform) { serviceSel.disabled = true; validateForm(); return; }
      const cat = platform.categories.find(c => c.id === categoryId);
      if (!cat) { serviceSel.disabled = true; validateForm(); return; }
      serviceSel.disabled = false;
      const icon = platformIconHtml(platformId, 16);
      cat.services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerHTML = icon + `<span style="background:var(--primary);color:#fff;border-radius:4px;padding:1px 5px;font-size:11px;font-weight:700;margin-right:4px;">#${s.display_id ?? s.id}</span> ` + esc(s.name);
        serviceSel.appendChild(opt);
      });
      validateForm();
    }

    platformSel.addEventListener('change', () => {
      populateCategories(parseInt(platformSel.value) || null);
      syncPlatformChips();
    });

    categorySel.addEventListener('change', () => {
      populateServices(parseInt(platformSel.value) || null, parseInt(categorySel.value) || null);
    });

    serviceSel.addEventListener('change', () => {
      const sid = parseInt(serviceSel.value);
      selectedService = allServices.find(s => s.id === sid) || null;
      if (selectedService) {
        renderServiceInfoGrid(selectedService);
        renderServiceDescription(selectedService);
        qtyInput.min = selectedService.min_quantity;
        qtyInput.max = selectedService.max_quantity;
        qtyHint.innerHTML = `Tối thiểu: <strong>${Number(selectedService.min_quantity).toLocaleString()}</strong> · Tối đa: <strong>${Number(selectedService.max_quantity).toLocaleString()}</strong>`;
        renderTypeExtras(selectedService.service_type || 'Default');
      } else {
        serviceInfo.style.display = 'none';
        serviceDesc.style.display = 'none';
        qtyHint.textContent = '';
        extrasWrap.style.display = 'none';
        extrasWrap.innerHTML = '';
        qtyWrap.style.display = '';
      }
      updatePrice();
      validateForm();
    });

    // ── Service-type specific extras renderer ──
    function renderTypeExtras(stype) {
      stype = stype || 'Default';
      let html = '';
      let showQty = true;
      if (stype === 'Package') {
        showQty = false;
      } else if (stype === 'Custom Comments' || stype === 'Custom Comments Package') {
        html = `
          <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
            <i class="fa-regular fa-comments" style="margin-right:4px;"></i> Danh sách bình luận
          </label>
          <textarea id="smm-comments" class="form-input" rows="6" placeholder="Mỗi dòng là 1 bình luận&#10;Quá hay&#10;Tuyệt vời&#10;Like mạnh" style="border-radius:10px;font-size:14px;resize:vertical;line-height:1.6;"></textarea>
          <div class="text-sm text-muted" style="margin-top:6px;"><span id="smm-comments-count">0</span> bình luận${stype==='Custom Comments' ? ' — số lượng đặt = số dòng' : ''}</div>`;
        if (stype === 'Custom Comments') showQty = false;
      } else if (stype === 'Mentions Hashtag') {
        html = `
          <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
            <i class="fa-solid fa-hashtag" style="margin-right:4px;"></i> Hashtag
          </label>
          <textarea id="smm-hashtags" class="form-input" rows="4" placeholder="Mỗi dòng 1 hashtag, ví dụ:&#10;#food&#10;#travel" style="border-radius:10px;font-size:14px;resize:vertical;line-height:1.6;"></textarea>`;
      } else if (stype === 'Subscriptions') {
        html = `
          <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
            <i class="fa-regular fa-user" style="margin-right:4px;"></i> Username / Channel
          </label>
          <input type="text" id="smm-sub-username" class="form-input" placeholder="@username hoặc tên kênh" style="border-radius:10px;font-size:14px;padding:12px 14px;margin-bottom:10px;" />
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label class="form-label" style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Min posts</label>
              <input type="number" id="smm-sub-min" class="form-input" min="0" placeholder="0" style="border-radius:10px;font-size:14px;padding:12px 14px;" />
            </div>
            <div>
              <label class="form-label" style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Max posts</label>
              <input type="number" id="smm-sub-max" class="form-input" min="0" placeholder="0" style="border-radius:10px;font-size:14px;padding:12px 14px;" />
            </div>
            <div>
              <label class="form-label" style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Delay (phút)</label>
              <input type="number" id="smm-sub-delay" class="form-input" min="0" value="0" style="border-radius:10px;font-size:14px;padding:12px 14px;" />
            </div>
            <div>
              <label class="form-label" style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Hết hạn (YYYY-MM-DD)</label>
              <input type="date" id="smm-sub-expiry" class="form-input" style="border-radius:10px;font-size:14px;padding:12px 14px;" />
            </div>
          </div>`;
      } else if (stype === 'SEO') {
        html = `
          <label class="form-label" style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">
            <i class="fa-solid fa-magnifying-glass" style="margin-right:4px;"></i> Từ khoá SEO
          </label>
          <textarea id="smm-keywords" class="form-input" rows="4" placeholder="Mỗi dòng 1 từ khoá" style="border-radius:10px;font-size:14px;resize:vertical;line-height:1.6;"></textarea>`;
      }
      if (html) {
        extrasWrap.innerHTML = html;
        extrasWrap.style.display = 'block';
      } else {
        extrasWrap.innerHTML = '';
        extrasWrap.style.display = 'none';
      }
      qtyWrap.style.display = showQty ? '' : 'none';
      // Wire dynamic count for comments
      const cIn = qs('#smm-comments', extrasWrap);
      const cCnt = qs('#smm-comments-count', extrasWrap);
      if (cIn && cCnt) {
        const updateC = () => {
          const n = cIn.value.split('\n').map(s=>s.trim()).filter(Boolean).length;
          cCnt.textContent = n;
          if (stype === 'Custom Comments') {
            qtyInput.value = n;
          }
          updatePrice();
          validateForm();
        };
        cIn.addEventListener('input', updateC);
      }
      ['#smm-hashtags','#smm-keywords','#smm-sub-username','#smm-sub-min','#smm-sub-max'].forEach(sel => {
        const el = qs(sel, extrasWrap);
        if (el) el.addEventListener('input', () => { updatePrice(); validateForm(); });
      });
    }

    // ── Build extras payload based on current service_type ──
    function collectExtras() {
      const stype = selectedService?.service_type || 'Default';
      const out = {};
      if (stype === 'Custom Comments' || stype === 'Custom Comments Package') {
        out.comments = (qs('#smm-comments', extrasWrap)?.value || '').trim();
      } else if (stype === 'Mentions Hashtag') {
        out.hashtags = (qs('#smm-hashtags', extrasWrap)?.value || '').trim();
      } else if (stype === 'SEO') {
        out.keywords = (qs('#smm-keywords', extrasWrap)?.value || '').trim();
      } else if (stype === 'Subscriptions') {
        out.username = (qs('#smm-sub-username', extrasWrap)?.value || '').trim();
        out.min_posts = parseInt(qs('#smm-sub-min', extrasWrap)?.value) || 0;
        out.max_posts = parseInt(qs('#smm-sub-max', extrasWrap)?.value) || 0;
        out.delay = parseInt(qs('#smm-sub-delay', extrasWrap)?.value) || 0;
        out.expiry = qs('#smm-sub-expiry', extrasWrap)?.value || null;
      }
      return out;
    }

    // ── Section 3: Service Info Grid (2x2) ──
    function renderServiceInfoGrid(svc) {
      const canCancel = svc.can_cancel;
      const canRefill = svc.can_refill;
      // Effective avg time: admin override if set, else computed from last 10 completed orders
      const effAvg = (svc.avg_time_minutes != null) ? svc.avg_time_minutes : svc.computed_avg_time_minutes;
      const avgLabel = (effAvg == null) ? 'N/A' : (effAvg < 60 ? `${Math.round(effAvg)} phút` : `${(effAvg/60).toFixed(1)} giờ`);
      const avgHint = (effAvg == null) ? '' : '/1.000';
      serviceInfo.style.display = 'block';
      serviceInfo.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div style="background:var(--green-bg);border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-check" style="color:#fff;font-size:14px;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:2px;">Trạng thái</div>
              <div style="font-size:14px;font-weight:700;color:var(--green);">Hoạt động</div>
            </div>
          </div>
          <div style="background:var(--bg-page);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:var(--text-muted);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-regular fa-clock" style="color:#fff;font-size:14px;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:2px;">Thời gian TB${avgHint}</div>
              <div style="font-size:14px;font-weight:700;color:var(--text-muted);">${avgLabel}</div>
            </div>
          </div>
          <div style="background:${canCancel ? 'var(--green-bg)' : 'var(--red-bg)'};border:1px solid ${canCancel ? '#bbf7d0' : '#fecaca'};border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:${canCancel ? 'var(--green)' : 'var(--red)'};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid ${canCancel ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color:#fff;font-size:14px;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:2px;">Hủy đơn</div>
              <div style="font-size:14px;font-weight:700;color:${canCancel ? 'var(--green)' : 'var(--red)'};">${canCancel ? 'Có' : 'Không'}</div>
            </div>
          </div>
          <div style="background:${canRefill ? 'var(--green-bg)' : 'var(--red-bg)'};border:1px solid ${canRefill ? '#bbf7d0' : '#fecaca'};border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:${canRefill ? 'var(--green)' : 'var(--red)'};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid ${canRefill ? 'fa-shield-halved' : 'fa-circle-xmark'}" style="color:#fff;font-size:14px;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:2px;">Bảo hành</div>
              <div style="font-size:14px;font-weight:700;color:${canRefill ? 'var(--green)' : 'var(--red)'};">${canRefill ? 'Có' : 'Không'}</div>
            </div>
          </div>
        </div>`;
    }

    // ── Section 4: Service Description (collapsible) ──
    function renderServiceDescription(svc) {
      if (!svc.description) { serviceDesc.style.display = 'none'; return; }
      serviceDesc.style.display = 'block';
      const descId = 'smm-desc-content';
      // Sanitize nhẹ: bỏ script/iframe/style; nếu plain text thì giữ xuống dòng
      let _descHtml = String(svc.description || '');
      _descHtml = _descHtml.replace(/<\s*(script|iframe|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
      if (!/<[a-z][\s\S]*>/i.test(_descHtml)) {
        _descHtml = _descHtml.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
      }
      serviceDesc.innerHTML = `
        <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:16px;">
          <div id="${descId}" class="smm-rich-text" style="font-size:13px;line-height:1.6;color:var(--text-body);max-height:120px;overflow:hidden;transition:max-height 0.3s ease;">
            ${_descHtml}
          </div>
          <button id="smm-desc-toggle" type="button" style="background:none;border:none;color:var(--primary);font-size:13px;font-weight:600;cursor:pointer;padding:6px 0 0;margin-top:4px;">
            <i class="fa-solid fa-chevron-down" style="margin-right:4px;font-size:10px;"></i> Xem thêm
          </button>
        </div>`;

      const descContent = qs('#' + descId, serviceDesc);
      const toggleBtn   = qs('#smm-desc-toggle', serviceDesc);
      let expanded = false;

      // Check if content is actually overflowing
      if (descContent.scrollHeight <= 120) {
        toggleBtn.style.display = 'none';
        descContent.style.maxHeight = 'none';
      }

      toggleBtn.addEventListener('click', () => {
        expanded = !expanded;
        if (expanded) {
          descContent.style.maxHeight = descContent.scrollHeight + 'px';
          toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up" style="margin-right:4px;font-size:10px;"></i> Thu gọn nội dung';
        } else {
          descContent.style.maxHeight = '120px';
          toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down" style="margin-right:4px;font-size:10px;"></i> Xem thêm';
        }
      });
    }

    // ── Multi-link toggle ──
    let isMultiLink = false;
    multiToggle.addEventListener('click', () => {
      isMultiLink = !isMultiLink;
      const dot = multiToggle.querySelector('div');
      if (isMultiLink) {
        multiToggle.style.background = 'var(--primary)';
        dot.style.transform = 'translateX(18px)';
        linkSingle.style.display = 'none';
        linkMulti.style.display = 'block';
        // Copy single link to textarea if exists
        if (linkInput.value.trim() && !linkTextarea.value.trim()) {
          linkTextarea.value = linkInput.value.trim();
        }
      } else {
        multiToggle.style.background = 'var(--border)';
        dot.style.transform = 'translateX(0)';
        linkSingle.style.display = 'block';
        linkMulti.style.display = 'none';
        // Copy first line of textarea to single input
        const firstLine = (linkTextarea.value || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
        if (firstLine && !linkInput.value.trim()) {
          linkInput.value = firstLine;
        }
      }
      validateForm();
    });

    function getLinks() {
      if (isMultiLink) {
        return (linkTextarea.value || '').split('\n').map(l => l.trim()).filter(Boolean);
      }
      const v = linkInput.value.trim();
      return v ? [v] : [];
    }

    function updateLinkCount() {
      const count = (linkTextarea.value || '').split('\n').map(l => l.trim()).filter(Boolean).length;
      linkCount.textContent = `${count} link`;
    }
    linkTextarea.addEventListener('input', () => { updateLinkCount(); updatePrice(); validateForm(); });

    // ── Paste buttons ──
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          linkInput.value = text.split('\n')[0].trim();
          linkInput.dispatchEvent(new Event('input'));
          toast('Đã dán liên kết', 'success');
        }
      } catch {
        toast('Không thể đọc clipboard', 'error');
      }
    });
    pasteBtnMulti.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          const existing = linkTextarea.value.trim();
          linkTextarea.value = existing ? existing + '\n' + text.trim() : text.trim();
          updateLinkCount();
          validateForm();
          toast('Đã dán liên kết', 'success');
        }
      } catch {
        toast('Không thể đọc clipboard', 'error');
      }
    });

    // ── Effective quantity (depends on service_type) ──
    function effectiveQty() {
      const stype = selectedService?.service_type || 'Default';
      if (stype === 'Package') return 1;
      if (stype === 'Custom Comments') {
        const c = qs('#smm-comments', extrasWrap);
        return c ? c.value.split('\n').map(s=>s.trim()).filter(Boolean).length : 0;
      }
      return parseInt(qtyInput.value) || 0;
    }

    // ── Price & validation ──
    function updatePrice() {
      if (!selectedService) { pricePreview.style.display = 'none'; return; }
      const qty = effectiveQty();
      const links = getLinks();
      if (qty <= 0 || !links.length) { pricePreview.style.display = 'none'; return; }
      const costPerLink = selectedService.rate * qty / 1000;
      const subtotal = costPerLink * links.length;
      const taxRate = parseFloat(window.appSettings?.tax_rate) || 0;
      const taxAmt = subtotal * taxRate / 100;
      const totalCost = subtotal + taxAmt;
      if (links.length > 1) {
        priceValue.innerHTML = `${fmt(costPerLink)} × ${links.length} link`;
      } else {
        priceValue.innerHTML = fmt(costPerLink);
      }
      if (taxRate > 0) {
        taxLabel.textContent = `Thuế VAT (${taxRate}%):`;
        taxValue.innerHTML = fmt(taxAmt);
        taxRow.style.display = 'flex';
      } else {
        taxRow.style.display = 'none';
      }
      totalValue.innerHTML = fmt(totalCost);
      pricePreview.style.display = 'block';
    }

    function validateForm() {
      const qty = effectiveQty();
      const links = getLinks();
      const ok = selectedService && links.length > 0 && qty >= (selectedService.min_quantity || 1);
      submitBtn.disabled = !ok;
    }

    qtyInput.addEventListener('input', () => { updatePrice(); validateForm(); });
    linkInput.addEventListener('input', () => { updatePrice(); validateForm(); });

    // ── Helper: cascade-select a service programmatically ──
    function selectServiceByCascade(platformId, categoryId, serviceId) {
      platformSel.value = platformId;
      platformSel.dispatchEvent(new Event('change'));
      setTimeout(() => {
        categorySel.value = categoryId;
        categorySel.dispatchEvent(new Event('change'));
        setTimeout(() => {
          serviceSel.value = serviceId;
          serviceSel.dispatchEvent(new Event('change'));
        }, 0);
      }, 0);
    }

    // ── Pre-select service if ?service=ID ──
    if (preselectedServiceId) {
      const svc = allServices.find(s => String(s.id) === String(preselectedServiceId));
      if (svc) {
        selectServiceByCascade(svc.platform_id, svc.category_id, svc.id);
      }
    } else if (preselectedPlatformSlug) {
      // ── Pre-select only platform via ?platform=slug ──
      const p = catalog.find(x => String(x.slug || '').toLowerCase() === String(preselectedPlatformSlug).toLowerCase());
      if (p) {
        platformSel.value = String(p.id);
        platformSel.dispatchEvent(new Event('change'));
      }
    }

    // ── Submit ──
    submitBtn.addEventListener('click', async () => {
      const links = getLinks();
      if (!selectedService || !links.length) return;
      const stype = selectedService.service_type || 'Default';
      const extras = collectExtras();
      // Effective qty per service_type
      let qty = parseInt(qtyInput.value) || 0;
      if (stype === 'Package') qty = 1;
      if (stype === 'Custom Comments') {
        qty = (extras.comments || '').split('\n').map(s=>s.trim()).filter(Boolean).length;
      }
      if (stype === 'Custom Comments' || stype === 'Custom Comments Package') {
        if (!extras.comments) { toast('Vui lòng nhập danh sách bình luận', 'error'); return; }
      }
      if (stype === 'Mentions Hashtag' && !extras.hashtags) { toast('Vui lòng nhập hashtag', 'error'); return; }
      if (stype === 'SEO' && !extras.keywords) { toast('Vui lòng nhập từ khoá SEO', 'error'); return; }
      if (qty < (selectedService.min_quantity || 1)) {
        toast(`Số lượng tối thiểu: ${Number(selectedService.min_quantity).toLocaleString()}`, 'error');
        return;
      }
      if (selectedService.max_quantity && qty > selectedService.max_quantity) {
        toast(`Số lượng tối đa: ${Number(selectedService.max_quantity).toLocaleString()}`, 'error');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đặt hàng${links.length > 1 ? ` (0/${links.length})` : ''}...`;
      resultWrap.innerHTML = '';

      const results = [];
      const errors = [];

      for (let i = 0; i < links.length; i++) {
        if (links.length > 1) {
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đặt hàng (${i + 1}/${links.length})...`;
        }
        try {
          const result = await apiFetch('/smm/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: selectedService.id, link: links[i], quantity: qty,
              scheduled_at: scheduleToggle.checked && scheduleTime.value ? new Date(scheduleTime.value).toISOString() : null,
              repeat_count: repeatToggle.checked ? (parseInt(repeatCountIn.value) || 0) : 0,
              repeat_interval: repeatToggle.checked ? (parseInt(repeatIntervalIn.value) || 0) : 0,
              extras: Object.keys(extras).length ? extras : null,
            })
          });
          results.push({ link: links[i], ...result });
        } catch (err) {
          errors.push({ link: links[i], error: err.message || 'Thất bại' });
        }
      }

      // Show results
      if (results.length > 0) {
        let html = `
          <div class="card" style="padding:24px;border-top:4px solid #10b981;">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="width:56px;height:56px;background:#ecfdf5;color:#10b981;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px;">
                <i class="fa-solid fa-check"></i>
              </div>
              <h2 style="margin:0;font-size:20px;color:var(--text-heading);">Đặt đơn thành công!</h2>
              ${links.length > 1 ? `<p class="text-muted" style="margin:4px 0 0;">${results.length}/${links.length} đơn thành công</p>` : ''}
            </div>`;

        if (results.length === 1) {
          const r = results[0];
          html += `
            <div style="background:var(--bg-page);border-radius:10px;padding:16px;margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span class="text-muted">Mã đơn:</span>
                <span class="fw-600">${esc(r.order_code || r.id)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span class="text-muted">Dịch vụ:</span>
                <span class="fw-600" style="max-width:60%;text-align:right;">${esc(selectedService.name)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span class="text-muted">Trạng thái:</span>
                ${smmStatusBadge(r.status)}
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span class="text-muted">Phí:</span>
                <span class="fw-600" style="color:var(--red);">${fmt(r.charge)}</span>
              </div>
              ${r.scheduled_at ? `<div style="display:flex;justify-content:space-between;margin-top:8px;"><span class="text-muted">Lịch chạy:</span><span class="badge badge-purple"><i class="fa-regular fa-clock"></i> ${new Date(r.scheduled_at).toLocaleString('vi-VN')}</span></div>` : ''}
              ${r.repeat_count > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:8px;"><span class="text-muted">Lặp lại:</span><span class="badge badge-blue"><i class="fa-solid fa-rotate"></i> ${r.repeat_count} lần</span></div>` : ''}
            </div>`;
        } else {
          const totalCharge = results.reduce((s, r) => s + (r.charge || 0), 0);
          html += `
            <div style="background:var(--bg-page);border-radius:10px;padding:16px;margin-bottom:16px;">
              <div class="table-wrap" style="margin-bottom:8px;">
                <table style="font-size:13px;">
                  <thead><tr><th>Mã đơn</th><th>Link</th><th>Trạng thái</th><th>Phí</th></tr></thead>
                  <tbody>
                    ${results.map(r => `<tr>
                      <td class="fw-600" style="white-space:nowrap;">${esc(r.order_code || r.id)}</td>
                      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.link)}">${esc(r.link)}</td>
                      <td>${smmStatusBadge(r.status)}</td>
                      <td class="fw-600" style="color:var(--red);white-space:nowrap;">${fmt(r.charge)}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>
              <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);">
                <span class="fw-600">Tổng phí:</span>
                <span class="fw-600" style="color:var(--red);font-size:16px;">${fmt(totalCharge)}</span>
              </div>
            </div>`;
        }

        if (errors.length) {
          html += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#991b1b;">
            <strong><i class="fa-solid fa-triangle-exclamation"></i> ${errors.length} link thất bại:</strong><br>
            ${errors.map(e => `${esc(e.link)} — ${esc(e.error)}`).join('<br>')}
          </div>`;
        }

        html += `
            <div style="display:flex;gap:12px;">
              <button class="btn btn-primary" style="flex:1;border-radius:10px;" onclick="navigateTo('/smm/history')">Xem lịch sử</button>
              <button class="btn btn-outline" style="flex:1;border-radius:10px;" onclick="navigateTo('/smm/order')">Đặt đơn mới</button>
            </div>
          </div>`;
        resultWrap.innerHTML = html;
        formCard.style.display = 'none';
      } else {
        // All failed
        toast(errors[0]?.error || 'Đặt đơn thất bại', 'error');
        resultWrap.innerHTML = `
          <div class="card" style="padding:24px;border-top:4px solid #ef4444;">
            <div style="text-align:center;">
              <div style="width:56px;height:56px;background:#fee2e2;color:#ef4444;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px;">
                <i class="fa-solid fa-xmark"></i>
              </div>
              <h3 style="color:var(--text-heading);">Đặt đơn thất bại</h3>
              <p class="text-muted">${esc(errors.map(e => e.error).join(', ') || 'Vui lòng thử lại.')}</p>
            </div>
          </div>`;
      }

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Đặt hàng';
      validateForm();
    });

  } catch (err) {
    view.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3>Lỗi tải dịch vụ</h3>
        <p class="text-muted">${esc(err.message || 'Không thể kết nối máy chủ.')}</p>
      </div>`;
  }
}

// ── Page 3: Order History (Redesigned) ──────────────────────
async function renderSmmHistory(view) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const urlParams = new URLSearchParams(location.search || '');
  let currentPage = parseInt(urlParams.get('page')) || 1;
  let currentStatus = urlParams.get('status') || '';
  let currentSearch = urlParams.get('q') || '';

  try {
    await renderSmmHistoryPage(view, currentPage, currentStatus, currentSearch);
  } catch (err) {
    view.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3>Lỗi tải đơn hàng</h3>
        <p class="text-muted">${esc(err.message || 'Không thể kết nối máy chủ.')}</p>
      </div>`;
  }
}

async function renderSmmHistoryPage(view, page, statusFilter, searchFilter) {
  const limit = 10;
  let url = `/smm/orders?page=${page}&limit=${limit}`;
  if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
  if (searchFilter) url += `&search=${encodeURIComponent(searchFilter)}`;
  const data = await apiFetch(url);

  view.innerHTML = '';

  // ── Filter Tabs ──
  const tabs = [
    { key: '',           label: 'Tất cả',      dot: '' },
    { key: 'scheduled',  label: 'Đã lên lịch', dot: '#a855f7' },
    { key: 'pending',    label: 'Chờ xử lý',   dot: '#f59e0b' },
    { key: 'in_progress',label: 'Đang chạy',   dot: '#3b82f6' },
    { key: 'completed',  label: 'Hoàn thành',  dot: '#22c55e' },
    { key: 'partial',    label: 'Một phần',    dot: '#3b82f6' },
    { key: 'canceled',   label: 'Đã hủy',      dot: '#ef4444' },
  ];

  const tabsWrap = el('div', 'smm-filter-tabs');
  tabs.forEach(t => {
    const btn = el('button', 'smm-filter-tab' + (statusFilter === t.key ? ' active' : ''));
    btn.innerHTML = `${esc(t.label)}${t.dot ? `<span class="smm-tab-dot" style="background:${t.dot}"></span>` : ''}`;
    btn.addEventListener('click', () => {
      const params = new URLSearchParams();
      if (t.key) params.set('status', t.key);
      if (searchFilter) params.set('q', searchFilter);
      const qs = params.toString();
      navigateTo('/smm/history' + (qs ? '?' + qs : ''));
    });
    tabsWrap.appendChild(btn);
  });
  view.appendChild(tabsWrap);

  // ── Search Bar ──
  const searchWrap = el('div', 'smm-search-wrap');
  searchWrap.innerHTML = `
    <input type="text" class="smm-search-input" placeholder="Tìm ID hoặc liên kết..." value="${esc(searchFilter)}">
    <i class="fa-solid fa-magnifying-glass smm-search-icon"></i>`;
  view.appendChild(searchWrap);

  let debounceTimer;
  const searchInput = searchWrap.querySelector('input');
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const val = searchInput.value.trim();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (val) params.set('q', val);
      const qs = params.toString();
      navigateTo('/smm/history' + (qs ? '?' + qs : ''));
    }, 400);
  });

  // ── Empty State ──
  if (!data.orders || !data.orders.length) {
    view.innerHTML += `
      <div class="empty-state" style="padding:60px 20px;">
        <div class="empty-state-icon"><i class="fa-solid fa-inbox"></i></div>
        <h3>Chưa có đơn hàng</h3>
        <p class="text-muted">${searchFilter || statusFilter ? 'Không tìm thấy đơn hàng phù hợp.' : 'Bạn chưa đặt đơn SMM nào.'}</p>
        <button class="btn btn-primary" style="margin-top:12px;border-radius:10px;" onclick="navigateTo('/smm/order')">Đặt đơn ngay</button>
      </div>`;
    return;
  }

  // ── Order Cards ──
  const cardsWrap = el('div', 'smm-orders-list');
  data.orders.forEach(o => {
    const linkShort = o.link && o.link.length > 45 ? o.link.substring(0, 45) + '…' : (o.link || '—');
    const isUrl = o.link && (o.link.startsWith('http://') || o.link.startsWith('https://'));

    const card = el('div', 'smm-order-card');
    const canRefresh = (o.delivery_type === 'api') && o.external_order_id;
    card.innerHTML = `
      <div class="smm-order-card-header">
        <div class="smm-order-id">
          <span class="smm-order-code">#${esc(String(o.order_code || o.id))}</span>
          <button class="smm-copy-btn" title="Sao chép" data-copy="${esc(String(o.order_code || o.id))}"><i class="fa-regular fa-clipboard"></i></button>
        </div>
        <div class="smm-order-card-header-right">
          ${smmStatusBadge(o.status)}
          ${canRefresh ? `<button class="smm-order-refresh-btn" data-id="${o.id}" title="Cập nhật trạng thái"><i class="fa-solid fa-rotate"></i></button>` : ''}
        </div>
      </div>
      <div class="smm-order-card-body" onclick="navigateTo('/smm/history/${o.id}')">
        <div class="smm-order-service-name">${esc(o.service_name || '—')}</div>
        <div class="smm-order-meta">${esc((o.category_name || '') + (o.platform_name ? ' · ' + o.platform_name : ''))}${o.scheduled_at ? ' · <i class="fa-regular fa-clock"></i> Đã lên lịch' : ''}${o.repeat_count > 0 ? ` · <i class="fa-solid fa-rotate"></i> Lặp ${o.repeat_count - (o.repeat_remaining||0)}/${o.repeat_count}` : ''}</div>
        ${isUrl
          ? `<a href="${esc(o.link)}" target="_blank" rel="noopener" class="smm-order-link" onclick="event.stopPropagation()">${esc(linkShort)} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:11px;"></i></a>`
          : `<div class="smm-order-link-text">${esc(linkShort)}</div>`
        }
      </div>
      <div class="smm-order-card-stats">
        <div class="smm-stat"><div class="smm-stat-label">SỐ LƯỢNG</div><div class="smm-stat-value">${o.quantity}</div></div>
        <div class="smm-stat"><div class="smm-stat-label">BẮT ĐẦU</div><div class="smm-stat-value">${o.start_count != null ? Number(o.start_count).toLocaleString('vi-VN') : '—'}</div></div>
        <div class="smm-stat"><div class="smm-stat-label">CÒN LẠI</div><div class="smm-stat-value">${o.remains != null ? Number(o.remains).toLocaleString('vi-VN') : '—'}</div></div>
        <div class="smm-stat"><div class="smm-stat-label">CHI PHÍ</div><div class="smm-stat-value smm-stat-price">${fmt(o.charge)}</div></div>
      </div>`;
    cardsWrap.appendChild(card);
  });
  view.appendChild(cardsWrap);

  // Copy buttons
  cardsWrap.querySelectorAll('.smm-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.copy).then(() => toast('Đã sao chép', 'success'));
    });
  });

  // Per-card refresh buttons
  cardsWrap.querySelectorAll('.smm-order-refresh-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      const icon = btn.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      try {
        // GET /smm/orders/{id} sẽ tự fetch trạng thái live + hoàn tiền nếu cần
        await apiFetch('/smm/orders/' + btn.dataset.id);
        toast('Đã cập nhật trạng thái', 'success');
        await renderSmmHistoryPage(view, page, statusFilter, searchFilter);
      } catch (err) {
        toast(err.message || 'Cập nhật thất bại', 'error');
      } finally {
        btn.disabled = false;
        if (icon) icon.classList.remove('fa-spin');
      }
    });
  });

  // ── Pagination ──
  const totalPages = Math.ceil((data.total || 0) / limit);
  if (totalPages > 1) {
    const pagWrap = el('div', 'smm-pagination');

    // Prev button
    const prevBtn = el('button', 'smm-page-btn' + (page <= 1 ? ' disabled' : ''));
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    if (page > 1) prevBtn.addEventListener('click', () => goPage(page - 1));
    pagWrap.appendChild(prevBtn);

    // Page numbers (max 5 visible with ellipsis)
    const range = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
      if (page < totalPages - 2) range.push('…');
      range.push(totalPages);
    }
    range.forEach(p => {
      if (p === '…') {
        const dot = el('span', 'smm-page-dots');
        dot.textContent = '…';
        pagWrap.appendChild(dot);
      } else {
        const btn = el('button', 'smm-page-btn' + (p === page ? ' active' : ''));
        btn.textContent = p;
        btn.addEventListener('click', () => goPage(p));
        pagWrap.appendChild(btn);
      }
    });

    // Next button
    const nextBtn = el('button', 'smm-page-btn' + (page >= totalPages ? ' disabled' : ''));
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    if (page < totalPages) nextBtn.addEventListener('click', () => goPage(page + 1));
    pagWrap.appendChild(nextBtn);

    function goPage(p) {
      const params = new URLSearchParams();
      params.set('page', p);
      if (statusFilter) params.set('status', statusFilter);
      if (searchFilter) params.set('q', searchFilter);
      navigateTo('/smm/history?' + params.toString());
    }

    view.appendChild(pagWrap);
  }
}

// ── Page 3.5: Order Detail ──────────────────────────────────
async function renderSmmOrderDetail(view, { id }) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const o = await apiFetch(`/smm/orders/${id}`);

    const fmtDateFull = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });
    };

    // Progress calculation
    const qty = o.quantity || 0;
    const rem = o.remains != null ? o.remains : qty;
    const done = qty - rem;
    const pct = qty > 0 ? Math.min(100, Math.round((done / qty) * 100)) : 0;
    const isComplete = o.status === 'completed';

    const isUrl = o.link && (o.link.startsWith('http://') || o.link.startsWith('https://'));

    view.innerHTML = `
      <a href="/smm/history" class="smm-detail-back" onclick="event.preventDefault();navigateTo('/smm/history')">
        <i class="fa-solid fa-arrow-left"></i> Quay lại danh sách
      </a>
      <div class="smm-detail-header-row">
        <h1 class="smm-detail-title">Chi tiết đơn hàng #${esc(String(o.order_code || o.id))}</h1>
      </div>

      <!-- Service Name Card -->
      <div class="card smm-detail-service-card">
        <div class="smm-detail-service-name">${esc(o.service_name || '—')}</div>
      </div>

      <!-- Info Card -->
      <div class="card smm-detail-info-card">
        <div class="smm-detail-info-grid">
          <div class="smm-detail-info-item">
            <div class="smm-detail-info-label">MÃ ĐƠN HÀNG:</div>
            <div class="smm-detail-info-value fw-600">#${esc(String(o.order_code || o.id))}</div>
          </div>
          <div class="smm-detail-info-item">
            <div class="smm-detail-info-label">NGÀY ĐẶT:</div>
            <div class="smm-detail-info-value">${fmtDateFull(o.created_at)}</div>
          </div>
          <div class="smm-detail-info-item">
            <div class="smm-detail-info-label">LOẠI ĐƠN HÀNG:</div>
            <div class="smm-detail-info-value">
              <span class="badge badge-gray">${esc(o.service_type || 'Default')}</span>
            </div>
          </div>
          <div class="smm-detail-info-item">
            <div class="smm-detail-info-label">CHI PHÍ:</div>
            <div class="smm-detail-info-value smm-stat-price fw-600">${fmt(o.charge)}</div>
          </div>
        </div>
        <div class="smm-detail-divider"></div>
        <div class="smm-detail-info-label" style="margin-bottom:6px;">LIÊN KẾT:</div>
        ${isUrl
          ? `<a href="${esc(o.link)}" target="_blank" rel="noopener" class="smm-detail-link">${esc(o.link)} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:12px;"></i></a>`
          : `<div class="smm-detail-link-text">${esc(o.link || '—')}</div>`
        }
      </div>

      <!-- Progress Card -->
      <div class="card smm-detail-progress-card">
        <h3 class="smm-detail-section-title">Tiến độ đơn hàng</h3>
        <div class="smm-detail-stats-row">
          <div class="smm-detail-stat-box">
            <div class="smm-detail-stat-num">${qty}</div>
            <div class="smm-detail-stat-label">Tổng số</div>
          </div>
          <div class="smm-detail-stat-box">
            <div class="smm-detail-stat-num">${o.start_count != null ? Number(o.start_count).toLocaleString('vi-VN') : '—'}</div>
            <div class="smm-detail-stat-label">Số ban đầu</div>
          </div>
          <div class="smm-detail-stat-box">
            <div class="smm-detail-stat-num" style="color:${rem > 0 ? 'var(--primary)' : 'var(--text-heading)'}">${o.remains != null ? Number(o.remains).toLocaleString('vi-VN') : '—'}</div>
            <div class="smm-detail-stat-label">Số lượng còn lại</div>
          </div>
        </div>
        <div class="smm-progress-bar-wrap">
          <div class="smm-progress-bar" style="width:${pct}%"></div>
          ${isComplete ? '<i class="fa-solid fa-circle-check smm-progress-check"></i>' : ''}
        </div>
        <div class="smm-detail-status-row">
          ${smmStatusBadge(o.status)}
          ${(o.delivery_type === 'api' && o.external_order_id) ? `
            <button id="smm-detail-refresh" type="button" class="smm-detail-refresh-inline" title="Cập nhật trạng thái từ nguồn">
              <i class="fa-solid fa-rotate"></i> <span>Cập nhật</span>
            </button>` : ''}
        </div>
      </div>

      <!-- Notes Card -->
      ${o.service_description ? `
      <div class="card smm-detail-notes-card">
        <h3 class="smm-detail-section-title">Ghi chú & Hỗ trợ</h3>
        <div class="smm-detail-description smm-rich-text">${o.service_description}</div>
      </div>` : ''}

      <!-- Support / Actions Card -->
      <div class="card smm-detail-support-card">
        <h3 style="margin:0 0 8px 0;font-size:16px;">ℹ️ Bạn cần hỗ trợ?</h3>
        <p class="text-muted" style="margin:0 0 16px 0;font-size:14px;">Nếu đơn hàng có vấn đề hoặc sai số liệu, bạn có thể yêu cầu bảo hành hoặc báo lỗi.</p>

        ${(isComplete && o.can_refill && !o.refill_id) ? `
          <button id="smm-detail-refill-btn" class="btn btn-primary smm-support-btn" style="width:100%;border-radius:12px;padding:14px;font-weight:600;font-size:15px;margin-bottom:10px;" data-order-id="${o.id}">
            <i class="fa-solid fa-shield-halved" style="margin-right:8px;"></i> Yêu cầu bảo hành
          </button>` : ''}
        ${(o.refill_id) ? `
          <div style="background:var(--bg-page);border-radius:10px;padding:12px 14px;margin-bottom:10px;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span><i class="fa-solid fa-shield-halved" style="color:var(--primary);margin-right:6px;"></i> Bảo hành: ${smmRefillBadge(o.refill_status)}</span>
            <button id="smm-detail-check-refill" class="btn btn-outline btn-sm" style="border-radius:8px;" data-order-id="${o.id}">Kiểm tra lại</button>
          </div>` : ''}

        <button id="smm-detail-report-btn" class="smm-support-btn smm-support-btn-report" data-order-code="${esc(String(o.order_code || o.id))}">
          <i class="fa-solid fa-triangle-exclamation"></i> Báo lỗi đơn hàng
        </button>

        <button class="smm-support-btn smm-support-btn-chat" onclick="navigateTo('/support')">
          <i class="fa-regular fa-comment-dots"></i> Chat hỗ trợ (Ticket)
        </button>
        ${(appSettings.social_tele) ? `
        <a href="${esc(appSettings.social_tele)}" target="_blank" rel="noopener" class="smm-support-btn smm-support-btn-telegram">
          <i class="fa-brands fa-telegram"></i> Liên hệ Telegram
        </a>` : ''}
      </div>`;

    // Wire up refill request
    const refillBtn = qs('#smm-detail-refill-btn', view);
    if (refillBtn) {
      refillBtn.addEventListener('click', async () => {
        refillBtn.disabled = true;
        refillBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i> Đang gửi...';
        try {
          await apiFetch(`/smm/orders/${o.id}/refill`, { method: 'POST' });
          toast('Yêu cầu bảo hành đã được gửi!', 'success');
          renderSmmOrderDetail(view, { id: o.id });
        } catch (err) {
          toast(err.message || 'Gửi yêu cầu thất bại', 'error');
          refillBtn.disabled = false;
          refillBtn.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:8px;"></i> Yêu cầu bảo hành';
        }
      });
    }

    // Wire up refill check
    const checkBtn = qs('#smm-detail-check-refill', view);
    if (checkBtn) {
      checkBtn.addEventListener('click', async () => {
        checkBtn.disabled = true;
        checkBtn.textContent = 'Đang kiểm tra...';
        try {
          const res = await apiFetch(`/smm/orders/${o.id}/refill-status`);
          toast(`Trạng thái bảo hành: ${res.refill_status || 'đang xử lý'}`, 'info');
          renderSmmOrderDetail(view, { id: o.id });
        } catch (err) {
          toast(err.message || 'Kiểm tra thất bại', 'error');
          checkBtn.disabled = false;
          checkBtn.textContent = 'Kiểm tra lại';
        }
      });
    }

    // Wire up báo lỗi → support form pre-filled
    const reportBtn = qs('#smm-detail-report-btn', view);
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        const code = reportBtn.dataset.orderCode || '';
        const subject = encodeURIComponent(`Báo lỗi đơn SMM #${code}`);
        const msg = encodeURIComponent(`Mã đơn: ${code}\nDịch vụ: ${o.service_name || ''}\nLink: ${o.link || ''}\n\nMô tả vấn đề:\n`);
        navigateTo(`/support?subject=${subject}&category=order&message=${msg}`);
      });
    }

    // Wire up nút "Cập nhật trạng thái" — gọi lại endpoint để pull live status từ provider
    const refreshBtn = qs('#smm-detail-refresh', view);
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        const orig = refreshBtn.innerHTML;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang cập nhật...';
        try {
          // Endpoint /smm/orders/{id} đã tự pull live status từ provider
          await renderSmmOrderDetail(view, { id });
          if (typeof toast === 'function') toast('Đã cập nhật trạng thái mới nhất', 'success');
        } catch (e) {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = orig;
          if (typeof toast === 'function') toast('Cập nhật thất bại: ' + (e.message || ''), 'error');
        }
      });
    }

  } catch (err) {
    view.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3>Không tìm thấy đơn hàng</h3>
        <p class="text-muted">${esc(err.message || 'Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.')}</p>
        <button class="btn btn-outline" style="margin-top:12px;border-radius:10px;" onclick="navigateTo('/smm/history')">Quay lại</button>
      </div>`;
  }
}

// ─── SMM WARRANTY (user view-only list of refill requests) ─────────
async function renderSmmWarranty(view) {
  let curStatus = '';
  let curSearch = '';
  let curPage = 1;
  const LIMIT = 20;

  const STATUS_LABEL = {
    pending: 'Đang chờ',
    in_progress: 'Đang xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    success: 'Hoàn thành',
    rejected: 'Từ chối',
    canceled: 'Đã hủy',
    partial: 'Một phần',
  };
  const STATUS_CLASS = {
    pending: 'smmw-st-pending',
    in_progress: 'smmw-st-progress',
    processing: 'smmw-st-progress',
    completed: 'smmw-st-completed',
    success: 'smmw-st-completed',
    rejected: 'smmw-st-canceled',
    canceled: 'smmw-st-canceled',
    partial: 'smmw-st-partial',
  };

  const fmtD = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const shell = () => `
    <div class="smm-warranty-page">
      <h1 class="smm-warranty-title">Bảo hành dịch vụ</h1>

      <div class="smm-warranty-filter">
        <div class="smm-warranty-filter-row">
          <select class="smm-warranty-select-real" id="smmw-status">
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Đang chờ</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="partial">Một phần</option>
            <option value="rejected">Từ chối</option>
            <option value="canceled">Đã hủy</option>
          </select>
          <select class="smm-warranty-select-real" id="smmw-type">
            <option value="">Tìm theo dạng</option>
            <option value="warranty_code">Mã bảo hành</option>
            <option value="order_code">Mã đơn hàng</option>
            <option value="service">Tên dịch vụ</option>
          </select>
        </div>
        <div class="smm-warranty-search-row">
          <input type="text" class="smm-warranty-input-real" id="smmw-q" placeholder="Từ khóa" value="" />
          <button type="button" class="smm-warranty-search-btn smm-warranty-search-btn-on" id="smmw-go">Tìm kiếm</button>
        </div>
      </div>

      <div class="smm-warranty-table-card">
        <div class="smm-warranty-table-head">
          <div>MÃ BẢO HÀNH</div>
          <div>MÃ ĐƠN HÀNG</div>
          <div>NGÀY TẠO</div>
          <div>TRẠNG THÁI</div>
        </div>
        <div class="smm-warranty-table-body" id="smmw-body">
          <div class="smm-warranty-empty">Đang tải...</div>
        </div>
      </div>

      <div class="smm-warranty-pagination" id="smmw-pager"></div>
    </div>
  `;

  const renderRows = (items, total) => {
    const body = view.querySelector('#smmw-body');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<div class="smm-warranty-empty">Không có yêu cầu bảo hành</div>';
      return;
    }
    body.innerHTML = items.map(it => {
      const stKey = String(it.refill_status || '').toLowerCase();
      const stLabel = STATUS_LABEL[stKey] || it.refill_status || '—';
      const stCls = STATUS_CLASS[stKey] || 'smmw-st-pending';
      return `
        <div class="smm-warranty-row" data-order-id="${it.order_id}">
          <div class="smmw-cell smmw-mono" data-label="Mã bảo hành">${esc(String(it.warranty_code || '—'))}</div>
          <div class="smmw-cell" data-label="Mã đơn hàng"><a href="/smm/history/${it.order_id}" class="smmw-link" onclick="event.preventDefault();navigateTo('/smm/history/${it.order_id}')">#${esc(String(it.order_code || it.order_id))}</a></div>
          <div class="smmw-cell smmw-muted" data-label="Ngày tạo">${fmtD(it.created_at)}</div>
          <div class="smmw-cell" data-label="Trạng thái"><span class="smmw-status ${stCls}">${esc(stLabel)}</span></div>
        </div>
      `;
    }).join('');

    // pager
    const pager = view.querySelector('#smmw-pager');
    if (!pager) return;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    if (totalPages <= 1) { pager.innerHTML = ''; return; }
    pager.innerHTML = `
      <button class="smmw-pg-btn" data-pg="${curPage - 1}" ${curPage <= 1 ? 'disabled' : ''}>&laquo;</button>
      <span class="smmw-pg-info">Trang ${curPage} / ${totalPages}</span>
      <button class="smmw-pg-btn" data-pg="${curPage + 1}" ${curPage >= totalPages ? 'disabled' : ''}>&raquo;</button>
    `;
  };

  const load = async () => {
    const body = view.querySelector('#smmw-body');
    if (body) body.innerHTML = '<div class="smm-warranty-empty">Đang tải...</div>';
    try {
      const params = new URLSearchParams();
      if (curStatus) params.set('status', curStatus);
      if (curSearch) params.set('search', curSearch);
      params.set('page', curPage);
      params.set('limit', LIMIT);
      const data = await apiFetch(`/smm/warranty?${params.toString()}`);
      renderRows(data.items || [], data.total || 0);
    } catch (err) {
      if (body) body.innerHTML = `<div class="smm-warranty-empty smmw-error">Lỗi: ${esc(err.message || 'không tải được')}</div>`;
    }
  };

  view.innerHTML = shell();

  // Wire events
  view.querySelector('#smmw-status').addEventListener('change', (e) => {
    curStatus = e.target.value; curPage = 1; load();
  });
  const doSearch = () => {
    const q = view.querySelector('#smmw-q');
    curSearch = (q && q.value || '').trim();
    curPage = 1; load();
  };
  view.querySelector('#smmw-go').addEventListener('click', doSearch);
  view.querySelector('#smmw-q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  view.addEventListener('click', (e) => {
    const pg = e.target.closest('[data-pg]');
    if (pg && !pg.disabled) {
      const p = parseInt(pg.dataset.pg);
      if (p >= 1) { curPage = p; load(); }
    }
  });

  await load();
}

