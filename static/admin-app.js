/* ===================================================================
   Admin App — SPA quản trị độc lập (tách hoàn toàn khỏi client).
   Sync với client qua cùng token 'sk_token' + cùng backend /api.
   Tự chứa: API client, router, shell, auth, dashboard + màn quản lý.
   =================================================================== */
(function () {
  'use strict';

  // ── Config / state ───────────────────────────────────
  var API = '/api';
  var TOKEN_KEY = 'sk_token';
  var ADMIN_ROLES = ['admin', 'superadmin', 'staff'];
  var state = { user: null, settings: {}, path: location.pathname };

  // ── Tiny utils ───────────────────────────────────────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 300); }; }
  function fmtMoney(n) { return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString('vi-VN'); }
  function fmtDate(s) { if (!s) return '—'; var d = new Date(s); return d.toLocaleDateString('vi-VN'); }
  function fmtDateTime(s) { if (!s) return '—'; var d = new Date(s); return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

  // ── CSV export ───────────────────────────────────────
  function csvCell(val) { var s = val == null ? '' : String(val); if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'; return s; }
  function exportCSV(filename, columns, items) {
    if (!items || !items.length) { toast('Không có dữ liệu để xuất', 'error'); return; }
    var head = columns.map(function (c) { return csvCell(c.label); }).join(',');
    var lines = items.map(function (it) { return columns.map(function (c) { return csvCell(c.get(it)); }).join(','); });
    var csv = '﻿' + [head].concat(lines).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Đã xuất ' + items.length + ' dòng', 'success');
  }
  // Xuất CSV TẤT CẢ trang (theo bộ lọc) — lặp gọi API tới khi hết, tối đa ~10k dòng
  function exportAllCSV(filename, columns, makeUrl, btn) {
    var limit = 100, page = 1, acc = [];
    if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = 'Đang xuất...'; }
    var done = function () { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t; } };
    function next() {
      return api(makeUrl(page, limit)).then(function (d) {
        var items = d.items || (Array.isArray(d) ? d : []);
        acc = acc.concat(items);
        if (items.length >= limit && page < 100) { page++; return next(); }
        return acc;
      });
    }
    next().then(function (all) { exportCSV(filename, columns, all); done(); }).catch(function (e) { toast(e.message, 'error'); done(); });
  }
  // Quản lý chọn nhiều: gắn vào 1 card có checkbox.row-chk + #ap-chk-all + thanh #ap-bulkbar (.count)
  function setupBulk(card, onRender) {
    var sel = new Set();
    var all = card.querySelector('#ap-chk-all');
    var bar = card.querySelector('#ap-bulkbar');
    var sync = function () {
      if (bar) { bar.style.display = sel.size ? 'flex' : 'none'; var c = bar.querySelector('.count'); if (c) c.textContent = sel.size + ' đã chọn'; }
      if (all) { var boxes = card.querySelectorAll('.row-chk'); all.checked = boxes.length > 0 && sel.size === boxes.length; }
      if (onRender) onRender(sel);
    };
    card.querySelectorAll('.row-chk').forEach(function (b) { b.addEventListener('change', function () { if (b.checked) sel.add(b.getAttribute('data-id')); else sel.delete(b.getAttribute('data-id')); sync(); }); });
    if (all) all.addEventListener('change', function () { card.querySelectorAll('.row-chk').forEach(function (b) { b.checked = all.checked; if (all.checked) sel.add(b.getAttribute('data-id')); else sel.delete(b.getAttribute('data-id')); }); sync(); });
    sync();
    return { ids: function () { return Array.from(sel); } };
  }

  // ── API client ───────────────────────────────────────
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var tk = getToken();
    if (tk) headers['Authorization'] = 'Bearer ' + tk;
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = {};
        try { data = txt ? JSON.parse(txt) : {}; } catch (e) { data = {}; }
        if (!r.ok) { var err = new Error(data.detail || ('Lỗi ' + r.status)); err.status = r.status; throw err; }
        return data;
      });
    });
  }

  // ── Toast ────────────────────────────────────────────
  function toast(msg, type) {
    var wrap = $('#ap-toasts'); if (!wrap) return;
    var t = document.createElement('div');
    t.className = 'ap-toast ' + (type || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  // ── Theme ────────────────────────────────────────────
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('ap_theme', t); }
  function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); var b = $('#ap-theme-icon'); if (b) b.innerHTML = ICON(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon'); }

  // ── Icons ────────────────────────────────────────────
  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    orders: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    products: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    categories: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    stock: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    coupons: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="13" y1="5" x2="13" y2="19"/>',
    flash: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    affiliate: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
    blog: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
    announce: '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    tickets: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.9" y1="4.9" x2="9.2" y2="9.2"/><line x1="14.8" y1="14.8" x2="19.1" y2="19.1"/><line x1="14.8" y1="9.2" x2="19.1" y2="4.9"/><line x1="4.9" y1="19.1" x2="9.2" y2="14.8"/>',
    payments: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    box: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
    revenue: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  };
  function ICON(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>'; }

  // ── Navigation model ─────────────────────────────────
  var NAV = [
    { group: 'Tổng quan', items: [{ p: '/admin', icon: 'dashboard', label: 'Dashboard', ready: true }] },
    { group: 'Bán hàng', items: [
      { p: '/admin/orders', icon: 'orders', label: 'Đơn hàng', ready: true },
      { p: '/admin/products', icon: 'products', label: 'Sản phẩm', ready: true },
      { p: '/admin/categories', icon: 'categories', label: 'Danh mục', ready: true },
      { p: '/admin/stock', icon: 'stock', label: 'Kho hàng', ready: true },
      { p: '/admin/coupons', icon: 'coupons', label: 'Mã giảm giá', ready: true },
      { p: '/admin/flash-sales', icon: 'flash', label: 'Flash Sale', ready: true },
    ] },
    { group: 'Người dùng', items: [
      { p: '/admin/users', icon: 'users', label: 'Người dùng', ready: true },
      { p: '/admin/affiliates', icon: 'affiliate', label: 'Affiliate', ready: true },
    ] },
    { group: 'Nội dung', items: [
      { p: '/admin/blog', icon: 'blog', label: 'Blog', ready: true },
      { p: '/admin/announcements', icon: 'announce', label: 'Thông báo', ready: true },
      { p: '/admin/tickets', icon: 'tickets', label: 'Hỗ trợ', ready: true },
    ] },
    { group: 'Hệ thống', items: [
      { p: '/admin/payments', icon: 'payments', label: 'Thanh toán', ready: true },
      { p: '/admin/settings', icon: 'settings', label: 'Cài đặt', ready: true },
    ] },
  ];
  function navMeta(path) {
    for (var g = 0; g < NAV.length; g++) for (var i = 0; i < NAV[g].items.length; i++) {
      if (NAV[g].items[i].p === path) return { item: NAV[g].items[i], group: NAV[g].group };
    }
    return null;
  }

  // ── Status meta ──────────────────────────────────────
  var STATUS = {
    pending: { c: 'amber', t: 'Chờ thanh toán' }, pending_payment: { c: 'amber', t: 'Chờ thanh toán' },
    paid: { c: 'blue', t: 'Đã thanh toán' }, processing: { c: 'indigo', t: 'Đang xử lý' },
    completed: { c: 'green', t: 'Đã giao' }, cancelled: { c: 'gray', t: 'Đã hủy' },
    failed: { c: 'red', t: 'Lỗi/Hoàn' }, refunded: { c: 'gray', t: 'Hoàn tiền' },
  };
  function statusBadge(s) { var m = STATUS[s] || { c: 'gray', t: s || '—' }; return '<span class="ap-badge ' + m.c + '">' + esc(m.t) + '</span>'; }

  // ── Router ───────────────────────────────────────────
  var ROUTES = {
    '/admin': screenDashboard,
    '/admin/orders': screenOrders,
    '/admin/products': screenProducts,
    '/admin/users': screenUsers,
    '/admin/categories': screenCategories,
    '/admin/coupons': screenCoupons,
    '/admin/flash-sales': screenFlashSales,
    '/admin/stock': screenStock,
    '/admin/payments': screenPayments,
    '/admin/announcements': screenAnnouncements,
    '/admin/affiliates': screenAffiliate,
    '/admin/blog': screenBlog,
    '/admin/tickets': screenTickets,
    '/admin/settings': screenSettings,
  };
  function go(path, replace) {
    if (path === location.pathname) { render(); return; }
    history[replace ? 'replaceState' : 'pushState']({}, '', path);
    render();
  }
  window.addEventListener('popstate', render);

  // ── Boot ─────────────────────────────────────────────
  applyTheme(localStorage.getItem('ap_theme') || 'light');
  boot();

  function boot() {
    Promise.all([
      api('/auth/me').catch(function () { return null; }),
      api('/admin/settings/public').catch(function () { return {}; }),
    ]).then(function (res) {
      state.user = res[0];
      state.settings = res[1] || {};
      render();
    });
  }

  function isAuthed() { return state.user && ADMIN_ROLES.indexOf(state.user.role) >= 0; }

  // ── Main render ──────────────────────────────────────
  function render() {
    var path = location.pathname;
    state.path = path;
    if (!isAuthed()) { renderLogin(); return; }
    if (path === '/admin/login') { go('/admin', true); return; }
    if (!$('#ap-shell-root')) renderShell();
    setActiveNav(path);
    var view = $('#ap-view');
    var meta = navMeta(path);
    setBreadcrumb(meta);
    var fn = ROUTES[path];
    if (fn) { fn(view); }
    else if (meta) { screenSoon(view, meta.item.label); }
    else { screenNotFound(view); }
  }

  // ── Shell ────────────────────────────────────────────
  function renderShell() {
    var u = state.user || {};
    var initials = (u.display_name || u.email || 'A').charAt(0).toUpperCase();
    var siteName = state.settings.site_name || 'Admin';
    var navHtml = NAV.map(function (g) {
      return '<div class="ap-nav-group"><div class="ap-nav-group-title">' + esc(g.group) + '</div>' +
        g.items.map(function (it) {
          return '<a class="ap-nav-item' + (it.ready ? '' : ' soon') + '" data-path="' + it.p + '">' + ICON(it.icon) + '<span>' + esc(it.label) + '</span></a>';
        }).join('') + '</div>';
    }).join('');

    var root = $('#ap-root');
    root.innerHTML =
      '<div class="ap-shell" id="ap-shell-root">' +
        '<aside class="ap-sidebar" id="ap-sidebar">' +
          '<div class="ap-brand"><div class="ap-brand-logo">' + ICON('box') + '</div><div>' + esc(siteName) + '<small>Bảng điều khiển</small></div></div>' +
          '<nav class="ap-nav">' + navHtml + '</nav>' +
        '</aside>' +
        '<div class="ap-main">' +
          '<header class="ap-topbar">' +
            '<button class="ap-burger" id="ap-burger">' + ICON('menu') + '</button>' +
            '<div class="ap-breadcrumb" id="ap-breadcrumb"></div>' +
            '<div class="ap-topbar-spacer"></div>' +
            '<button class="ap-icon-btn" id="ap-theme-btn" title="Đổi giao diện"><span id="ap-theme-icon">' + ICON(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon') + '</span></button>' +
            '<a class="ap-icon-btn" href="/" title="Về trang khách">' + ICON('logout') + '</a>' +
            '<div class="ap-user" id="ap-user"><div class="ap-avatar">' + esc(initials) + '</div><div class="ap-user-meta"><b>' + esc(u.display_name || u.email) + '</b><small>' + esc(u.role) + '</small></div></div>' +
          '</header>' +
          '<main class="ap-content" id="ap-view"></main>' +
        '</div>' +
      '</div>';

    // events
    root.addEventListener('click', function (e) {
      var nav = e.target.closest('.ap-nav-item');
      if (nav) { var p = nav.getAttribute('data-path'); if (p) { go(p); closeSidebar(); } return; }
    });
    $('#ap-theme-btn').addEventListener('click', toggleTheme);
    $('#ap-burger').addEventListener('click', function () { $('#ap-sidebar').classList.toggle('open'); });
    $('#ap-user').addEventListener('click', function () {
      if (confirm('Đăng xuất khỏi quản trị?')) { setToken(null); state.user = null; location.href = '/admin/login'; }
    });
  }
  function closeSidebar() { var s = $('#ap-sidebar'); if (s) s.classList.remove('open'); }
  function setActiveNav(path) {
    var items = document.querySelectorAll('.ap-nav-item');
    items.forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-path') === path); });
  }
  function setBreadcrumb(meta) {
    var bc = $('#ap-breadcrumb'); if (!bc) return;
    if (meta) bc.innerHTML = '<span>' + esc(meta.group) + '</span><span>/</span><b>' + esc(meta.item.label) + '</b>';
    else bc.innerHTML = '<b>Quản trị</b>';
  }

  // ── Reusable bits ────────────────────────────────────
  function pageHead(title, subtitle, actions) {
    return '<div class="ap-page-head"><div><h1>' + esc(title) + '</h1>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div><div style="display:flex;gap:10px">' + (actions || '') + '</div></div>';
  }
  function loading(view) { view.innerHTML = '<div style="display:grid;place-items:center;min-height:300px"><div class="ap-spinner"></div></div>'; }
  function emptyRow(cols, msg) { return '<tr><td colspan="' + cols + '"><div class="ap-empty">' + ICON('box') + '<div>' + esc(msg || 'Chưa có dữ liệu') + '</div></div></td></tr>'; }
  function pagination(total, page, limit, onGo) {
    var pages = Math.max(1, Math.ceil((total || 0) / limit));
    if (pages <= 1) return '';
    var html = '<div class="ap-pagination">';
    html += '<button ' + (page <= 1 ? 'disabled' : '') + ' data-pg="' + (page - 1) + '">‹</button>';
    var start = Math.max(1, page - 2), end = Math.min(pages, start + 4); start = Math.max(1, end - 4);
    for (var i = start; i <= end; i++) html += '<button class="' + (i === page ? 'active' : '') + '" data-pg="' + i + '">' + i + '</button>';
    html += '<button ' + (page >= pages ? 'disabled' : '') + ' data-pg="' + (page + 1) + '">›</button></div>';
    setTimeout(function () {
      document.querySelectorAll('.ap-pagination [data-pg]').forEach(function (b) {
        b.addEventListener('click', function () { if (!b.disabled) onGo(parseInt(b.getAttribute('data-pg'), 10)); });
      });
    }, 0);
    return html;
  }

  // ── Drawer ───────────────────────────────────────────
  function openDrawer(title, bodyHtml) {
    closeDrawer();
    var bd = document.createElement('div'); bd.className = 'ap-drawer-backdrop'; bd.id = 'ap-drawer-bd';
    var dr = document.createElement('div'); dr.className = 'ap-drawer'; dr.id = 'ap-drawer';
    dr.innerHTML = '<div class="ap-drawer-head"><h3>' + esc(title) + '</h3><button class="ap-icon-btn" id="ap-drawer-close">' + ICON('close') + '</button></div><div class="ap-drawer-body">' + bodyHtml + '</div>';
    document.body.appendChild(bd); document.body.appendChild(dr);
    requestAnimationFrame(function () { bd.classList.add('open'); dr.classList.add('open'); });
    bd.addEventListener('click', closeDrawer);
    $('#ap-drawer-close').addEventListener('click', closeDrawer);
    return dr;
  }
  function closeDrawer() {
    var bd = $('#ap-drawer-bd'), dr = $('#ap-drawer');
    if (dr) dr.classList.remove('open'); if (bd) bd.classList.remove('open');
    setTimeout(function () { if (bd) bd.remove(); if (dr) dr.remove(); }, 250);
  }

  // ── SCREEN: Login ────────────────────────────────────
  function renderLogin() {
    var root = $('#ap-root');
    root.innerHTML =
      '<div class="ap-login"><div class="ap-login-card">' +
        '<div class="ap-brand-logo">' + ICON('box') + '</div>' +
        '<h1>Đăng nhập quản trị</h1><p class="sub">Khu vực dành cho nhân viên & quản trị viên</p>' +
        '<div class="ap-login-error" id="ap-login-err" style="display:none"></div>' +
        '<form id="ap-login-form">' +
          '<div class="ap-field"><label>Email</label><input class="ap-input" type="email" id="ap-le" placeholder="admin@example.com" required autocomplete="email"></div>' +
          '<div class="ap-field"><label>Mật khẩu</label><input class="ap-input" type="password" id="ap-lp" placeholder="••••••••" required autocomplete="current-password"></div>' +
          '<button class="ap-btn primary" style="width:100%" id="ap-lbtn" type="submit">Đăng nhập</button>' +
        '</form>' +
        '<div style="text-align:center;margin-top:16px"><a href="/" style="color:var(--ap-text-3);font-size:13px">← Về trang khách hàng</a></div>' +
      '</div></div>';
    $('#ap-login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('#ap-lbtn'), errEl = $('#ap-login-err');
      btn.disabled = true; btn.textContent = 'Đang đăng nhập...'; errEl.style.display = 'none';
      api('/auth/admin/login', { method: 'POST', body: { email: $('#ap-le').value, password: $('#ap-lp').value } })
        .then(function (data) {
          var tk = data.token || data.access_token;
          if (!tk) throw new Error('Đăng nhập thất bại');
          setToken(tk);
          return api('/auth/me');
        })
        .then(function (me) { state.user = me; go('/admin', true); })
        .catch(function (err) { errEl.textContent = err.message || 'Email hoặc mật khẩu không đúng'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Đăng nhập'; });
    });
  }

  // ── SCREEN: Dashboard ────────────────────────────────
  function statCard(label, value, icon, color, sub) {
    return '<div class="ap-card ap-stat"><div class="ap-stat-top">' +
      '<div><div class="ap-stat-label">' + esc(label) + '</div><div class="ap-stat-value">' + value + '</div></div>' +
      '<div class="ap-stat-icon" style="background:' + color + '22;color:' + color + '">' + ICON(icon) + '</div></div>' +
      (sub ? '<div class="ap-stat-sub">' + sub + '</div>' : '') + '</div>';
  }
  function barChart(series) {
    if (!series || !series.length) return '<div class="ap-empty">Chưa có dữ liệu doanh thu</div>';
    var W = 760, H = 200, pad = 28, n = series.length;
    var max = series.reduce(function (m, s) { return Math.max(m, s.revenue); }, 0) || 1;
    var bw = (W - pad * 2) / n * 0.62, gap = (W - pad * 2) / n;
    var bars = series.map(function (s, i) {
      var h = Math.round((s.revenue / max) * (H - pad * 2));
      var x = pad + i * gap + (gap - bw) / 2, y = H - pad - h;
      var d = s.date.slice(5);
      return '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, h) + '" rx="3"><title>' + d + ': ' + fmtMoney(s.revenue) + '</title></rect>' +
        (i % 2 === 0 ? '<text class="axis-label" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + d + '</text>' : '');
    }).join('');
    return '<svg class="ap-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + bars + '</svg>';
  }
  function screenDashboard(view) {
    loading(view);
    api('/admin/stats/overview').then(function (d) {
      var t = d.totals || {}, r = d.revenue || {};
      var stats =
        statCard('Doanh thu hôm nay', fmtMoney(r.today), 'revenue', '#16a34a', 'Tuần: <b>' + fmtMoney(r.week) + '</b>') +
        statCard('Doanh thu tháng', fmtMoney(r.month), 'revenue', '#4f46e5', 'Tổng: ' + fmtMoney(r.total)) +
        statCard('Đơn cần xử lý', fmtNum(d.pending_orders), 'cart', '#d97706', 'Tổng đơn: ' + fmtNum(t.orders)) +
        statCard('Người dùng', fmtNum(t.users), 'users', '#0ea5e9', '+' + fmtNum(t.new_users_month) + ' tháng này');

      var recent = (d.recent_orders || []).map(function (o) {
        return '<tr><td class="ap-mono">' + esc(o.order_code) + '</td><td>' + esc(o.user_email || '—') + '</td><td>' + esc(o.product_name || '—') + '</td><td><b>' + fmtMoney(o.total) + '</b></td><td>' + statusBadge(o.status) + '</td><td style="color:var(--ap-text-3)">' + fmtDateTime(o.created_at) + '</td></tr>';
      }).join('') || emptyRow(6, 'Chưa có đơn hàng');

      var low = (d.low_stock || []).map(function (s) {
        var col = s.remaining === 0 ? 'red' : 'amber';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--ap-border)"><div><div style="font-weight:600">' + esc(s.package) + '</div><div style="font-size:12px;color:var(--ap-text-3)">' + esc(s.product) + '</div></div><span class="ap-badge ' + col + '">Còn ' + s.remaining + '</span></div>';
      }).join('') || '<div class="ap-empty" style="padding:20px">Kho hàng ổn định 👍</div>';

      view.innerHTML =
        pageHead('Dashboard', 'Tổng quan vận hành cửa hàng', '<button class="ap-btn" id="ap-refresh">' + ICON('refresh') + 'Làm mới</button>') +
        '<div class="ap-grid cols-4" style="margin-bottom:16px">' + stats + '</div>' +
        '<div class="ap-grid cols-3" style="grid-template-columns:2fr 1fr;margin-bottom:16px">' +
          '<div class="ap-card"><div class="ap-card-head"><h3>Doanh thu 14 ngày</h3></div><div class="ap-card-body">' + barChart(d.revenue_series) + '</div></div>' +
          '<div class="ap-card"><div class="ap-card-head"><h3>Cảnh báo tồn kho</h3><span class="ap-badge ' + ((d.low_stock || []).length ? 'amber' : 'green') + '">' + ((d.low_stock || []).length) + '</span></div><div class="ap-card-body" style="padding-top:6px">' + low + '</div></div>' +
        '</div>' +
        '<div class="ap-card"><div class="ap-card-head"><h3>Đơn hàng gần đây</h3><a class="ap-btn sm" data-path="/admin/orders" id="ap-go-orders">Xem tất cả</a></div>' +
          '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Mã đơn</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>' + recent + '</tbody></table></div></div>';
      var rf = $('#ap-refresh'); if (rf) rf.addEventListener('click', function () { screenDashboard(view); });
      var goO = $('#ap-go-orders'); if (goO) goO.addEventListener('click', function () { go('/admin/orders'); });
    }).catch(function (err) {
      view.innerHTML = pageHead('Dashboard', '') + '<div class="ap-card"><div class="ap-card-body"><div class="ap-empty">' + ICON('alert') + '<div>Không tải được số liệu: ' + esc(err.message) + '</div></div></div></div>';
    });
  }

  // ── SCREEN: Orders ───────────────────────────────────
  var ordersState = { page: 1, status: '', search: '' };
  function screenOrders(view) {
    view.innerHTML =
      pageHead('Đơn hàng', 'Theo dõi và xử lý đơn mua hàng') +
      '<div class="ap-toolbar">' +
        '<div class="ap-search">' + ICON('search') + '<input id="ap-ord-search" placeholder="Tìm mã đơn / email..." value="' + esc(ordersState.search) + '"></div>' +
        '<select class="ap-select" id="ap-ord-status" style="width:190px">' +
          ['', 'pending', 'paid', 'processing', 'completed', 'cancelled', 'failed', 'refunded'].map(function (s) {
            return '<option value="' + s + '"' + (ordersState.status === s ? ' selected' : '') + '>' + (s ? (STATUS[s] ? STATUS[s].t : s) : 'Tất cả trạng thái') + '</option>';
          }).join('') +
        '</select>' +
        '<button class="ap-btn" id="ap-ord-refresh">' + ICON('refresh') + '</button>' +
        '<div style="flex:1"></div>' +
        '<button class="ap-btn" id="ap-ord-csv">⬇ CSV</button>' +
      '</div>' +
      '<div class="ap-card" id="ap-ord-card"><div style="display:grid;place-items:center;min-height:240px"><div class="ap-spinner"></div></div></div>';

    $('#ap-ord-search').addEventListener('input', debounce(function (e) { ordersState.search = e.target.value.trim(); ordersState.page = 1; loadOrders(); }, 350));
    $('#ap-ord-status').addEventListener('change', function (e) { ordersState.status = e.target.value; ordersState.page = 1; loadOrders(); });
    $('#ap-ord-refresh').addEventListener('click', loadOrders);
    $('#ap-ord-csv').addEventListener('click', function () {
      var self = this;
      exportAllCSV('don-hang.csv', [
        { label: 'Mã đơn', get: function (o) { return o.orderCode; } },
        { label: 'Khách', get: function (o) { return o.userEmail; } },
        { label: 'Tổng', get: function (o) { return o.totalAmount; } },
        { label: 'Trạng thái', get: function (o) { return (STATUS[o.status] || {}).t || o.status; } },
        { label: 'Thời gian', get: function (o) { return fmtDateTime(o.createdAt); } },
      ], function (page, limit) { var u = '/orders/admin/all?page=' + page + '&limit=' + limit; if (ordersState.status) u += '&status=' + encodeURIComponent(ordersState.status); if (ordersState.search) u += '&search=' + encodeURIComponent(ordersState.search); return u; }, self);
    });
    loadOrders();
  }
  var ordersItems = [];
  function loadOrders() {
    var card = $('#ap-ord-card'); if (!card) return;
    var limit = 20;
    var q = '/orders/admin/all?page=' + ordersState.page + '&limit=' + limit;
    if (ordersState.status) q += '&status=' + encodeURIComponent(ordersState.status);
    if (ordersState.search) q += '&search=' + encodeURIComponent(ordersState.search);
    api(q).then(function (d) {
      var items = d.items || [];
      ordersItems = items;
      var rows = items.map(function (o) {
        return '<tr data-code="' + esc(o.orderCode) + '"><td><input type="checkbox" class="ap-chk row-chk" data-id="' + esc(o.orderCode) + '"></td><td class="ap-mono cell-go">' + esc(o.orderCode) + '</td><td class="cell-go">' + esc(o.userEmail || '—') + '</td><td class="cell-go">' + esc(o.productName || (o.items && o.items[0] ? o.items[0].productName : '') || '—') + '</td><td class="cell-go"><b>' + fmtMoney(o.totalAmount) + '</b></td><td class="cell-go">' + statusBadge(o.status) + '</td><td class="cell-go" style="color:var(--ap-text-3)">' + fmtDateTime(o.createdAt) + '</td></tr>';
      }).join('') || emptyRow(7, 'Không có đơn hàng');
      card.innerHTML =
        '<div class="ap-bulkbar" id="ap-bulkbar"><span class="count"></span><span class="sp"></span>' +
          '<select class="ap-select" id="ap-ord-bulk-status" style="width:auto">' + ['pending', 'paid', 'processing', 'completed', 'cancelled', 'failed', 'refunded'].map(function (s) { return '<option value="' + s + '">' + (STATUS[s] ? STATUS[s].t : s) + '</option>'; }).join('') + '</select>' +
          '<button class="ap-btn sm" id="ap-ord-bulk-apply">Áp dụng trạng thái</button>' +
          '<button class="ap-btn sm danger" id="ap-ord-bulk-del">Xóa</button>' +
        '</div>' +
        '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th style="width:36px"><input type="checkbox" class="ap-chk" id="ap-chk-all"></th><th>Mã đơn</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pagination(d.total, ordersState.page, limit, function (p) { ordersState.page = p; loadOrders(); });
      var bulk = setupBulk(card);
      card.querySelectorAll('.cell-go').forEach(function (td) {
        td.addEventListener('click', function () { var o = items.find(function (x) { return x.orderCode === td.parentNode.getAttribute('data-code'); }); if (o) orderDrawer(o); });
      });
      var apply = card.querySelector('#ap-ord-bulk-apply'); if (apply) apply.addEventListener('click', function () {
        var ids = bulk.ids(); if (!ids.length) return; var status = card.querySelector('#ap-ord-bulk-status').value;
        if (!confirm('Đổi ' + ids.length + ' đơn sang "' + (STATUS[status] ? STATUS[status].t : status) + '"?')) return;
        this.disabled = true;
        Promise.all(ids.map(function (code) { return api('/orders/admin/' + encodeURIComponent(code) + '/status', { method: 'PATCH', body: { status: status } }).catch(function () {}); })).then(function () { toast('Đã cập nhật ' + ids.length + ' đơn', 'success'); loadOrders(); });
      });
      var del = card.querySelector('#ap-ord-bulk-del'); if (del) del.addEventListener('click', function () {
        var ids = bulk.ids(); if (!ids.length) return;
        if (!confirm('Xóa ' + ids.length + ' đơn? Không thể hoàn tác.')) return;
        var orderIds = items.filter(function (o) { return ids.indexOf(o.orderCode) >= 0; }).map(function (o) { return o.id; });
        api('/orders/admin/bulk-delete', { method: 'POST', body: { ids: orderIds } }).then(function (r) { toast('Đã xóa ' + (r.deleted != null ? r.deleted : ids.length) + ' đơn', 'success'); loadOrders(); }).catch(function (e) { toast(e.message, 'error'); });
      });
    }).catch(function (err) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(err.message) + '</div></div>'; });
  }
  function orderDrawer(o) {
    var itemsHtml = (o.items && o.items.length ? o.items : [{ productName: o.productName, packageName: o.packageName, quantity: o.quantity, lineTotal: o.totalAmount }]).map(function (it) {
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--ap-border)"><div><div style="font-weight:600">' + esc(it.productName || '—') + '</div><div style="font-size:12px;color:var(--ap-text-3)">' + esc(it.packageName || '') + ' × ' + (it.quantity || 1) + '</div></div><b>' + fmtMoney(it.lineTotal) + '</b></div>';
    }).join('');
    var statusOpts = ['pending', 'paid', 'processing', 'completed', 'cancelled', 'failed', 'refunded'].map(function (s) {
      return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + (STATUS[s] ? STATUS[s].t : s) + '</option>';
    }).join('');
    var body =
      '<dl class="ap-dl">' +
        '<dt>Mã đơn</dt><dd class="ap-mono">' + esc(o.orderCode) + '</dd>' +
        '<dt>Khách</dt><dd>' + esc(o.userEmail || '—') + '</dd>' +
        '<dt>Tổng tiền</dt><dd><b>' + fmtMoney(o.totalAmount) + '</b></dd>' +
        '<dt>Thanh toán</dt><dd>' + esc(o.paymentMethod || '—') + '</dd>' +
        '<dt>Trạng thái</dt><dd>' + statusBadge(o.status) + '</dd>' +
        '<dt>Tạo lúc</dt><dd>' + fmtDateTime(o.createdAt) + '</dd>' +
      '</dl>' +
      '<h4 style="margin:18px 0 8px;font-size:13px">Sản phẩm</h4>' + itemsHtml +
      (o.deliveryData ? '<h4 style="margin:18px 0 8px;font-size:13px">Dữ liệu giao</h4><pre style="background:var(--ap-surface-2);padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all">' + esc(o.deliveryData) + '</pre>' : '') +
      '<h4 style="margin:18px 0 8px;font-size:13px">Cập nhật trạng thái</h4>' +
      '<div style="display:flex;gap:8px"><select class="ap-select" id="ap-od-status">' + statusOpts + '</select><button class="ap-btn primary" id="ap-od-save">Lưu</button></div>';
    openDrawer('Đơn ' + o.orderCode, body);
    $('#ap-od-save').addEventListener('click', function () {
      var btn = this; btn.disabled = true; btn.textContent = 'Đang lưu...';
      api('/orders/admin/' + encodeURIComponent(o.orderCode) + '/status', { method: 'PATCH', body: { status: $('#ap-od-status').value } })
        .then(function () { toast('Đã cập nhật trạng thái', 'success'); closeDrawer(); loadOrders(); })
        .catch(function (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Lưu'; });
    });
  }

  // ── SCREEN: Products ─────────────────────────────────
  var prodState = { page: 1, search: '' };
  var prodCache = [];
  function screenProducts(view) {
    view.innerHTML =
      pageHead('Sản phẩm', 'Quản lý sản phẩm và gói bán', '<button class="ap-btn primary" id="ap-pr-add">+ Thêm sản phẩm</button>') +
      '<div class="ap-toolbar"><div class="ap-search">' + ICON('search') + '<input id="ap-pr-search" placeholder="Tìm sản phẩm..." value="' + esc(prodState.search) + '"></div><button class="ap-btn" id="ap-pr-refresh">' + ICON('refresh') + '</button><div style="flex:1"></div><button class="ap-btn" id="ap-pr-csv">⬇ CSV</button></div>' +
      '<div class="ap-card" id="ap-pr-card"><div style="display:grid;place-items:center;min-height:240px"><div class="ap-spinner"></div></div></div>';
    $('#ap-pr-search').addEventListener('input', debounce(function (e) { prodState.search = e.target.value.trim(); prodState.page = 1; loadProducts(); }, 350));
    $('#ap-pr-refresh').addEventListener('click', loadProducts);
    $('#ap-pr-add').addEventListener('click', function () { productForm(null); });
    $('#ap-pr-csv').addEventListener('click', function () {
      var self = this;
      exportAllCSV('san-pham.csv', [
        { label: 'Tên', get: function (p) { return p.name; } },
        { label: 'Danh mục', get: function (p) { return (p.category && p.category.name) || ''; } },
        { label: 'Số gói', get: function (p) { return (p.packages || []).length; } },
        { label: 'Giá thấp nhất', get: function (p) { var k = p.packages || []; return k.length ? Math.min.apply(null, k.map(function (x) { return Number(x.price) || 0; })) : 0; } },
        { label: 'Trạng thái', get: function (p) { return p.isActive ? 'Đang bán' : 'Ẩn'; } },
      ], function (page, limit) { var u = '/products?active=all&sort=newest&page=' + page + '&limit=' + limit; if (prodState.search) u += '&search=' + encodeURIComponent(prodState.search); return u; }, self);
    });
    loadProducts();
  }
  function loadProducts() {
    var card = $('#ap-pr-card'); if (!card) return;
    var limit = 20;
    var q = '/products?active=all&page=' + prodState.page + '&limit=' + limit + '&sort=newest';
    if (prodState.search) q += '&search=' + encodeURIComponent(prodState.search);
    api(q).then(function (d) {
      var items = d.items || (Array.isArray(d) ? d : []);
      prodCache = items;
      var rows = items.map(function (p) {
        var pkgs = p.packages || [];
        var price = pkgs.length ? Math.min.apply(null, pkgs.map(function (x) { return Number(x.price) || 0; })) : 0;
        var img = p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" style="width:34px;height:34px;border-radius:8px;object-fit:cover" onerror="this.style.display=\'none\'">' : '';
        return '<tr><td><input type="checkbox" class="ap-chk row-chk" data-id="' + p.id + '"></td><td><div style="display:flex;align-items:center;gap:10px">' + img + '<div><div style="font-weight:600">' + esc(p.name) + '</div><div style="font-size:12px;color:var(--ap-text-3)">' + esc((p.category && p.category.name) || '—') + '</div></div></div></td>' +
          '<td>' + (pkgs.length ? 'từ ' + fmtMoney(price) : '—') + '</td>' +
          '<td><button class="ap-btn sm" data-pkgs="' + p.id + '">' + pkgs.length + ' gói</button></td>' +
          '<td>' + (p.isFeatured ? '<span class="ap-badge indigo">Nổi bật</span>' : '') + '</td>' +
          '<td>' + (p.isActive ? '<span class="ap-badge green">Đang bán</span>' : '<span class="ap-badge gray">Ẩn</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="ap-btn sm" data-edit="' + p.id + '">Sửa</button> <button class="ap-btn sm danger" data-del="' + p.id + '">Xóa</button></td></tr>';
      }).join('') || emptyRow(7, 'Không có sản phẩm');
      card.innerHTML =
        '<div class="ap-bulkbar" id="ap-bulkbar"><span class="count"></span><span class="sp"></span>' +
          '<button class="ap-btn sm" id="ap-pr-bulk-show">Hiện</button><button class="ap-btn sm" id="ap-pr-bulk-hide">Ẩn</button><button class="ap-btn sm danger" id="ap-pr-bulk-del">Xóa</button>' +
        '</div>' +
        '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th style="width:36px"><input type="checkbox" class="ap-chk" id="ap-chk-all"></th><th>Sản phẩm</th><th>Giá</th><th>Gói</th><th></th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pagination(d.total || items.length, prodState.page, limit, function (pg) { prodState.page = pg; loadProducts(); });
      var bulk = setupBulk(card);
      var bulkSet = function (active) { var ids = bulk.ids(); if (!ids.length) return; Promise.all(ids.map(function (id) { return api('/products/admin/' + id, { method: 'PATCH', body: { is_active: active } }).catch(function () {}); })).then(function () { toast('Đã cập nhật ' + ids.length + ' sản phẩm', 'success'); loadProducts(); }); };
      var bShow = card.querySelector('#ap-pr-bulk-show'); if (bShow) bShow.addEventListener('click', function () { bulkSet(true); });
      var bHide = card.querySelector('#ap-pr-bulk-hide'); if (bHide) bHide.addEventListener('click', function () { bulkSet(false); });
      var bDel = card.querySelector('#ap-pr-bulk-del'); if (bDel) bDel.addEventListener('click', function () { var ids = bulk.ids(); if (!ids.length) return; if (!confirm('Xóa ' + ids.length + ' sản phẩm? Mọi gói & kho liên quan cũng bị xóa.')) return; Promise.all(ids.map(function (id) { return api('/products/admin/' + id, { method: 'DELETE' }).catch(function () {}); })).then(function () { toast('Đã xóa ' + ids.length + ' sản phẩm', 'success'); loadProducts(); }); });
      var find = function (id) { return prodCache.find(function (x) { return x.id == id; }); };
      card.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { productForm(find(b.getAttribute('data-edit'))); }); });
      card.querySelectorAll('[data-pkgs]').forEach(function (b) { b.addEventListener('click', function () { packagesDrawer(find(b.getAttribute('data-pkgs'))); }); });
      card.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
        var p = find(b.getAttribute('data-del'));
        if (!confirm('Xóa sản phẩm "' + (p ? p.name : '') + '"? Mọi gói & kho liên quan cũng bị xóa.')) return;
        api('/products/admin/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); loadProducts(); }).catch(function (e) { toast(e.message, 'error'); });
      }); });
    }).catch(function (err) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(err.message) + '</div></div>'; });
  }

  // Product create/edit form (cần danh sách danh mục)
  var catCache = null;
  function ensureCategories() { return catCache ? Promise.resolve(catCache) : api('/categories').then(function (c) { catCache = c || []; return catCache; }); }
  function productForm(p) {
    p = p || {};
    ensureCategories().then(function (cats) {
      var catOpts = [{ v: '', t: '— Không danh mục —' }].concat((cats || []).map(function (c) { return { v: c.id, t: c.name }; }));
      var body = inp('pf-name', 'Tên sản phẩm', p.name, 'text', 'VD: Netflix Premium') +
        sel('pf-cat', 'Danh mục', p.categoryId || (p.category && p.category.id) || '', catOpts) +
        inp('pf-img', 'Ảnh URL', p.imageUrl, 'text', 'https://...') +
        ta('pf-desc', 'Mô tả', p.description, '') +
        ta('pf-notes', 'Ghi chú (hiển thị sau khi mua)', p.notes, '') +
        '<div class="ap-form-row">' + inp('pf-sort', 'Thứ tự', p.sortOrder || 0, 'number') + '</div>' +
        switchRow('pf-featured', 'Sản phẩm nổi bật', '', !!p.isFeatured) +
        switchRow('pf-active', 'Đang bán', '', p.isActive !== false);
      openModal(p.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm', body, function (btn) {
        var name = v('pf-name'); if (!name) { toast('Nhập tên', 'error'); return; }
        btnLoad(btn, true);
        var payload = { name: name, category_id: v('pf-cat') ? parseInt(v('pf-cat'), 10) : null, image_url: v('pf-img'), description: v('pf-desc'), notes: v('pf-notes'), sort_order: vn('pf-sort'), is_featured: vc('pf-featured'), is_active: vc('pf-active') };
        var req = p.id ? api('/products/admin/' + p.id, { method: 'PATCH', body: payload }) : api('/products/admin', { method: 'POST', body: payload });
        req.then(function () { toast('Đã lưu', 'success'); closeModal(); loadProducts(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
      });
    });
  }

  // Packages drawer (quản lý gói của 1 sản phẩm) + kho
  function packagesDrawer(p) {
    if (!p) return;
    var dr = openDrawer('Gói: ' + p.name, '<div style="display:grid;place-items:center;min-height:160px"><div class="ap-spinner"></div></div>');
    var body = dr.querySelector('.ap-drawer-body');
    var reload = function () {
      api('/products/admin/' + p.id + '/packages').then(function (d) {
        var pkgs = d.items || [];
        var list = pkgs.map(function (pk) {
          return '<div class="ap-card" style="margin-bottom:10px"><div class="ap-card-body" style="padding:12px 14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
            '<div><div style="font-weight:600">' + esc(pk.name) + (pk.isActive ? '' : ' <span class="ap-badge gray">Ẩn</span>') + '</div><div style="font-size:12px;color:var(--ap-text-3)">' + fmtMoney(pk.price) + ' · ' + (pk.deliveryType === 'auto' ? 'Tự động' : 'Thủ công') + (pk.deliveryType === 'auto' ? ' · kho: ' + (pk.stockQuantity || 0) : '') + '</div></div>' +
            '<div style="display:flex;gap:6px">' + (pk.deliveryType === 'auto' ? '<button class="ap-btn sm" data-stock="' + pk.id + '" data-name="' + esc(pk.name) + '">Kho</button>' : '') + '<button class="ap-btn sm" data-pe="' + pk.id + '">Sửa</button><button class="ap-btn sm danger" data-pd="' + pk.id + '">Xóa</button></div>' +
            '</div></div></div>';
        }).join('') || '<div class="ap-empty" style="padding:24px">Chưa có gói nào</div>';
        body.innerHTML = '<button class="ap-btn primary" id="ap-pkg-add" style="margin-bottom:14px;width:100%">+ Thêm gói</button>' + list;
        body.querySelector('#ap-pkg-add').addEventListener('click', function () { packageForm(p.id, null, reload); });
        var byId = function (id) { return pkgs.find(function (x) { return x.id == id; }); };
        body.querySelectorAll('[data-pe]').forEach(function (b) { b.addEventListener('click', function () { packageForm(p.id, byId(b.getAttribute('data-pe')), reload); }); });
        body.querySelectorAll('[data-pd]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Xóa gói này?')) return; api('/products/admin/packages/' + b.getAttribute('data-pd'), { method: 'DELETE' }).then(function () { toast('Đã xóa gói', 'success'); reload(); loadProducts(); }).catch(function (e) { toast(e.message, 'error'); }); }); });
        body.querySelectorAll('[data-stock]').forEach(function (b) { b.addEventListener('click', function () { stockModal(parseInt(b.getAttribute('data-stock'), 10), b.getAttribute('data-name'), reload); }); });
      }).catch(function (e) { body.innerHTML = '<div class="ap-empty">' + esc(e.message) + '</div>'; });
    };
    reload();
  }
  function packageForm(productId, pk, onDone) {
    pk = pk || {};
    var body = inp('pkf-name', 'Tên gói', pk.name, 'text', 'VD: 1 tháng') +
      '<div class="ap-form-row">' + inp('pkf-price', 'Giá (đ)', pk.price || 0, 'number') + inp('pkf-orig', 'Giá gốc (đ)', pk.originalPrice || '', 'number') + '</div>' +
      sel('pkf-delivery', 'Kiểu giao', pk.deliveryType || 'manual', [{ v: 'manual', t: 'Thủ công' }, { v: 'auto', t: 'Tự động (từ kho)' }]) +
      '<div class="ap-form-row">' + inp('pkf-sort', 'Thứ tự', pk.sortOrder || 0, 'number') + '</div>' +
      switchRow('pkf-active', 'Đang bán', '', pk.isActive !== false);
    openModal(pk.id ? 'Sửa gói' : 'Thêm gói', body, function (btn) {
      var name = v('pkf-name'); if (!name) { toast('Nhập tên gói', 'error'); return; }
      btnLoad(btn, true);
      var payload = { name: name, price: vn('pkf-price'), original_price: v('pkf-orig') ? vn('pkf-orig') : null, delivery_type: v('pkf-delivery'), sort_order: vn('pkf-sort'), is_active: vc('pkf-active') };
      var req = pk.id ? api('/products/admin/packages/' + pk.id, { method: 'PATCH', body: payload }) : api('/products/admin/' + productId + '/packages', { method: 'POST', body: payload });
      req.then(function () { toast('Đã lưu gói', 'success'); closeModal(); if (onDone) onDone(); loadProducts(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
    });
  }

  // ── SCREEN: Users ────────────────────────────────────
  var userState = { page: 1, search: '' };
  function screenUsers(view) {
    view.innerHTML =
      pageHead('Người dùng', 'Quản lý tài khoản khách hàng') +
      '<div class="ap-toolbar"><div class="ap-search">' + ICON('search') + '<input id="ap-us-search" placeholder="Tìm email / tên..." value="' + esc(userState.search) + '"></div><button class="ap-btn" id="ap-us-refresh">' + ICON('refresh') + '</button><div style="flex:1"></div><button class="ap-btn" id="ap-us-csv">⬇ CSV</button></div>' +
      '<div class="ap-card" id="ap-us-card"><div style="display:grid;place-items:center;min-height:240px"><div class="ap-spinner"></div></div></div>';
    $('#ap-us-search').addEventListener('input', debounce(function (e) { userState.search = e.target.value.trim(); userState.page = 1; loadUsers(); }, 350));
    $('#ap-us-refresh').addEventListener('click', loadUsers);
    $('#ap-us-csv').addEventListener('click', function () {
      var self = this;
      exportAllCSV('nguoi-dung.csv', [
        { label: 'Email', get: function (u) { return u.email; } },
        { label: 'Tên', get: function (u) { return u.displayName; } },
        { label: 'Số dư', get: function (u) { return u.balance; } },
        { label: 'Trạng thái', get: function (u) { return u.isActive ? 'Hoạt động' : 'Khóa'; } },
        { label: 'Tham gia', get: function (u) { return fmtDate(u.createdAt); } },
      ], function (page, limit) { var u = '/admin/users?page=' + page + '&limit=' + limit; if (userState.search) u += '&search=' + encodeURIComponent(userState.search); return u; }, self);
    });
    loadUsers();
  }
  var usersItems = [];
  function loadUsers() {
    var card = $('#ap-us-card'); if (!card) return;
    var limit = 20;
    var q = '/admin/users?page=' + userState.page + '&limit=' + limit;
    if (userState.search) q += '&search=' + encodeURIComponent(userState.search);
    api(q).then(function (d) {
      var items = d.items || [];
      usersItems = items;
      var rows = items.map(function (u) {
        var ini = (u.displayName || u.email || '?').charAt(0).toUpperCase();
        return '<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="ap-avatar" style="width:30px;height:30px;font-size:13px">' + esc(ini) + '</div><div><div style="font-weight:600">' + esc(u.displayName || '—') + '</div><div style="font-size:12px;color:var(--ap-text-3)">' + esc(u.email) + '</div></div></div></td>' +
          '<td><b>' + fmtMoney(u.balance) + '</b></td>' +
          '<td>' + (u.isActive ? '<span class="ap-badge green">Hoạt động</span>' : '<span class="ap-badge red">Khóa</span>') + '</td>' +
          '<td style="color:var(--ap-text-3)">' + fmtDate(u.createdAt) + '</td></tr>';
      }).join('') || emptyRow(4, 'Không có người dùng');
      card.innerHTML =
        '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Người dùng</th><th>Số dư</th><th>Trạng thái</th><th>Tham gia</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pagination(d.total, userState.page, limit, function (pg) { userState.page = pg; loadUsers(); });
    }).catch(function (err) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(err.message) + '</div></div>'; });
  }

  // ── SCREEN: Soon / 404 ───────────────────────────────
  function screenSoon(view, label) {
    view.innerHTML = pageHead(label || 'Tính năng', '') +
      '<div class="ap-card"><div class="ap-card-body"><div class="ap-empty">' + ICON('settings') +
      '<div style="font-size:16px;font-weight:600;color:var(--ap-text-2);margin-bottom:6px">Đang hoàn thiện</div>' +
      '<div>Màn hình "' + esc(label) + '" đang được port sang giao diện quản trị mới.<br>Tạm thời bạn có thể dùng các mục đã sẵn sàng ở thanh bên.</div></div></div></div>';
  }
  function screenNotFound(view) {
    view.innerHTML = '<div class="ap-empty" style="min-height:60vh">' + ICON('alert') + '<div style="font-size:18px;font-weight:600">Không tìm thấy trang</div><div><a href="/admin" data-path="/admin" style="color:var(--ap-primary)">Về Dashboard</a></div></div>';
    var a = view.querySelector('[data-path]'); if (a) a.addEventListener('click', function (e) { e.preventDefault(); go('/admin'); });
  }

  // ── SCREEN: Blog ─────────────────────────────────────
  var blogCatCache = null;
  function ensureBlogCats() { return blogCatCache ? Promise.resolve(blogCatCache) : api('/blog/categories').then(function (c) { blogCatCache = c || []; return blogCatCache; }); }
  function screenBlog(view) {
    view.innerHTML = pageHead('Blog', 'Quản lý bài viết & chuyên mục', '<button class="ap-btn" id="ap-bl-cats">Chuyên mục</button> <button class="ap-btn primary" id="ap-bl-add">+ Viết bài</button>') +
      '<div class="ap-card" id="ap-bl-card"><div style="display:grid;place-items:center;min-height:200px"><div class="ap-spinner"></div></div></div>';
    $('#ap-bl-add').addEventListener('click', function () { blogPostForm(null); });
    $('#ap-bl-cats').addEventListener('click', blogCatsDrawer);
    loadBlogPosts();
  }
  function loadBlogPosts() {
    var card = $('#ap-bl-card'); if (!card) return;
    api('/admin/blog/posts/all').then(function (d) {
      var rows = (d.items || []).map(function (p) {
        return '<tr><td><b>' + esc(p.title) + '</b><div style="font-size:12px;color:var(--ap-text-3)">' + esc(p.slug) + '</div></td>' +
          '<td>' + esc((p.category && p.category.name) || '—') + '</td>' +
          '<td>' + (p.isPublished ? '<span class="ap-badge green">Đã đăng</span>' : '<span class="ap-badge amber">Nháp</span>') + '</td>' +
          '<td>' + fmtNum(p.viewCount || 0) + '</td>' +
          '<td style="color:var(--ap-text-3)">' + fmtDate(p.createdAt) + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="ap-btn sm" data-edit="' + p.id + '">Sửa</button> <button class="ap-btn sm danger" data-del="' + p.id + '">Xóa</button></td></tr>';
      }).join('') || emptyRow(6, 'Chưa có bài viết');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Tiêu đề</th><th>Chuyên mục</th><th>Trạng thái</th><th>Lượt xem</th><th>Tạo</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { blogPostForm(b.getAttribute('data-edit')); }); });
      card.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Xóa bài viết này?')) return; api('/admin/blog/posts/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); loadBlogPosts(); }).catch(function (e) { toast(e.message, 'error'); }); }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function blogPostForm(id) {
    Promise.all([ensureBlogCats(), id ? api('/admin/blog/posts/id/' + id) : Promise.resolve({})]).then(function (r) {
      var cats = r[0] || [], p = r[1] || {};
      var catOpts = [{ v: '', t: '— Không chuyên mục —' }].concat(cats.map(function (c) { return { v: c.id, t: c.name }; }));
      var body = inp('blf-title', 'Tiêu đề', p.title) +
        sel('blf-cat', 'Chuyên mục', p.categoryId || '', catOpts) +
        inp('blf-thumb', 'Ảnh thumbnail URL', p.thumbnailUrl, 'text', 'https://...') +
        ta('blf-excerpt', 'Tóm tắt', p.excerpt, '') +
        '<div class="ap-field"><label>Nội dung (HTML/Markdown)</label><textarea class="ap-input" id="blf-content" rows="8" style="font-family:ui-monospace,monospace;font-size:12.5px">' + esc(p.content || '') + '</textarea></div>' +
        switchRow('blf-pub', 'Đăng bài (publish)', 'Tắt = lưu nháp', !!p.isPublished);
      openModal(id ? 'Sửa bài viết' : 'Viết bài mới', body, function (btn) {
        var title = v('blf-title'); if (!title) { toast('Nhập tiêu đề', 'error'); return; }
        btnLoad(btn, true);
        var payload = { title: title, content: v('blf-content'), excerpt: v('blf-excerpt'), category_id: v('blf-cat') ? parseInt(v('blf-cat'), 10) : null, thumbnail_url: v('blf-thumb'), is_published: vc('blf-pub') };
        var req = id ? api('/admin/blog/posts/' + id, { method: 'PATCH', body: payload }) : api('/admin/blog/posts', { method: 'POST', body: payload });
        req.then(function () { toast('Đã lưu', 'success'); closeModal(); loadBlogPosts(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
      });
    }).catch(function (e) { toast(e.message, 'error'); });
  }
  function blogCatsDrawer() {
    var dr = openDrawer('Chuyên mục blog', '<div style="display:grid;place-items:center;min-height:140px"><div class="ap-spinner"></div></div>');
    var body = dr.querySelector('.ap-drawer-body');
    var reload = function () {
      api('/blog/categories').then(function (cats) {
        blogCatCache = cats;
        var list = (cats || []).map(function (c) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--ap-border)"><div><b>' + esc(c.name) + '</b><div style="font-size:12px;color:var(--ap-text-3)">' + esc(c.slug) + '</div></div><button class="ap-btn sm danger" data-del="' + c.id + '">Xóa</button></div>'; }).join('') || '<div class="ap-empty" style="padding:20px">Chưa có chuyên mục</div>';
        body.innerHTML = '<div class="ap-field"><label>Tên chuyên mục mới</label><input class="ap-input" id="bc-name" placeholder="VD: Hướng dẫn"></div><button class="ap-btn primary" id="bc-add" style="margin-bottom:16px;width:100%">+ Thêm</button>' + list;
        body.querySelector('#bc-add').addEventListener('click', function () {
          var name = v('bc-name'); if (!name) { toast('Nhập tên', 'error'); return; }
          api('/blog/admin/categories', { method: 'POST', body: { name: name } }).then(function () { toast('Đã thêm', 'success'); reload(); }).catch(function (e) { toast(e.message, 'error'); });
        });
        body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Xóa chuyên mục?')) return; api('/blog/admin/categories/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); reload(); }).catch(function (e) { toast(e.message, 'error'); }); }); });
      }).catch(function (e) { body.innerHTML = '<div class="ap-empty">' + esc(e.message) + '</div>'; });
    };
    reload();
  }

  // ── SCREEN: Tickets ──────────────────────────────────
  var ticketState = { status: '' };
  var TICKET_STATUS = { open: { c: 'blue', t: 'Mở' }, answered: { c: 'indigo', t: 'Đã trả lời' }, pending: { c: 'amber', t: 'Chờ' }, resolved: { c: 'green', t: 'Đã xử lý' }, closed: { c: 'gray', t: 'Đóng' } };
  function ticketBadge(s) { var m = TICKET_STATUS[s] || { c: 'gray', t: s }; return '<span class="ap-badge ' + m.c + '">' + esc(m.t) + '</span>'; }
  function screenTickets(view) {
    view.innerHTML = pageHead('Hỗ trợ', 'Xử lý ticket của khách hàng') +
      '<div class="ap-toolbar"><select class="ap-select" id="ap-tk-status" style="width:200px">' +
        ['', 'open', 'answered', 'pending', 'resolved', 'closed'].map(function (s) { return '<option value="' + s + '"' + (ticketState.status === s ? ' selected' : '') + '>' + (s ? TICKET_STATUS[s].t : 'Tất cả trạng thái') + '</option>'; }).join('') +
      '</select><button class="ap-btn" id="ap-tk-refresh">' + ICON('refresh') + '</button></div>' +
      '<div class="ap-card" id="ap-tk-card"><div style="display:grid;place-items:center;min-height:220px"><div class="ap-spinner"></div></div></div>';
    $('#ap-tk-status').addEventListener('change', function (e) { ticketState.status = e.target.value; loadTickets(); });
    $('#ap-tk-refresh').addEventListener('click', loadTickets);
    loadTickets();
  }
  function loadTickets() {
    var card = $('#ap-tk-card'); if (!card) return;
    var q = '/admin/tickets?limit=50' + (ticketState.status ? '&status=' + ticketState.status : '');
    api(q).then(function (d) {
      var items = d.items || [];
      var rows = items.map(function (t) {
        return '<tr class="clickable" data-id="' + t.id + '"><td class="ap-mono">' + esc(t.ticketNumber || ('#' + t.id)) + '</td><td><b>' + esc(t.subject) + '</b></td><td>' + esc(t.userEmail || '—') + '</td><td>' + esc(t.priority || 'normal') + '</td><td>' + ticketBadge(t.status) + '</td><td style="color:var(--ap-text-3)">' + fmtDateTime(t.createdAt) + '</td></tr>';
      }).join('') || emptyRow(6, 'Không có ticket');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Mã</th><th>Tiêu đề</th><th>Khách</th><th>Ưu tiên</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.addEventListener('click', function () { ticketDrawer(items.find(function (x) { return x.id == tr.getAttribute('data-id'); })); }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function ticketDrawer(t) {
    if (!t) return;
    var msgs = (t.messages || []).map(function (m) {
      var mine = m.senderType === 'admin';
      return '<div style="margin-bottom:10px;display:flex;' + (mine ? 'justify-content:flex-end' : '') + '"><div style="max-width:80%;background:' + (mine ? 'var(--ap-primary-soft)' : 'var(--ap-surface-2)') + ';padding:9px 12px;border-radius:10px"><div style="font-size:11px;color:var(--ap-text-3);margin-bottom:2px">' + esc(m.senderName || (mine ? 'Hỗ trợ' : 'Khách')) + ' · ' + fmtDateTime(m.createdAt) + '</div><div style="font-size:13px;white-space:pre-wrap">' + esc(m.message) + '</div></div></div>';
    }).join('') || '<div class="ap-empty" style="padding:16px">Chưa có tin nhắn</div>';
    var statusOpts = ['open', 'answered', 'pending', 'resolved', 'closed'].map(function (s) { return '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + TICKET_STATUS[s].t + '</option>'; }).join('');
    var body =
      '<dl class="ap-dl"><dt>Mã</dt><dd class="ap-mono">' + esc(t.ticketNumber || ('#' + t.id)) + '</dd>' +
      '<dt>Khách</dt><dd>' + esc(t.userName || '') + ' (' + esc(t.userEmail || '') + ')</dd>' +
      '<dt>Tiêu đề</dt><dd>' + esc(t.subject) + '</dd>' +
      '<dt>Trạng thái</dt><dd>' + ticketBadge(t.status) + '</dd></dl>' +
      (t.description ? '<div style="background:var(--ap-surface-2);padding:12px;border-radius:8px;font-size:13px;margin:12px 0;white-space:pre-wrap">' + esc(t.description) + '</div>' : '') +
      '<h4 style="margin:16px 0 8px;font-size:13px">Hội thoại</h4><div style="max-height:280px;overflow-y:auto">' + msgs + '</div>' +
      '<div class="ap-field" style="margin-top:14px"><label>Trả lời</label><textarea class="ap-input" id="tk-reply" rows="3" placeholder="Nhập câu trả lời..."></textarea></div>' +
      '<div style="display:flex;gap:8px"><button class="ap-btn primary" id="tk-send">Gửi trả lời</button><select class="ap-select" id="tk-status" style="width:auto">' + statusOpts + '</select><button class="ap-btn" id="tk-setstatus">Đổi</button></div>';
    openDrawer('Ticket ' + (t.ticketNumber || ('#' + t.id)), body);
    $('#tk-send').addEventListener('click', function () {
      var msg = v('tk-reply'); if (!msg) { toast('Nhập nội dung', 'error'); return; }
      var btn = this; btnLoad(btn, true);
      api('/admin/tickets/' + t.id + '/reply', { method: 'POST', body: { message: msg } }).then(function () { toast('Đã gửi', 'success'); closeDrawer(); loadTickets(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
    });
    $('#tk-setstatus').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      api('/admin/tickets/' + t.id, { method: 'PATCH', body: { status: $('#tk-status').value } }).then(function () { toast('Đã đổi trạng thái', 'success'); closeDrawer(); loadTickets(); }).catch(function (e) { toast(e.message, 'error'); btn.disabled = false; });
    });
  }

  // ── SCREEN: Payments (SePay) ─────────────────────────
  function screenPayments(view) {
    loading(view);
    Promise.all([api('/payment/config').catch(function () { return {}; }), api('/admin/payment/history').catch(function () { return { items: [], stats: {} }; })])
      .then(function (res) {
        var cfg = res[0] || {}, hist = res[1] || {}, st = hist.stats || {};
        var histRows = (hist.items || []).map(function (o) {
          return '<tr><td class="ap-mono">' + esc(o.order_code) + '</td><td>' + esc(o.user_email || '—') + '</td><td><b>' + fmtMoney(o.amount) + '</b></td><td>' + statusBadge(o.status) + '</td><td style="color:var(--ap-text-3)">' + fmtDateTime(o.created_at) + '</td></tr>';
        }).join('') || emptyRow(5, 'Chưa có giao dịch');
        view.innerHTML = pageHead('Thanh toán', 'Cấu hình cổng SePay & lịch sử giao dịch') +
          '<div class="ap-grid cols-4" style="margin-bottom:16px">' +
            statCard('Doanh thu SePay', fmtMoney(st.total_revenue), 'revenue', '#16a34a') +
            statCard('Đã thanh toán', fmtNum(st.paid), 'payments', '#0ea5e9') +
            statCard('Hoàn tất', fmtNum(st.completed), 'orders', '#4f46e5') +
            statCard('Chờ TT', fmtNum(st.pending), 'cart', '#d97706') +
          '</div>' +
          '<div class="ap-grid cols-2" style="align-items:start">' +
            '<div class="ap-card"><div class="ap-card-head"><h3>Cấu hình SePay</h3>' + (cfg.has_env_override ? '<span class="ap-badge amber">ENV override</span>' : '') + '</div><div class="ap-card-body">' +
              inp('pay-acc', 'Số tài khoản', cfg.sepay_account_number) +
              inp('pay-bank', 'Mã ngân hàng (BIN/code)', cfg.sepay_bank_code, 'text', 'VD: MB, VCB, 970422...') +
              inp('pay-key', 'API Key', cfg.sepay_api_key, 'text', 'Để trống nếu không đổi') +
              inp('pay-secret', 'Webhook Secret', cfg.sepay_webhook_secret, 'text', 'Để trống nếu không đổi') +
              inp('pay-base', 'App Base URL', cfg.app_base_url, 'text', 'https://yourdomain.com') +
              '<div style="display:flex;gap:10px;margin-top:6px"><button class="ap-btn primary" id="pay-save">Lưu cấu hình</button><button class="ap-btn" id="pay-test">Kiểm tra kết nối</button></div>' +
            '</div></div>' +
            '<div class="ap-card"><div class="ap-card-head"><h3>Giao dịch gần đây</h3></div><div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Mã đơn</th><th>Khách</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>' + histRows + '</tbody></table></div></div>' +
          '</div>';
        var masked = '••••••••';
        $('#pay-save').addEventListener('click', function () {
          var btn = this; btnLoad(btn, true);
          var payload = { sepay_account_number: v('pay-acc'), sepay_bank_code: v('pay-bank'), app_base_url: v('pay-base') };
          if (v('pay-key') && v('pay-key') !== masked) payload.sepay_api_key = v('pay-key');
          if (v('pay-secret') && v('pay-secret') !== masked) payload.sepay_webhook_secret = v('pay-secret');
          api('/payment/config', { method: 'POST', body: payload }).then(function () { toast('Đã lưu cấu hình', 'success'); btnLoad(btn, false); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
        });
        $('#pay-test').addEventListener('click', function () {
          var btn = this; btn.disabled = true; btn.textContent = 'Đang kiểm tra...';
          api('/payment/test', { method: 'POST', body: { sepay_api_key: v('pay-key'), sepay_account_number: v('pay-acc') } })
            .then(function (r) { toast(r.message || 'Kết nối OK', 'success'); }).catch(function (e) { toast(e.message, 'error'); })
            .then(function () { btn.disabled = false; btn.textContent = 'Kiểm tra kết nối'; });
        });
      }).catch(function (e) {
        view.innerHTML = pageHead('Thanh toán', '') + '<div class="ap-card"><div class="ap-card-body"><div class="ap-empty">' + ICON('alert') + '<div>' + (e.status === 403 ? 'Chỉ admin mới truy cập cấu hình thanh toán.' : esc(e.message)) + '</div></div></div></div>';
      });
  }

  // ── SCREEN: Announcements ────────────────────────────
  function screenAnnouncements(view) {
    view.innerHTML = pageHead('Thông báo', 'Banner thông báo trên trang chủ', '<button class="ap-btn primary" id="ap-an-add">+ Thêm thông báo</button>') +
      '<div class="ap-card" id="ap-an-card"><div style="display:grid;place-items:center;min-height:200px"><div class="ap-spinner"></div></div></div>';
    $('#ap-an-add').addEventListener('click', function () { announcementForm(null); });
    loadAnnouncements();
  }
  function loadAnnouncements() {
    var card = $('#ap-an-card'); if (!card) return;
    api('/announcements/admin/all').then(function (items) {
      var rows = (items || []).map(function (a) {
        var typeColors = { info: 'blue', success: 'green', warning: 'amber', danger: 'red', error: 'red' };
        return '<tr><td><b>' + esc(a.title) + '</b><div style="font-size:12px;color:var(--ap-text-3);max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.content || '') + '</div></td>' +
          '<td><span class="ap-badge ' + (typeColors[a.type] || 'gray') + '">' + esc(a.type || 'info') + '</span></td>' +
          '<td>' + (a.sortOrder || 0) + '</td>' +
          '<td>' + (a.isActive ? '<span class="ap-badge green">Hiện</span>' : '<span class="ap-badge gray">Ẩn</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="ap-btn sm" data-edit="' + a.id + '">Sửa</button> <button class="ap-btn sm danger" data-del="' + a.id + '">Xóa</button></td></tr>';
      }).join('') || emptyRow(5, 'Chưa có thông báo');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Tiêu đề</th><th>Loại</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { announcementForm((items || []).find(function (x) { return x.id == b.getAttribute('data-edit'); })); }); });
      card.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Xóa thông báo này?')) return; api('/admin/announcements/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); loadAnnouncements(); }).catch(function (e) { toast(e.message, 'error'); }); }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function announcementForm(a) {
    a = a || {};
    var body = inp('anf-title', 'Tiêu đề', a.title) +
      ta('anf-content', 'Nội dung', a.content) +
      '<div class="ap-form-row">' + sel('anf-type', 'Loại', a.type || 'info', [{ v: 'info', t: 'Thông tin' }, { v: 'success', t: 'Thành công' }, { v: 'warning', t: 'Cảnh báo' }, { v: 'danger', t: 'Quan trọng' }]) + inp('anf-sort', 'Thứ tự', a.sortOrder || 0, 'number') + '</div>' +
      switchRow('anf-active', 'Hiển thị', '', a.isActive !== false);
    openModal(a.id ? 'Sửa thông báo' : 'Thêm thông báo', body, function (btn) {
      var title = v('anf-title'); if (!title) { toast('Nhập tiêu đề', 'error'); return; }
      btnLoad(btn, true);
      var req;
      if (a.id) req = api('/admin/announcements/' + a.id, { method: 'PATCH', body: { title: title, content: v('anf-content'), type: v('anf-type'), isActive: vc('anf-active'), sortOrder: vn('anf-sort') } });
      else req = api('/admin/announcements', { method: 'POST', body: { title: title, content: v('anf-content'), type: v('anf-type'), is_active: vc('anf-active'), sort_order: vn('anf-sort') } });
      req.then(function () { toast('Đã lưu', 'success'); closeModal(); loadAnnouncements(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
    });
  }

  // ── SCREEN: Affiliate ────────────────────────────────
  function screenAffiliate(view) {
    view.innerHTML = pageHead('Affiliate', 'Chương trình giới thiệu & hoa hồng') +
      '<div class="ap-card" id="ap-af-card"><div style="display:grid;place-items:center;min-height:200px"><div class="ap-spinner"></div></div></div>';
    loadAffiliates();
  }
  function loadAffiliates() {
    var card = $('#ap-af-card'); if (!card) return;
    api('/affiliate/admin/list').then(function (affs) {
      var rows = (affs || []).map(function (a) {
        return '<tr class="clickable" data-aid="' + a.id + '"><td class="ap-mono">' + esc(a.ref_code) + '</td><td>' + esc(a.email || '—') + '</td><td>' + (a.commission_rate || 0) + '%</td><td><b>' + fmtMoney(a.total_earnings) + '</b></td><td>' + fmtMoney(a.total_paid) + '</td><td>' + (a.is_active ? '<span class="ap-badge green">Bật</span>' : '<span class="ap-badge gray">Tắt</span>') + '</td></tr>';
      }).join('') || emptyRow(6, 'Chưa có cộng tác viên');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Mã ref</th><th>Email</th><th>Hoa hồng</th><th>Đã kiếm</th><th>Đã trả</th><th>Trạng thái</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('tr[data-aid]').forEach(function (tr) { tr.addEventListener('click', function () { affiliateDrawer((affs || []).find(function (x) { return x.id == tr.getAttribute('data-aid'); })); }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + (e.status === 403 ? 'Chỉ admin truy cập được.' : esc(e.message)) + '</div></div>'; });
  }
  function affiliateDrawer(a) {
    if (!a) return;
    var dr = openDrawer('CTV: ' + (a.email || a.ref_code), '<div style="display:grid;place-items:center;min-height:140px"><div class="ap-spinner"></div></div>');
    var body = dr.querySelector('.ap-drawer-body');
    api('/affiliate/admin/' + a.id + '/referrals').then(function (refs) {
      var refRows = (refs || []).map(function (r) {
        var act = r.status === 'pending' ? '<button class="ap-btn sm primary" data-approve="' + r.id + '">Duyệt</button>' : statusBadge(r.status);
        return '<tr><td>#' + r.order_id + '</td><td>' + fmtMoney(r.order_amount) + '</td><td><b>' + fmtMoney(r.commission) + '</b></td><td>' + act + '</td></tr>';
      }).join('') || emptyRow(4, 'Chưa có lượt giới thiệu');
      body.innerHTML =
        '<div class="ap-field"><label>Tỷ lệ hoa hồng (%)</label><input class="ap-input" id="af-rate" type="number" value="' + (a.commission_rate || 0) + '"></div>' +
        switchRow('af-active', 'Kích hoạt CTV', '', a.is_active !== false) +
        '<button class="ap-btn primary" id="af-save" style="margin:8px 0 18px">Lưu</button>' +
        '<h4 style="margin:0 0 8px;font-size:13px">Lượt giới thiệu</h4>' +
        '<div class="ap-card"><div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Đơn</th><th>Giá trị</th><th>Hoa hồng</th><th></th></tr></thead><tbody>' + refRows + '</tbody></table></div></div>';
      body.querySelector('#af-save').addEventListener('click', function () {
        var btn = this; btnLoad(btn, true);
        api('/affiliate/admin/' + a.id, { method: 'PUT', body: { commission_rate: vn('af-rate'), is_active: vc('af-active') } })
          .then(function () { toast('Đã lưu', 'success'); btnLoad(btn, false); loadAffiliates(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
      });
      body.querySelectorAll('[data-approve]').forEach(function (b) { b.addEventListener('click', function () {
        b.disabled = true;
        api('/affiliate/admin/referral/' + b.getAttribute('data-approve') + '/approve', { method: 'PUT' }).then(function () { toast('Đã duyệt', 'success'); affiliateDrawer(a); loadAffiliates(); }).catch(function (e) { toast(e.message, 'error'); b.disabled = false; });
      }); });
    }).catch(function (e) { body.innerHTML = '<div class="ap-empty">' + esc(e.message) + '</div>'; });
  }

  // ── Modal + form helpers ─────────────────────────────
  function closeModal() { var m = $('#ap-modal-bd'); if (m) { m.classList.remove('open'); setTimeout(function () { m.remove(); }, 200); } }
  function openModal(title, bodyHtml, onSubmit, okLabel) {
    var ex = $('#ap-modal-bd'); if (ex) ex.remove();
    var bd = document.createElement('div'); bd.className = 'ap-modal-backdrop'; bd.id = 'ap-modal-bd';
    bd.innerHTML = '<div class="ap-modal"><div class="ap-modal-head"><h3>' + esc(title) + '</h3><button class="ap-icon-btn" id="ap-modal-x">' + ICON('close') + '</button></div>' +
      '<div class="ap-modal-body">' + bodyHtml + '</div>' +
      '<div class="ap-modal-foot"><button class="ap-btn" id="ap-modal-cancel">Hủy</button><button class="ap-btn primary" id="ap-modal-ok">' + esc(okLabel || 'Lưu') + '</button></div></div>';
    document.body.appendChild(bd);
    requestAnimationFrame(function () { bd.classList.add('open'); });
    bd.addEventListener('click', function (e) { if (e.target === bd) closeModal(); });
    $('#ap-modal-x').addEventListener('click', closeModal);
    $('#ap-modal-cancel').addEventListener('click', closeModal);
    $('#ap-modal-ok').addEventListener('click', function () { if (onSubmit) onSubmit($('#ap-modal-ok')); });
  }
  function inp(id, label, val, type, ph) { return '<div class="ap-field"><label>' + esc(label) + '</label><input class="ap-input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '"></div>'; }
  function ta(id, label, val, ph) { return '<div class="ap-field"><label>' + esc(label) + '</label><textarea class="ap-input" id="' + id + '" rows="3" placeholder="' + esc(ph || '') + '">' + esc(val || '') + '</textarea></div>'; }
  function sel(id, label, val, options) { return '<div class="ap-field"><label>' + esc(label) + '</label><select class="ap-select" id="' + id + '">' + options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(val) === String(o.v) ? ' selected' : '') + '>' + esc(o.t) + '</option>'; }).join('') + '</select></div>'; }
  function switchRow(id, label, desc, checked) { return '<div class="ap-switch-row"><div><div class="lbl">' + esc(label) + '</div>' + (desc ? '<div class="desc">' + esc(desc) + '</div>' : '') + '</div><label class="ap-switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="track"></span></label></div>'; }
  function v(id) { var e = $('#' + id); return e ? e.value.trim() : ''; }
  function vn(id) { var e = $('#' + id); return e ? (parseFloat(e.value) || 0) : 0; }
  function vc(id) { var e = $('#' + id); return e ? e.checked : false; }
  function toLocalInput(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function btnLoad(btn, on) { if (!btn) return; btn.disabled = on; btn.dataset.txt = btn.dataset.txt || btn.textContent; btn.textContent = on ? 'Đang lưu...' : btn.dataset.txt; }

  // ── SCREEN: Categories ───────────────────────────────
  function screenCategories(view) {
    view.innerHTML = pageHead('Danh mục', 'Tổ chức nhóm sản phẩm', '<button class="ap-btn primary" id="ap-cat-add">+ Thêm danh mục</button>') +
      '<div class="ap-card" id="ap-cat-card"><div style="display:grid;place-items:center;min-height:220px"><div class="ap-spinner"></div></div></div>';
    $('#ap-cat-add').addEventListener('click', function () { categoryForm(null); });
    loadCategories();
  }
  function loadCategories() {
    var card = $('#ap-cat-card'); if (!card) return;
    api('/categories').then(function (cats) {
      var rows = (cats || []).map(function (c) {
        var icon = c.iconUrl ? '<img src="' + esc(c.iconUrl) + '" style="width:26px;height:26px;border-radius:6px;object-fit:cover" onerror="this.style.display=\'none\'">' : ICON('categories');
        return '<tr><td><div style="display:flex;align-items:center;gap:10px"><span style="width:26px;height:26px;display:grid;place-items:center;color:var(--ap-text-3)">' + icon + '</span><b>' + esc(c.name) + '</b></div></td>' +
          '<td class="ap-mono">' + esc(c.slug) + '</td><td>' + esc(c.productType || '—') + '</td><td>' + (c.sortOrder || 0) + '</td>' +
          '<td>' + (c.isActive ? '<span class="ap-badge green">Hiện</span>' : '<span class="ap-badge gray">Ẩn</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="ap-btn sm" data-edit="' + c.id + '">Sửa</button> <button class="ap-btn sm danger" data-del="' + c.id + '">Xóa</button></td></tr>';
      }).join('') || emptyRow(6, 'Chưa có danh mục');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Tên</th><th>Slug</th><th>Loại</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { categoryForm((cats || []).find(function (x) { return x.id == b.getAttribute('data-edit'); })); }); });
      card.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
        if (!confirm('Xóa danh mục này?')) return;
        api('/categories/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); loadCategories(); }).catch(function (e) { toast(e.message, 'error'); });
      }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function categoryForm(c) {
    c = c || {};
    var body = inp('cf-name', 'Tên danh mục', c.name, 'text', 'VD: Tài khoản Premium') +
      inp('cf-type', 'Loại (tùy chọn)', c.productType, 'text', 'account / key / ...') +
      inp('cf-icon', 'Icon URL', c.iconUrl, 'text', 'https://...') +
      inp('cf-image', 'Ảnh URL', c.imageUrl, 'text', 'https://...') +
      '<div class="ap-form-row">' + inp('cf-sort', 'Thứ tự', c.sortOrder || 0, 'number') + '</div>' +
      switchRow('cf-active', 'Hiển thị', '', c.isActive !== false);
    openModal(c.id ? 'Sửa danh mục' : 'Thêm danh mục', body, function (btn) {
      var name = v('cf-name'); if (!name) { toast('Nhập tên', 'error'); return; }
      btnLoad(btn, true);
      var payload = { name: name, product_type: v('cf-type'), icon_url: v('cf-icon'), image_url: v('cf-image'), sort_order: vn('cf-sort'), is_active: vc('cf-active') };
      var req = c.id ? api('/categories/' + c.id, { method: 'PATCH', body: payload }) : api('/categories', { method: 'POST', body: payload });
      req.then(function () { toast('Đã lưu', 'success'); closeModal(); loadCategories(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
    });
  }

  // ── SCREEN: Coupons ──────────────────────────────────
  function screenCoupons(view) {
    view.innerHTML = pageHead('Mã giảm giá', 'Quản lý coupon / gift code', '<button class="ap-btn primary" id="ap-cp-add">+ Tạo mã</button>') +
      '<div class="ap-card" id="ap-cp-card"><div style="display:grid;place-items:center;min-height:220px"><div class="ap-spinner"></div></div></div>';
    $('#ap-cp-add').addEventListener('click', function () { couponForm(); });
    loadCoupons();
  }
  function loadCoupons() {
    var card = $('#ap-cp-card'); if (!card) return;
    api('/admin/gift-codes').then(function (codes) {
      var rows = (codes || []).map(function (c) {
        var val = c.discountType === 'percent' ? (c.discountValue + '%') : fmtMoney(c.discountValue);
        return '<tr><td class="ap-mono"><b>' + esc(c.code) + '</b></td><td>' + esc(val) + '</td>' +
          '<td>' + (c.usageCount || 0) + (c.usageLimit ? ' / ' + c.usageLimit : '') + '</td>' +
          '<td>' + (c.minOrder ? fmtMoney(c.minOrder) : '—') + '</td>' +
          '<td>' + (c.expiresAt ? fmtDate(c.expiresAt) : 'Không hạn') + '</td>' +
          '<td>' + (c.isActive ? '<span class="ap-badge green">Bật</span>' : '<span class="ap-badge gray">Tắt</span>') + '</td>' +
          '<td style="text-align:right"><button class="ap-btn sm danger" data-del="' + c.id + '">Xóa</button></td></tr>';
      }).join('') || emptyRow(7, 'Chưa có mã giảm giá');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Mã</th><th>Giảm</th><th>Đã dùng</th><th>Đơn tối thiểu</th><th>Hết hạn</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
        if (!confirm('Xóa mã này?')) return;
        api('/admin/gift-codes/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); loadCoupons(); }).catch(function (e) { toast(e.message, 'error'); });
      }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function couponForm() {
    var body = inp('cpf-code', 'Mã code', '', 'text', 'VD: SALE50') +
      '<div class="ap-form-row">' + sel('cpf-type', 'Loại giảm', 'percent', [{ v: 'percent', t: 'Phần trăm (%)' }, { v: 'fixed', t: 'Số tiền (đ)' }]) + inp('cpf-value', 'Giá trị', 10, 'number') + '</div>' +
      '<div class="ap-form-row">' + inp('cpf-min', 'Đơn tối thiểu (đ)', 0, 'number') + inp('cpf-max', 'Giảm tối đa (đ)', 0, 'number') + '</div>' +
      '<div class="ap-form-row">' + inp('cpf-usage', 'Giới hạn lượt (0=∞)', 0, 'number') + inp('cpf-peruser', 'Mỗi người', 1, 'number') + '</div>' +
      inp('cpf-expires', 'Hết hạn (tùy chọn)', '', 'datetime-local') +
      ta('cpf-desc', 'Mô tả', '', '') +
      switchRow('cpf-active', 'Kích hoạt', '', true) +
      switchRow('cpf-public', 'Hiển thị công khai', 'Cho khách thấy ở trang ưu đãi', false);
    openModal('Tạo mã giảm giá', body, function (btn) {
      var code = v('cpf-code'); if (!code) { toast('Nhập mã', 'error'); return; }
      btnLoad(btn, true);
      var payload = { code: code, discount_type: v('cpf-type'), discount_value: vn('cpf-value'), min_order: vn('cpf-min'), max_discount: vn('cpf-max') || null, usage_limit: vn('cpf-usage'), per_user_limit: vn('cpf-peruser'), expires_at: v('cpf-expires') || null, is_active: vc('cpf-active'), is_public: vc('cpf-public'), description: v('cpf-desc') };
      api('/admin/gift-codes', { method: 'POST', body: payload }).then(function () { toast('Đã tạo mã', 'success'); closeModal(); loadCoupons(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
    }, 'Tạo mã');
  }

  // ── SCREEN: Flash Sales ──────────────────────────────
  function screenFlashSales(view) {
    view.innerHTML = pageHead('Flash Sale', 'Khuyến mãi giảm giá có thời hạn', '<button class="ap-btn primary" id="ap-fs-add">+ Tạo flash sale</button>') +
      '<div class="ap-card" id="ap-fs-card"><div style="display:grid;place-items:center;min-height:220px"><div class="ap-spinner"></div></div></div>';
    $('#ap-fs-add').addEventListener('click', function () { flashForm(); });
    loadFlash();
  }
  function loadFlash() {
    var card = $('#ap-fs-card'); if (!card) return;
    api('/admin/flash-sales').then(function (items) {
      var now = Date.now();
      var rows = (items || []).map(function (f) {
        var pkg = f.package || {}; var prod = pkg.product || {};
        var active = new Date(f.startsAt) <= now && new Date(f.endsAt) >= now;
        return '<tr><td><b>' + esc(prod.name || '—') + '</b><div style="font-size:12px;color:var(--ap-text-3)">' + esc(pkg.name || '') + '</div></td>' +
          '<td><b>' + fmtMoney(f.salePrice) + '</b>' + (pkg.price ? ' <span style="text-decoration:line-through;color:var(--ap-text-3);font-size:12px">' + fmtMoney(pkg.price) + '</span>' : '') + '</td>' +
          '<td style="font-size:12px">' + fmtDateTime(f.startsAt) + '<br>→ ' + fmtDateTime(f.endsAt) + '</td>' +
          '<td>' + (active ? '<span class="ap-badge green">Đang chạy</span>' : '<span class="ap-badge gray">Ngoài hạn</span>') + '</td>' +
          '<td style="text-align:right"><button class="ap-btn sm danger" data-del="' + f.id + '">Xóa</button></td></tr>';
      }).join('') || emptyRow(5, 'Chưa có flash sale');
      card.innerHTML = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Sản phẩm / Gói</th><th>Giá sale</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      card.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
        if (!confirm('Xóa flash sale này?')) return;
        api('/admin/flash-sales/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); loadFlash(); }).catch(function (e) { toast(e.message, 'error'); });
      }); });
    }).catch(function (e) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function flashForm() {
    api('/products?active=all&limit=200').then(function (d) {
      var opts = [];
      (d.items || []).forEach(function (p) { (p.packages || []).forEach(function (pk) { opts.push({ v: pk.id, t: p.name + ' — ' + pk.name + ' (' + fmtMoney(pk.price) + ')' }); }); });
      if (!opts.length) { toast('Chưa có gói sản phẩm nào', 'error'); return; }
      var body = sel('fsf-pkg', 'Gói sản phẩm', opts[0].v, opts) +
        inp('fsf-price', 'Giá sale (đ)', 0, 'number') +
        inp('fsf-qty', 'Giới hạn số lượng (0=∞)', 0, 'number') +
        '<div class="ap-form-row">' + inp('fsf-start', 'Bắt đầu', '', 'datetime-local') + inp('fsf-end', 'Kết thúc', '', 'datetime-local') + '</div>';
      openModal('Tạo Flash Sale', body, function (btn) {
        if (!v('fsf-start') || !v('fsf-end')) { toast('Chọn thời gian', 'error'); return; }
        btnLoad(btn, true);
        var payload = { package_id: parseInt(v('fsf-pkg'), 10), sale_price: vn('fsf-price'), quantity_limit: vn('fsf-qty'), starts_at: v('fsf-start'), ends_at: v('fsf-end') };
        api('/admin/flash-sales', { method: 'POST', body: payload }).then(function () { toast('Đã tạo flash sale', 'success'); closeModal(); loadFlash(); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
      }, 'Tạo');
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  // ── SCREEN: Stock ────────────────────────────────────
  function statMini(label, val, color) { return '<div class="ap-card" style="flex:1;min-width:90px"><div style="padding:12px 14px"><div style="font-size:11px;color:var(--ap-text-3)">' + esc(label) + '</div><div style="font-size:20px;font-weight:700' + (color === 'green' ? ';color:var(--ap-success)' : '') + '">' + fmtNum(val) + '</div></div></div>'; }
  function renderStockManager(container, pkgId, label) {
    if (!container) return;
    container.innerHTML = '<div style="display:grid;place-items:center;min-height:140px"><div class="ap-spinner"></div></div>';
    api('/stock/package/' + pkgId).then(function (d) {
      var items = d.items || [];
      var rows = items.map(function (it) {
        return '<tr><td class="ap-mono" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(it.data) + '</td><td>' + (it.is_sold ? '<span class="ap-badge gray">Đã bán</span>' : '<span class="ap-badge green">Còn</span>') + '</td><td style="color:var(--ap-text-3)">' + fmtDate(it.created_at) + '</td><td style="text-align:right">' + (it.is_sold ? '' : '<button class="ap-btn sm danger" data-del="' + it.id + '">Xóa</button>') + '</td></tr>';
      }).join('') || emptyRow(4, 'Kho trống');
      container.innerHTML =
        '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' + statMini('Tổng', d.total) + statMini('Còn', d.available, 'green') + statMini('Đã bán', d.sold) + '</div>' +
        '<div class="ap-field"><label>Nhập kho — mỗi dòng 1 mục</label><textarea class="ap-input" id="ap-stk-bulk" rows="4" placeholder="user1:pass1&#10;key-XXXX-YYYY&#10;..."></textarea></div>' +
        '<button class="ap-btn primary" id="ap-stk-bulk-btn" style="margin-bottom:16px">+ Thêm vào kho</button>' +
        '<div class="ap-card"><div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Dữ liệu</th><th>Trạng thái</th><th>Tạo</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
      container.querySelector('#ap-stk-bulk-btn').addEventListener('click', function () {
        var ta2 = container.querySelector('#ap-stk-bulk'); var data = ta2.value.trim();
        if (!data) { toast('Nhập dữ liệu kho', 'error'); return; }
        var btn = this; btnLoad(btn, true);
        api('/stock/bulk', { method: 'POST', body: { package_id: pkgId, data: data } })
          .then(function (r) { toast('Đã thêm ' + (r.added || 0) + ' mục', 'success'); renderStockManager(container, pkgId, label); })
          .catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
      });
      container.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
        api('/stock/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function () { toast('Đã xóa', 'success'); renderStockManager(container, pkgId, label); }).catch(function (e) { toast(e.message, 'error'); });
      }); });
    }).catch(function (e) { container.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }
  function stockModal(pkgId, label, onDone) {
    openModal('Kho: ' + label, '<div id="ap-stock-mgr"></div>', function () { closeModal(); if (onDone) onDone(); }, 'Đóng');
    renderStockManager($('#ap-stock-mgr'), pkgId, label);
  }
  function screenStock(view) {
    view.innerHTML = pageHead('Kho hàng', 'Quản lý kho cho gói giao tự động') +
      '<div class="ap-card" style="margin-bottom:16px"><div class="ap-card-body"><div class="ap-field" style="margin:0"><label>Chọn gói sản phẩm</label><select class="ap-select" id="ap-stk-pkg"><option>Đang tải...</option></select></div></div></div>' +
      '<div id="ap-stk-panel"></div>';
    api('/products?active=all&limit=200').then(function (d) {
      var opts = [];
      (d.items || []).forEach(function (p) { (p.packages || []).forEach(function (pk) { opts.push({ id: pk.id, label: p.name + ' — ' + pk.name }); }); });
      var selEl = $('#ap-stk-pkg');
      if (!opts.length) { selEl.innerHTML = '<option>Chưa có gói nào</option>'; $('#ap-stk-panel').innerHTML = '<div class="ap-empty">' + ICON('box') + '<div>Tạo sản phẩm & gói trước khi nhập kho.</div></div>'; return; }
      selEl.innerHTML = opts.map(function (o) { return '<option value="' + o.id + '">' + esc(o.label) + '</option>'; }).join('');
      var panel = $('#ap-stk-panel');
      var renderSel = function () { renderStockManager(panel, parseInt(selEl.value, 10), selEl.options[selEl.selectedIndex].text); };
      selEl.addEventListener('change', renderSel);
      renderSel();
    }).catch(function (e) { $('#ap-stk-panel').innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(e.message) + '</div></div>'; });
  }

  // ── SCREEN: Settings ─────────────────────────────────
  function screenSettings(view) {
    loading(view);
    api('/admin/settings/unified').then(function (u) {
      var g = u.settings_general || {}, fe = u.settings_features || {};
      var featureDefs = [
        ['blog', 'Blog'], ['offers', 'Ưu đãi / Gift Code'], ['affiliate', 'Affiliate'], ['support', 'Hỗ trợ / Ticket'],
        ['flash_sales', 'Flash Sale'], ['reviews', 'Đánh giá'], ['announcements', 'Thông báo'], ['balance', 'Số dư / Nạp tiền'], ['wishlist', 'Yêu thích'],
      ];
      var featuresHtml = featureDefs.map(function (f) { return switchRow('set-fe-' + f[0], f[1], '', fe[f[0]] !== false); }).join('');
      view.innerHTML = pageHead('Cài đặt', 'Cấu hình hệ thống', '<button class="ap-btn primary" id="ap-set-save">Lưu thay đổi</button>') +
        '<div class="ap-grid cols-2" style="align-items:start">' +
          '<div class="ap-card"><div class="ap-card-head"><h3>Thông tin chung</h3></div><div class="ap-card-body">' +
            inp('set-title', 'Tên website', g.title || g.site_name) +
            ta('set-desc', 'Mô tả', g.site_description || g.description) +
            inp('set-copy', 'Dòng bản quyền', g.copyright_text) +
          '</div></div>' +
          '<div>' +
            '<div class="ap-card" style="margin-bottom:16px"><div class="ap-card-head"><h3>Bật / tắt tính năng</h3></div><div class="ap-card-body" style="padding-top:4px">' + featuresHtml + '</div></div>' +
            '<div class="ap-card"><div class="ap-card-head"><h3>🛠 Chế độ bảo trì</h3></div><div class="ap-card-body" style="padding-top:4px">' +
              switchRow('set-maint', 'Bật bảo trì website', 'Chỉ nhân viên & admin đăng nhập được', fe.maintenance === true) +
              ta('set-maint-msg', 'Thông báo cho khách', fe.maintenance_message, 'VD: Website đang bảo trì, quay lại sau ít phút.') +
            '</div></div>' +
          '</div>' +
        '</div>';
      $('#ap-set-save').addEventListener('click', function () {
        var btn = this; btnLoad(btn, true);
        var newFeatures = Object.assign({}, fe);
        featureDefs.forEach(function (f) { newFeatures[f[0]] = vc('set-fe-' + f[0]); });
        newFeatures.maintenance = vc('set-maint');
        newFeatures.maintenance_message = v('set-maint-msg');
        var payload = {
          settings_general: Object.assign({}, g, { title: v('set-title'), site_description: v('set-desc'), copyright_text: v('set-copy') }),
          settings_features: newFeatures,
        };
        api('/admin/settings/unified', { method: 'PUT', body: payload }).then(function () { toast('Đã lưu cài đặt', 'success'); btnLoad(btn, false); }).catch(function (e) { toast(e.message, 'error'); btnLoad(btn, false); });
      });
    }).catch(function (e) {
      view.innerHTML = pageHead('Cài đặt', '') + '<div class="ap-card"><div class="ap-card-body"><div class="ap-empty">' + ICON('alert') + '<div>' + (e.status === 403 ? 'Chỉ admin (không phải nhân viên) mới truy cập cài đặt.' : esc(e.message)) + '</div></div></div></div>';
    });
  }

})();
