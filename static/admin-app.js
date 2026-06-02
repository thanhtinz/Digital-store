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
      { p: '/admin/categories', icon: 'categories', label: 'Danh mục' },
      { p: '/admin/stock', icon: 'stock', label: 'Kho hàng' },
      { p: '/admin/coupons', icon: 'coupons', label: 'Mã giảm giá' },
      { p: '/admin/flash-sales', icon: 'flash', label: 'Flash Sale' },
    ] },
    { group: 'Người dùng', items: [
      { p: '/admin/users', icon: 'users', label: 'Người dùng', ready: true },
      { p: '/admin/affiliates', icon: 'affiliate', label: 'Affiliate' },
    ] },
    { group: 'Nội dung', items: [
      { p: '/admin/blog', icon: 'blog', label: 'Blog' },
      { p: '/admin/announcements', icon: 'announce', label: 'Thông báo' },
      { p: '/admin/tickets', icon: 'tickets', label: 'Hỗ trợ' },
    ] },
    { group: 'Hệ thống', items: [
      { p: '/admin/payments', icon: 'payments', label: 'Thanh toán' },
      { p: '/admin/settings', icon: 'settings', label: 'Cài đặt' },
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
      '</div>' +
      '<div class="ap-card" id="ap-ord-card"><div style="display:grid;place-items:center;min-height:240px"><div class="ap-spinner"></div></div></div>';

    $('#ap-ord-search').addEventListener('input', debounce(function (e) { ordersState.search = e.target.value.trim(); ordersState.page = 1; loadOrders(); }, 350));
    $('#ap-ord-status').addEventListener('change', function (e) { ordersState.status = e.target.value; ordersState.page = 1; loadOrders(); });
    $('#ap-ord-refresh').addEventListener('click', loadOrders);
    loadOrders();
  }
  function loadOrders() {
    var card = $('#ap-ord-card'); if (!card) return;
    var limit = 20;
    var q = '/orders/admin/all?page=' + ordersState.page + '&limit=' + limit;
    if (ordersState.status) q += '&status=' + encodeURIComponent(ordersState.status);
    if (ordersState.search) q += '&search=' + encodeURIComponent(ordersState.search);
    api(q).then(function (d) {
      var items = d.items || [];
      var rows = items.map(function (o) {
        return '<tr class="clickable" data-code="' + esc(o.orderCode) + '"><td class="ap-mono">' + esc(o.orderCode) + '</td><td>' + esc(o.userEmail || '—') + '</td><td>' + esc(o.productName || (o.items && o.items[0] ? o.items[0].productName : '') || '—') + '</td><td><b>' + fmtMoney(o.totalAmount) + '</b></td><td>' + statusBadge(o.status) + '</td><td style="color:var(--ap-text-3)">' + fmtDateTime(o.createdAt) + '</td></tr>';
      }).join('') || emptyRow(6, 'Không có đơn hàng');
      card.innerHTML =
        '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Mã đơn</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pagination(d.total, ordersState.page, limit, function (p) { ordersState.page = p; loadOrders(); });
      card.querySelectorAll('tr[data-code]').forEach(function (tr) {
        tr.addEventListener('click', function () {
          var o = items.find(function (x) { return x.orderCode === tr.getAttribute('data-code'); });
          if (o) orderDrawer(o);
        });
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
  function screenProducts(view) {
    view.innerHTML =
      pageHead('Sản phẩm', 'Quản lý sản phẩm và gói bán') +
      '<div class="ap-toolbar"><div class="ap-search">' + ICON('search') + '<input id="ap-pr-search" placeholder="Tìm sản phẩm..." value="' + esc(prodState.search) + '"></div><button class="ap-btn" id="ap-pr-refresh">' + ICON('refresh') + '</button></div>' +
      '<div class="ap-card" id="ap-pr-card"><div style="display:grid;place-items:center;min-height:240px"><div class="ap-spinner"></div></div></div>';
    $('#ap-pr-search').addEventListener('input', debounce(function (e) { prodState.search = e.target.value.trim(); prodState.page = 1; loadProducts(); }, 350));
    $('#ap-pr-refresh').addEventListener('click', loadProducts);
    loadProducts();
  }
  function loadProducts() {
    var card = $('#ap-pr-card'); if (!card) return;
    var limit = 20;
    var q = '/products?active=all&page=' + prodState.page + '&limit=' + limit + '&sort=newest';
    if (prodState.search) q += '&search=' + encodeURIComponent(prodState.search);
    api(q).then(function (d) {
      var items = d.items || (Array.isArray(d) ? d : []);
      var rows = items.map(function (p) {
        var pkgs = p.packages || [];
        var price = pkgs.length ? Math.min.apply(null, pkgs.map(function (x) { return Number(x.price) || 0; })) : 0;
        var img = p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" style="width:34px;height:34px;border-radius:8px;object-fit:cover" onerror="this.style.display=\'none\'">' : '';
        return '<tr><td><div style="display:flex;align-items:center;gap:10px">' + img + '<div><div style="font-weight:600">' + esc(p.name) + '</div><div style="font-size:12px;color:var(--ap-text-3)">' + esc((p.category && p.category.name) || '—') + '</div></div></div></td>' +
          '<td>' + (pkgs.length ? 'từ ' + fmtMoney(price) : '—') + '</td>' +
          '<td>' + pkgs.length + ' gói</td>' +
          '<td>' + (p.isFeatured ? '<span class="ap-badge indigo">Nổi bật</span>' : '') + '</td>' +
          '<td>' + (p.isActive ? '<span class="ap-badge green">Đang bán</span>' : '<span class="ap-badge gray">Ẩn</span>') + '</td>' +
          '<td><button class="ap-btn sm" data-toggle="' + p.id + '" data-active="' + (p.isActive ? '1' : '0') + '">' + (p.isActive ? 'Ẩn' : 'Hiện') + '</button></td></tr>';
      }).join('') || emptyRow(6, 'Không có sản phẩm');
      card.innerHTML =
        '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Gói</th><th></th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pagination(d.total || items.length, prodState.page, limit, function (pg) { prodState.page = pg; loadProducts(); });
      card.querySelectorAll('[data-toggle]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-toggle'), active = b.getAttribute('data-active') === '1';
          b.disabled = true;
          api('/products/admin/' + id, { method: 'PATCH', body: { is_active: !active } })
            .then(function () { toast('Đã cập nhật', 'success'); loadProducts(); })
            .catch(function (err) { toast(err.message, 'error'); b.disabled = false; });
        });
      });
    }).catch(function (err) { card.innerHTML = '<div class="ap-empty">' + ICON('alert') + '<div>' + esc(err.message) + '</div></div>'; });
  }

  // ── SCREEN: Users ────────────────────────────────────
  var userState = { page: 1, search: '' };
  function screenUsers(view) {
    view.innerHTML =
      pageHead('Người dùng', 'Quản lý tài khoản khách hàng') +
      '<div class="ap-toolbar"><div class="ap-search">' + ICON('search') + '<input id="ap-us-search" placeholder="Tìm email / tên..." value="' + esc(userState.search) + '"></div><button class="ap-btn" id="ap-us-refresh">' + ICON('refresh') + '</button></div>' +
      '<div class="ap-card" id="ap-us-card"><div style="display:grid;place-items:center;min-height:240px"><div class="ap-spinner"></div></div></div>';
    $('#ap-us-search').addEventListener('input', debounce(function (e) { userState.search = e.target.value.trim(); userState.page = 1; loadUsers(); }, 350));
    $('#ap-us-refresh').addEventListener('click', loadUsers);
    loadUsers();
  }
  function loadUsers() {
    var card = $('#ap-us-card'); if (!card) return;
    var limit = 20;
    var q = '/admin/users?page=' + userState.page + '&limit=' + limit;
    if (userState.search) q += '&search=' + encodeURIComponent(userState.search);
    api(q).then(function (d) {
      var items = d.items || [];
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

})();
