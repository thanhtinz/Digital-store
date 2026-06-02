// ── Router ─────────────────────────────────────────────────────
function normalizeAppPath(path = '') {
  if (!path || path === '#') return '/';
  if (path.startsWith('#/')) return path.slice(1) || '/';
  if (path.startsWith('/#/')) return path.slice(2) || '/';
  if (!path.startsWith('/')) return `/${path}`;
  return path;
}

function getCurrentPath() {
  return normalizeAppPath(`${location.pathname || '/'}${location.search || ''}`);
}

function navigateTo(path, { replace = false } = {}) {
  const target = normalizeAppPath(path);
  const current = `${location.pathname || '/'}${location.search || ''}`;
  if (target === current) {
    navigate();
    return;
  }
  history[replace ? 'replaceState' : 'pushState']({}, '', target);
  navigate();
}

if (typeof window !== 'undefined') window.navigateTo = navigateTo;

const routes = {
  '/': renderHome,
  '/all': renderAllProducts,
  '/category/:slug': (view, { slug }) => { navigateTo(`/all?cat=${encodeURIComponent(slug)}`, { replace: true }); },
  '/product/:slug': renderProduct,
  '/cart': renderCart,
  '/offers': renderOffers,
  '/wishlist': renderWishlist,
  '/checkout': renderCheckout,
  '/checkout/payment/:code': renderSepayCheckout,
  '/orders': renderOrders,
  '/orders/:code': renderOrderDetail,
  '/search': (view, params) => {
    const q = new URLSearchParams(location.search || '').get('q') || '';
    navigateTo(`/all?q=${encodeURIComponent(q)}`, { replace: true });
  },
  '/login': renderLogin,
  '/register': renderRegister,
  '/reset-password': renderResetPassword,
  '/auth-callback': renderAuthCallback,
  '/admin': renderAdmin,
  '/admin/categories': renderAdminCategories,
  '/admin/products': renderAdminProducts,
  '/admin/orders': renderAdminOrders,
  '/admin/stock': renderAdminStock,
  '/admin/settings': renderAdminSettings,
  '/admin/images': renderAdminImages,
  '/admin/oauth-settings': renderAdminOAuthSettings,
  '/admin/banners': renderAdminBanners,
  '/admin/flash-sales': renderAdminFlashSales,
  '/admin/gift-codes': renderAdminGiftCodes,
  '/admin/affiliates': renderAdminAffiliates,
  '/admin/blog': renderAdminBlog,
  '/admin/support-pages': renderAdminSupportPages,
  '/admin/announcements': renderAdminAnnouncements,
  '/admin/tickets': renderAdminTickets,
  '/admin/notifications': renderAdminNotifications,
  '/admin/payments': renderAdminPayments,
  '/admin/balance': renderAdminBalance,
  '/admin/api-providers': renderAdminApiProviders,
  '/admin/smm': renderAdminSmmPlatforms,
  '/admin/smm/platforms': renderAdminSmmPlatforms,
  '/admin/smm/categories': renderAdminSmmCategories,
  '/admin/smm/services': renderAdminSmmServices,
  '/admin/smm/orders': renderAdminSmmOrders,
  '/admin/smm/providers': renderAdminSmmProviders,
  '/blog': renderBlogList,
  '/blog/:slug': renderBlogPost,
  '/profile': renderProfile,
  '/affiliate': renderUserAffiliates,
  '/support': renderSupportHome,
  '/support/tickets': renderUserTickets,
  '/support/tickets/:ticketId': (view, { ticketId }) => renderTicketDetail(ticketId),
  '/support/:slug': (view, { slug }) => renderSupportPage(slug),
  '/smm/services': renderSmmServices,
  '/smm/service/:id': (view, params) => renderSmmServiceDetail(view, params),
  '/smm/order': renderSmmOrder,
  '/smm/history': renderSmmHistory,
  '/smm/history/:id': (view, params) => renderSmmOrderDetail(view, params),
  '/smm/warranty': renderSmmWarranty,
};

function parseRoute(pathWithQuery = getCurrentPath()) {
  const path = normalizeAppPath(pathWithQuery).split('?')[0] || '/';
  for (const pattern of Object.keys(routes)) {
    const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
    const match = path.match(regex);
    if (match) {
      const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
      const params = {};
      keys.forEach((k, i) => { params[k] = match[i + 1]; });
      return { handler: routes[pattern], params };
    }
  }
  return null;
}

let currentNavMode = null;
const STAFF_ALLOWED_ADMIN_ROUTES = new Set(['/admin', '/admin/orders', '/admin/blog', '/admin/tickets', '/admin/announcements']);

const adminHeaderMeta = {
  '/admin': { title: 'Dashboard', subtitle: 'Tổng quan vận hành cửa hàng' },
  '/admin/orders': { title: 'Đơn hàng', subtitle: 'Theo dõi và xử lý đơn mua hàng' },
  '/admin/payments': { title: 'Thanh toán', subtitle: 'Kiểm tra giao dịch và cấu hình thanh toán' },
  '/admin/balance': { title: 'Quản lý user', subtitle: 'Quản lý tài khoản, vai trò và số dư người dùng' },
  '/admin/categories': { title: 'Danh mục', subtitle: 'Tổ chức nhóm sản phẩm và điều hướng' },
  '/admin/products': { title: 'Sản phẩm', subtitle: 'Quản lý sản phẩm, gói bán và nội dung hiển thị' },
  '/admin/stock': { title: 'Kho hàng', subtitle: 'Theo dõi tồn kho và dữ liệu giao tự động' },
  '/admin/banners': { title: 'Banners', subtitle: 'Điều phối banner và điểm nhấn marketing' },
  '/admin/flash-sales': { title: 'Flash Sales', subtitle: 'Thiết lập chiến dịch giảm giá nhanh' },
  '/admin/gift-codes': { title: 'Mã quà tặng', subtitle: 'Quản lý gift code và phân phối ưu đãi' },
  '/admin/affiliates': { title: 'Affiliates', subtitle: 'Theo dõi cộng tác viên và hoa hồng' },
  '/admin/blog': { title: 'Blog', subtitle: 'Biên tập bài viết và danh mục nội dung' },
  '/admin/tickets': { title: 'Hỗ trợ', subtitle: 'Xử lý ticket và phản hồi khách hàng' },
  '/admin/support-pages': { title: 'Trang thông tin', subtitle: 'Quản lý FAQ, chính sách và nội dung hỗ trợ' },
  '/admin/announcements': { title: 'Thông báo', subtitle: 'Đăng và quản lý thông báo hệ thống' },
  '/admin/oauth-settings': { title: 'Đăng nhập MXH', subtitle: 'Cấu hình OAuth và nhà cung cấp đăng nhập' },
  '/admin/settings': { title: 'Cài đặt chung', subtitle: 'Thiết lập hệ thống, giao diện và tính năng' },
  '/admin/images': { title: 'Thư viện ảnh', subtitle: 'Quản lý ảnh đã upload và nơi đang sử dụng' },
      '/admin/notifications': { title: 'Kết nối & Thông báo', subtitle: 'Cấu hình Telegram bot và email hệ thống' },
  '/admin/smm': { title: 'SMM — Nền tảng', subtitle: 'Quản lý nền tảng mạng xã hội' },
  '/admin/smm/platforms': { title: 'SMM — Nền tảng', subtitle: 'Quản lý nền tảng mạng xã hội' },
  '/admin/smm/categories': { title: 'SMM — Danh mục', subtitle: 'Quản lý danh mục dịch vụ SMM' },
  '/admin/smm/services': { title: 'SMM — Dịch vụ', subtitle: 'Quản lý dịch vụ SMM' },
  '/admin/smm/orders': { title: 'SMM — Đơn hàng', subtitle: 'Quản lý đơn hàng SMM' },
  '/admin/smm/providers': { title: 'SMM — Đấu API', subtitle: 'Quản lý nhà cung cấp API SMM' },
  '/admin/api-providers': { title: 'Đấu nối API', subtitle: 'Cấu hình nhà cung cấp API bên ngoài (mình là client)' },
};

function updateHeaderMode(pathWithQuery = getCurrentPath(), isAdmin) {
  const pathOnly = normalizeAppPath(pathWithQuery).split('?')[0] || '/';
  const header = qs('#header');
  const store = qs('#header-store');
  const storeActions = qs('#header-store-actions');
  const admin = qs('#header-admin');
  const adminActions = qs('#header-admin-actions');
  const bcCurrent = qs('#admin-header-bc-current');
  const hamburger = qs('#hamburger');
  if (!header) return;

  header.classList.toggle('admin-mode', isAdmin);
  document.body.classList.toggle('admin-mode', isAdmin);
  qs('.main-content')?.classList.toggle('admin-main', isAdmin);
  if (store) store.style.display = isAdmin ? 'none' : '';
  if (storeActions) storeActions.style.display = isAdmin ? 'none' : 'flex';
  if (admin) admin.style.display = isAdmin ? 'flex' : 'none';
  if (adminActions) adminActions.style.display = isAdmin ? 'flex' : 'none';
  if (hamburger) hamburger.style.display = window.innerWidth <= 1024 ? 'flex' : 'none';

  if (isAdmin) {
    const meta = adminHeaderMeta[pathOnly] || adminHeaderMeta['/admin'];
    if (bcCurrent) bcCurrent.textContent = meta.title;
  }
}

function setActiveSidebarItem(pathWithQuery = getCurrentPath()) {
  const path = normalizeAppPath(pathWithQuery).split('?')[0] || '/';
  qsa('#sidebar-nav .nav-item').forEach((n) => {
    const href = normalizeAppPath(n.getAttribute('href') || '/').split('?')[0] || '/';
    const isActive = href === path || (href !== '/' && path.startsWith(`${href}/`));
    n.classList.toggle('active', !!isActive);
  });
}

function renderMaintenancePage(message) {
  const msg = (message && String(message).trim()) || 'Website đang được bảo trì. Vui lòng quay lại sau ít phút.';
  const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <div class="empty-state" style="min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;gap:18px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary,#00AB55)"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      <h2 style="margin:0;font-size:24px;">Đang bảo trì</h2>
      <p style="max-width:520px;color:var(--text-muted,#637381);font-size:16px;line-height:1.6;">${safe}</p>
      <a href="/login" class="btn btn-primary" style="margin-top:8px;">Đăng nhập nhân viên</a>
    </div>`;
}

async function navigate() {
  const pathWithQuery = getCurrentPath();
  
  // Chờ thông tin user nếu chưa fetch (tránh mất hash state)
  if (!currentUser && typeof authToken !== 'undefined' && authToken && typeof fetchMe === 'function') {
     await fetchMe();
     updateAuthUI();
  }

  const route = parseRoute(pathWithQuery);
  let view = qs('#app-view');
  if (!view) return;

  const path = pathWithQuery.split('?')[0] || '/';
  const isAdmin = path.startsWith('/admin');
  const isPayosCheckout = path.startsWith('/checkout/payment/');

  // ── Chế độ bảo trì: chỉ staff/admin xem được; còn lại chỉ vào được trang đăng nhập ──
  const maint = (window.appSettings && window.appSettings.maintenance) || {};
  const isStaffUser = currentUser && ['admin', 'superadmin', 'staff'].includes(currentUser.role);
  const maintAllowedPaths = ['/login', '/register', '/auth-callback'];
  if (maint.on && !isStaffUser && !maintAllowedPaths.includes(path)) {
    view.innerHTML = renderMaintenancePage(maint.message);
    return;
  }
  updateHeaderMode(pathWithQuery, isAdmin);

  const sidebar = qs('#sidebar');
  const header = qs('#header');
  const appShell = qs('#app-shell');
  if (sidebar) sidebar.style.display = isPayosCheckout ? 'none' : '';
  if (header) header.style.display = isPayosCheckout ? 'none' : '';
  if (appShell) appShell.style.marginLeft = isPayosCheckout ? '0' : '';

  const footer = qs('#site-footer');
  if (footer) footer.style.display = (isAdmin || isPayosCheckout) ? 'none' : 'block';

  view.style.minHeight = isPayosCheckout ? '100vh' : '60vh';

  if (!route) {
    // Full-page 404 — hide header, sidebar, footer
    const header = qs('.header'); if (header) header.style.display = 'none';
    const sidebar = qs('.sidebar'); if (sidebar) sidebar.style.display = 'none';
    const footer = qs('#site-footer'); if (footer) footer.style.display = 'none';
    const appShell = qs('.app-shell'); if (appShell) appShell.style.marginLeft = '0';
    view.style.minHeight = '100vh';
    view.innerHTML = `
      <div class="page-404">
        <div class="page-404-inner">
          <div class="page-404-visual">
            <span class="page-404-num">404</span>
            <img src="/static/404-rem.gif" alt="404" class="page-404-gif" />
          </div>
          <h1 class="page-404-title">Oops! Lạc đường rồi~</h1>
          <p class="page-404-desc">Rem đã tìm khắp nơi nhưng không thấy trang này đâu...<br>Có thể trang đã bị xóa hoặc bạn nhập sai đường dẫn.</p>
          <a href="/" class="page-404-btn"><i class="fa-solid fa-house"></i> Về trang chủ</a>
        </div>
      </div>`;
    // anime.js entrance animations
    if (typeof anime !== 'undefined' && anime.animate) {
      anime.animate('.page-404-num', { opacity: [0, 1], scale: [0.5, 1], duration: 800, ease: 'outExpo' });
      anime.animate('.page-404-gif', { opacity: [0, 1], translateY: [40, 0], duration: 900, ease: 'outElastic(1, 0.6)', delay: 200,
        onComplete: () => { anime.animate('.page-404-gif', { translateY: [-8, 8], duration: 2000, ease: 'inOutSine', loop: true, alternate: true }); }
      });
      anime.animate('.page-404-title', { opacity: [0, 1], translateY: [30, 0], duration: 700, ease: 'outExpo', delay: 400 });
      anime.animate('.page-404-desc', { opacity: [0, 1], translateY: [20, 0], duration: 700, ease: 'outExpo', delay: 550 });
      anime.animate('.page-404-btn', { opacity: [0, 1], translateY: [20, 0], scale: [0.9, 1], duration: 600, ease: 'outExpo', delay: 700 });
    }
    return;
  }

  if (isAdmin && (!currentUser || !currentUser.is_admin)) {
    view.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-3)">Bạn không có quyền truy cập Admin Panel.<br><a href="/" style="color:var(--primary)">Quay về trang chủ</a></div>';
    return;
  }

  const adminPath = path || '/admin';
  if (isAdmin && currentUser?.role === 'staff' && !STAFF_ALLOWED_ADMIN_ROUTES.has(adminPath)) {
    view.innerHTML = '<div class="empty-state" style="padding:60px 20px;"><div class="empty-state-icon"><i class="fa-solid fa-lock"></i></div><h3>Không có quyền truy cập</h3><p class="text-muted">Tài khoản nhân viên không được phép vào khu vực này.</p></div>';
    return;
  }

  const newNavMode = isAdmin ? 'admin' : 'store';
  if (currentNavMode !== newNavMode) {
    currentNavMode = newNavMode;
    await loadSidebar();
  }

  setActiveSidebarItem(pathWithQuery);
  closeSidebar();

  const featureRouteMap = {
    '/blog': 'blog', '/blog/': 'blog',
    '/offers': 'offers',
    '/affiliate': 'affiliate',
    '/support': 'support', '/support/': 'support',
    '/wishlist': 'wishlist',
  };
  const featureLabels = {
    blog: 'Blog', offers: 'Ưu đãi / Gift Code', affiliate: 'Affiliate / Giới thiệu',
    support: 'Hỗ trợ', wishlist: 'Yêu thích', balance: 'Số dư / Nạp tiền',
    flash_sales: 'Flash Sale', reviews: 'Đánh giá sản phẩm', announcements: 'Thông báo',
  };
  const matchedFeature = Object.entries(featureRouteMap).find(([r]) => path === r || path.startsWith(r + '/'))?.[1];
  // Features that default to OFF (must be explicitly enabled)
  const optInFeatures = new Set();
  const featureDisabled = matchedFeature && (
    optInFeatures.has(matchedFeature)
      ? appSettings.features?.[matchedFeature] !== true
      : appSettings.features?.[matchedFeature] === false
  );
  if (featureDisabled) {
    const label = featureLabels[matchedFeature] || matchedFeature;
    view.innerHTML = `<div class="empty-state" style="padding:60px 20px;text-align:center;">
      <div class="empty-state-icon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25;color:var(--text-muted)"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
      <h3 style="margin-top:16px;">Tính năng "${esc(label)}" hiện đang tắt</h3>
      <p class="text-muted" style="max-width:360px;margin:8px auto 0;">Tính năng này tạm thời không khả dụng. Vui lòng quay lại sau hoặc liên hệ quản trị viên nếu cần hỗ trợ.</p>
      <a href="/" class="btn btn-primary mt-16">Về trang chủ</a>
    </div>`;
    return;
  }

  try {
    await Promise.resolve(route.handler(view, route.params));
    animateEntrance(view);
    // Inject AI assist buttons on admin pages
    if (path.startsWith('/admin') && typeof initAiButtons === 'function') initAiButtons(view);
  } catch (e) {
    console.error('Router execution error:', e);
    view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>Lỗi tải trang</h3><p class="text-muted">${e.message}</p></div>`;
  }
}

// ── Sidebar ─────────────────────────────────────────────────────
async function loadSidebar() {
  const nav = qs('#sidebar-nav');
  const path = getCurrentPath().split('?')[0] || '/';

  const sidebar = qs('#sidebar');
  if (!nav) return;
  nav.innerHTML = '';
  try {
    if (currentNavMode === 'admin') {
      sidebar?.classList.add('sidebar-dark');
      const links = [
        { href: '/admin', icon: '<i class="fa-solid fa-chart-pie"></i>', text: 'Dashboard' },
        { href: '/admin/orders', icon: '<i class="fa-solid fa-receipt"></i>', text: 'Đơn hàng' },
        { href: '/admin/payments', icon: '<i class="fa-solid fa-credit-card"></i>', text: 'Thanh toán' },
        { href: '/admin/balance', icon: '<i class="fa-solid fa-users"></i>', text: 'Quản lý user' },
        { divider: 'Sản phẩm' },
        { href: '/admin/categories', icon: '<i class="fa-solid fa-folder-tree"></i>', text: 'Danh mục' },
        { href: '/admin/products', icon: '<i class="fa-solid fa-bag-shopping"></i>', text: 'Sản phẩm' },
        { href: '/admin/stock', icon: '<i class="fa-solid fa-boxes-stacked"></i>', text: 'Kho tài khoản' },
        { href: '/admin/api-providers', icon: '<i class="fa-solid fa-plug"></i>', text: 'Đấu nối API' },
        { divider: 'SMM Panel' },
        { href: '/admin/smm/platforms', icon: '<i class="fa-solid fa-share-nodes"></i>', text: 'Nền tảng' },
        { href: '/admin/smm/categories', icon: '<i class="fa-solid fa-folder-tree"></i>', text: 'Danh mục SMM' },
        { href: '/admin/smm/services', icon: '<i class="fa-solid fa-list-check"></i>', text: 'Dịch vụ SMM' },
        { href: '/admin/smm/orders', icon: '<i class="fa-solid fa-receipt"></i>', text: 'Đơn hàng SMM' },
        { href: '/admin/smm/providers', icon: '<i class="fa-solid fa-plug-circle-bolt"></i>', text: 'Đấu API SMM' },
        { divider: 'Tính năng' },
        { href: '/admin/banners', icon: '<i class="fa-solid fa-image"></i>', text: 'Banners' },
        { href: '/admin/images', icon: '<i class="fa-solid fa-images"></i>', text: 'Thư viện ảnh' },
        { href: '/admin/flash-sales', icon: '<i class="fa-solid fa-bolt"></i>', text: 'Flash Sales' },
        { href: '/admin/gift-codes', icon: '<i class="fa-solid fa-gift"></i>', text: 'Mã quà tặng' },
        { href: '/admin/affiliates', icon: '<i class="fa-solid fa-user-group"></i>', text: 'Affiliates' },
        { href: '/admin/blog', icon: '<i class="fa-solid fa-newspaper"></i>', text: 'Blog' },
        { divider: 'Hỗ trợ & Cài đặt' },
        { href: '/admin/tickets', icon: '<i class="fa-solid fa-headset"></i>', text: 'Hỗ trợ' },
        { href: '/admin/notifications', icon: '<i class="fa-solid fa-tower-broadcast"></i>', text: 'Kết nối & Thông báo' },
        { href: '/admin/support-pages', icon: '<i class="fa-solid fa-file-lines"></i>', text: 'Trang thông tin' },
        { href: '/admin/announcements', icon: '<i class="fa-solid fa-bullhorn"></i>', text: 'Thông báo' },
        { href: '/admin/oauth-settings', icon: '<i class="fa-brands fa-github"></i>', text: 'Đăng nhập MXH' },
        { href: '/admin/settings', icon: '<i class="fa-solid fa-gear"></i>', text: 'Cài đặt chung' },
        { divider: '' },
        { href: '/', icon: '<i class="fa-solid fa-arrow-left"></i>', text: 'Về trang chủ' }
      ];

      const visibleLinks = (currentUser?.role === 'staff'
        ? links.filter(l => l.divider !== undefined || STAFF_ALLOWED_ADMIN_ROUTES.has(l.href || '') || l.href === '/')
        : links
      ).filter(l => {
        if (!l.feature) return true;
        return appSettings.features?.[l.feature] !== false;
      });

      visibleLinks.forEach(l => {
        if (l.divider !== undefined) {
          if (l.divider !== '') {
            nav.appendChild(el('div', 'sidebar-divider'));
            nav.appendChild(el('div', 'sidebar-section-title', l.divider));
          } else {
            nav.appendChild(el('div', 'sidebar-divider'));
          }
        } else if (l.group) {
          // Expandable group (e.g. SMM Panel)
          const isChildActive = l.children?.some(c => path === c.href || path.startsWith(c.href + '/'));
          const groupWrap = el('div', 'nav-cat-group' + (isChildActive ? ' expanded' : ''));
          const groupItem = el('div', 'nav-item nav-item-parent' + (isChildActive ? ' active' : ''));
          groupItem.innerHTML = `<a href="#" class="nav-item-link" onclick="event.preventDefault()"><div class="nav-icon">${l.icon}</div><span>${l.group}</span></a><button class="nav-expand-btn" aria-label="Mở rộng"><i class="fa-solid fa-chevron-down"></i></button>`;
          groupWrap.appendChild(groupItem);
          const subList = el('div', 'nav-sub-list');
          (l.children || []).forEach(child => {
            const subItem = el('a', 'nav-sub-item' + (path === child.href ? ' active' : ''));
            subItem.href = child.href;
            subItem.innerHTML = `<i class="fa-solid fa-circle" style="font-size:5px;color:var(--text-muted);margin-right:8px;"></i>${child.text}`;
            subList.appendChild(subItem);
          });
          groupWrap.appendChild(subList);
          const toggleBtn = groupWrap.querySelector('.nav-expand-btn');
          toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            groupWrap.classList.toggle('expanded');
          });
          nav.appendChild(groupWrap);
        } else {
          const item = el('a', 'nav-item' + (path === l.href ? ' active' : ''));
          item.href = l.href;
          item.innerHTML = `<div class="nav-icon">${l.icon}</div><span>${l.text}</span>`;
          nav.appendChild(item);
        }
      });
      return;
    }

    sidebar?.classList.remove('sidebar-dark');
    categories = await apiFetch('/categories/');

    // ── Trang chủ ──
    const homeItem = el('a', 'nav-item' + (path === '/' ? ' active' : ''));
    homeItem.href = '/';
    homeItem.innerHTML = '<div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><span>Trang chủ</span>';
    nav.appendChild(homeItem);

    // ── Danh mục ──
    nav.innerHTML += '<div class="sidebar-section-title">Danh mục</div>';
    const defaultIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
    categories.filter(cat => !cat.product_type || cat.product_type === 'premium').forEach(cat => {
      const subs = [];
      const hasSubs = false;
      const iconUrl = cat.image_url || cat.icon_url;
      const icon = iconUrl ? `<img src="${iconUrl}" alt="" style="width:18px;height:18px;object-fit:contain;border-radius:2px;" />` : defaultIcon;

      if (hasSubs) {
        // Parent with expandable children
        const group = el('div', 'nav-cat-group');
        const item = el('div', 'nav-item nav-item-parent');
        item.innerHTML = `<a href="/all?cat=${encodeURIComponent(cat.slug)}" class="nav-item-link"><div class="nav-icon">${icon}</div><span>${cat.name}</span></a><button class="nav-expand-btn" aria-label="Mở rộng"><i class="fa-solid fa-chevron-down"></i></button>`;
        group.appendChild(item);

        const subList = el('div', 'nav-sub-list');
        subs.forEach(sub => {
          const subItem = el('a', 'nav-item nav-item-sub');
          subItem.href = `/all?cat=${encodeURIComponent(cat.slug)}&sub=${encodeURIComponent(sub.slug)}`;
          const subIconUrl = sub.icon_url;
          const subIcon = subIconUrl ? `<img src="${subIconUrl}" alt="" style="width:16px;height:16px;object-fit:contain;border-radius:2px;" />` : '<i class="fa-solid fa-chevron-right" style="font-size:10px;color:var(--text-muted);"></i>';
          subItem.innerHTML = `<div class="nav-icon">${subIcon}</div><span>${sub.name}</span>`;
          subList.appendChild(subItem);
        });
        group.appendChild(subList);

        // Expand/collapse toggle
        const toggleBtn = group.querySelector('.nav-expand-btn');
        // Auto-expand if current page matches this category
        const params = new URLSearchParams(location.search);
        if (params.get('cat') === cat.slug) {
          group.classList.add('expanded');
        }
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          group.classList.toggle('expanded');
        });
        nav.appendChild(group);
      } else {
        // Simple parent without children
        const item = el('a', 'nav-item');
        item.href = `/all?cat=${encodeURIComponent(cat.slug)}`;
        item.innerHTML = `<div class="nav-icon">${icon}</div><span>${cat.name}</span>`;
        nav.appendChild(item);
      }
    });

    // ── Topup Game dropdown ──
    const gameCats = categories.filter(c => c.product_type === 'game');
    if (gameCats.length) {
      const group = el('div', 'nav-cat-group');
      const item = el('div', 'nav-item nav-item-parent');
      item.innerHTML = `<a href="/all?type=game" class="nav-item-link"><div class="nav-icon"><i class="fa-solid fa-gamepad"></i></div><span>Topup Game</span></a><button class="nav-expand-btn" aria-label="Mở rộng"><i class="fa-solid fa-chevron-down"></i></button>`;
      group.appendChild(item);

      const subList = el('div', 'nav-sub-list');
      gameCats.forEach(cat => {
        const subItem = el('a', 'nav-item nav-item-sub');
        subItem.href = `/all?cat=${encodeURIComponent(cat.slug)}`;
        const iconUrl = cat.image_url || cat.icon_url;
        const subIcon = iconUrl ? `<img src="${iconUrl}" alt="" style="width:16px;height:16px;object-fit:contain;border-radius:2px;" />` : '<i class="fa-solid fa-chevron-right" style="font-size:10px;color:var(--text-muted);"></i>';
        subItem.innerHTML = `<div class="nav-icon">${subIcon}</div><span>${cat.name}</span>`;
        subList.appendChild(subItem);
      });
      group.appendChild(subList);

      const toggleBtn = group.querySelector('.nav-expand-btn');
      const params = new URLSearchParams(location.search);
      if (gameCats.some(c => params.get('cat') === c.slug)) {
        group.classList.add('expanded');
      }
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        group.classList.toggle('expanded');
      });
      nav.appendChild(group);
    }

    // ── Giftcard dropdown (hiển thị sản phẩm thay vì danh mục) ──
    const giftcardCatsAll = categories.filter(c => c.product_type === 'giftcard');
    // Pre-check: chỉ hiện menu nếu có ít nhất 1 sản phẩm trong các category giftcard
    let giftcardProducts = [];
    if (giftcardCatsAll.length) {
      try {
        const promises = giftcardCatsAll.map(c => apiFetch(`/products/?category_id=${c.id}&limit=50`).catch(() => ({ items: [] })));
        const results = await Promise.all(promises);
        const seen = new Set();
        for (const r of results) {
          for (const p of (r.items || [])) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            giftcardProducts.push(p);
          }
        }
      } catch (_) {}
    }
    const giftcardCats = giftcardProducts.length ? giftcardCatsAll : [];
    if (giftcardCats.length) {
      const group = el('div', 'nav-cat-group');
      const item = el('div', 'nav-item nav-item-parent');
      item.innerHTML = `<a href="/all?type=giftcard" class="nav-item-link"><div class="nav-icon"><i class="fa-solid fa-gift"></i></div><span>Giftcard</span></a><button class="nav-expand-btn" aria-label="Mở rộng"><i class="fa-solid fa-chevron-down"></i></button>`;
      group.appendChild(item);

      const subList = el('div', 'nav-sub-list');
      group.appendChild(subList);

      const toggleBtn = group.querySelector('.nav-expand-btn');
      let loaded = false;
      const loadProducts = async () => {
        if (loaded) return;
        loaded = true;
        try {
          const products = giftcardProducts;
          if (!products.length) {
            const empty = el('div', 'nav-item nav-item-sub');
            empty.style.cssText = 'opacity:.6;cursor:default;font-size:12px;';
            empty.innerHTML = `<div class="nav-icon"><i class="fa-solid fa-inbox" style="font-size:10px;color:var(--text-muted);"></i></div><span>Chưa có sản phẩm</span>`;
            subList.appendChild(empty);
            return;
          }
          products.forEach(p => {
            const subItem = el('a', 'nav-item nav-item-sub');
            subItem.href = `/product/${encodeURIComponent(p.slug)}`;
            const iconUrl = p.image_url;
            const subIcon = iconUrl ? `<img src="${iconUrl}" alt="" style="width:16px;height:16px;object-fit:contain;border-radius:2px;" />` : '<i class="fa-solid fa-gift" style="font-size:10px;color:var(--text-muted);"></i>';
            subItem.innerHTML = `<div class="nav-icon">${subIcon}</div><span>${p.name}</span>`;
            subList.appendChild(subItem);
          });
        } catch (e) {
          console.warn('Load giftcard products failed', e);
        }
      };
      // Auto-load nếu trang hiện tại liên quan giftcard
      const params = new URLSearchParams(location.search);
      if (params.get('type') === 'giftcard' || giftcardCats.some(c => params.get('cat') === c.slug)) {
        group.classList.add('expanded');
        loadProducts();
      }
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        group.classList.toggle('expanded');
        if (group.classList.contains('expanded')) loadProducts();
      });
      nav.appendChild(group);
    }

    // ── SMM Panel dropdown ──
    if (appSettings.features?.smm !== false) {
      const smmGroup = el('div', 'nav-cat-group');
      const smmItem = el('div', 'nav-item nav-item-parent');
      smmItem.innerHTML = `<a href="/smm/order" class="nav-item-link"><div class="nav-icon"><i class="fa-solid fa-share-nodes"></i></div><span>SMM Panel</span></a><button class="nav-expand-btn" aria-label="Mở rộng"><i class="fa-solid fa-chevron-down"></i></button>`;
      smmGroup.appendChild(smmItem);

      const smmSubList = el('div', 'nav-sub-list');
      const smmLinks = [
        { href: '/smm/order', icon: '<i class="fa-solid fa-cart-plus" style="font-size:10px;color:var(--text-muted);"></i>', text: 'Đặt đơn' },
        { href: '/smm/history', icon: '<i class="fa-solid fa-clock-rotate-left" style="font-size:10px;color:var(--text-muted);"></i>', text: 'Lịch sử' },
        { href: '/smm/services', icon: '<i class="fa-solid fa-list" style="font-size:10px;color:var(--text-muted);"></i>', text: 'Danh sách' },
        { href: '/smm/warranty', icon: '<i class="fa-solid fa-shield-halved" style="font-size:10px;color:var(--text-muted);"></i>', text: 'Bảo hành' },
      ];
      smmLinks.forEach(link => {
        const subItem = el('a', 'nav-item nav-item-sub' + (path === link.href ? ' active' : ''));
        subItem.href = link.href;
        subItem.innerHTML = `<div class="nav-icon">${link.icon}</div><span>${link.text}</span>`;
        smmSubList.appendChild(subItem);
      });
      smmGroup.appendChild(smmSubList);

      const smmToggleBtn = smmGroup.querySelector('.nav-expand-btn');
      if (path.startsWith('/smm')) {
        smmGroup.classList.add('expanded');
      }
      smmToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        smmGroup.classList.toggle('expanded');
      });
      nav.appendChild(smmGroup);
    }

    // ── Offers & Blog link ──
    const divider = el('div', 'sidebar-divider');
    nav.appendChild(divider);
    nav.appendChild(el('div', 'sidebar-section-title', 'Khác'));
    
    const offersItem = el('a', 'nav-item' + (path === '/offers' ? ' active' : ''));
    offersItem.href = '/offers';
    offersItem.innerHTML = '<div class="nav-icon"><i class="fa-solid fa-gift"></i></div><span>Ưu đãi</span>';
    if (appSettings.features?.offers !== false) nav.appendChild(offersItem);

    if (currentUser && appSettings.features?.wishlist !== false) {
      const wlItem = el('a', 'nav-item' + (path === '/wishlist' ? ' active' : ''));
      wlItem.href = '/wishlist';
      wlItem.innerHTML = '<div class="nav-icon"><i class="fa-solid fa-heart" style="color:#ef4444;font-size:16px;"></i></div><span>Yêu thích</span>';
      nav.appendChild(wlItem);
    }

    const supportItem = el('a', 'nav-item' + (path.startsWith('/support') ? ' active' : ''));
    supportItem.href = '/support';
    supportItem.innerHTML = '<div class="nav-icon"><i class="fa-solid fa-headset"></i></div><span>Hỗ trợ</span>';
    if (appSettings.features?.support !== false) nav.appendChild(supportItem);

    const blogItem = el('a', 'nav-item' + (location.pathname.startsWith('/blog') ? ' active' : ''));
    blogItem.href = '/blog';
    blogItem.innerHTML = '<div class="nav-icon"><i class="fa-solid fa-newspaper"></i></div><span>Blog</span>';
    if (appSettings.features?.blog !== false) nav.appendChild(blogItem);

    if (currentUser) {
      if (appSettings.features?.affiliate !== false) {
        const affItem = el('a', 'nav-item' + (path === '/affiliate' ? ' active' : ''));
        affItem.href = '/affiliate';
        affItem.innerHTML = '<div class="nav-icon"><i class="fa-solid fa-user-group"></i></div><span>Giới thiệu bạn bè</span>';
        nav.appendChild(affItem);
      }
    }
  } catch (_) {}
}


// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
async function init() {
  try {
    loadToken();
    lockViewportZoom();
    if (location.hash && location.hash.startsWith('#/')) {
      history.replaceState(null, '', normalizeAppPath(location.hash));
    }


    // BẮT BUỘC ĐỢI TẢI THÔNG TIN USER TRƯỚC KHI NAVIGATE
    await fetchMe();
    updateAuthUI();
    updateCartCount();

    try {
      const urlParams = new URLSearchParams(location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        localStorage.setItem('aff_ref_code', refCode);
        const cleanUrl = new URL(location);
        cleanUrl.searchParams.delete('ref');
        history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search);
      }
    } catch (_) {}

  if (currentUser) {
    try {
      const ids = await apiFetch('/wishlist/ids');
      window._wishlistIds = new Set(ids);
    } catch (_) { window._wishlistIds = new Set(); }
  } else {
    window._wishlistIds = new Set();
  }

  const yearEl = document.getElementById('f-current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  try {
    appSettings = await apiFetch('/admin/settings/public').catch(() => ({}));
    appSettings.features = appSettings.features || {};
    window.appSettings = appSettings;

    const logoUrl = appSettings.logo_url || appSettings.site_logo;
    const faviconUrl = appSettings.favicon_url || getFaviconUrl();
    const defaultImageUrl = appSettings.seo_image_url || appSettings.default_image_url;
    const defaultAvatarUrl = appSettings.default_avatar_url;
    const siteName = appSettings.site_name || '';
    const siteDescription = appSettings.seo_description || appSettings.site_description || 'Mua tài khoản, key, gift card và các sản phẩm số uy tín';
    const seoTitle = appSettings.seo_title || appSettings.site_name || '';
    const seoKeywords = appSettings.seo_keywords || appSettings.keywords || '';
    const seoAuthor = appSettings.seo_author || appSettings.author || '';
    const twitterCard = appSettings.twitter_card || 'summary_large_image';
    const canonicalUrl = (appSettings.site_url ? appSettings.site_url.replace(/\/$/, '') + location.pathname : location.origin + location.pathname);
    if (seoTitle) {
      document.title = seoTitle;
    }
    const setMeta = (selector, attr, value) => {
      const node = document.querySelector(selector);
      if (node && value) node.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', siteDescription);
    setMeta('meta[name="keywords"]', 'content', seoKeywords);
    setMeta('meta[name="author"]', 'content', seoAuthor);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
    setMeta('meta[property="og:title"]', 'content', seoTitle);
    setMeta('meta[property="og:description"]', 'content', siteDescription);
    setMeta('meta[property="og:site_name"]', 'content', siteName);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', defaultImageUrl || logoUrl || '');
    setMeta('meta[name="twitter:card"]', 'content', twitterCard);
    setMeta('meta[name="twitter:title"]', 'content', seoTitle);
    setMeta('meta[name="twitter:description"]', 'content', siteDescription);
    setMeta('meta[name="twitter:image"]', 'content', defaultImageUrl || logoUrl || '');
    if (faviconUrl) {
      applyFavicon(faviconUrl);
    }
    if (defaultImageUrl) window.defaultImageUrl = defaultImageUrl;
    if (defaultAvatarUrl) {
      window.defaultAvatarUrl = defaultAvatarUrl;
      if (typeof updateAuthUI === 'function') updateAuthUI();
    }

    const logoLink = qs('#logo-link');
    if (logoLink) {
      if (logoUrl) {
        logoLink.innerHTML = `<img src="${logoUrl}" alt="${appSettings.site_name || 'Logo'}" style="height: 92px; width: auto; max-width: 100%; object-fit: contain;">`;
      } else if (appSettings.site_name) {
        const logoText = logoLink.querySelector('.logo-text');
        if (logoText) logoText.textContent = appSettings.site_name;
      }
    }

    const fSiteName = qs('#f-site-name');
    if (fSiteName) {
      fSiteName.textContent = appSettings.site_name || '';
    }

    const fSiteDesc = qs('#f-site-desc');
    if (fSiteDesc && appSettings.site_description) {
      fSiteDesc.textContent = appSettings.site_description;
    }

    const fSocials = qs('#f-socials');
    if (fSocials) {
      let socialHtml = '';
      if (appSettings.social_fb) socialHtml += `<a href="${appSettings.social_fb}" target="_blank" title="Facebook"><i class="fa-brands fa-facebook"></i></a>`;
      if (appSettings.social_tele) socialHtml += `<a href="${appSettings.social_tele}" target="_blank" title="Telegram"><i class="fa-brands fa-telegram"></i></a>`;
      if (appSettings.social_discord) socialHtml += `<a href="${appSettings.social_discord}" target="_blank" title="Discord"><i class="fa-brands fa-discord"></i></a>`;
      fSocials.innerHTML = socialHtml;
    }

    const fSiteCopy = qs('#f-site-copy');
    if (fSiteCopy) {
      fSiteCopy.innerHTML = appSettings.copyright_text || `Copyright © ${new Date().getFullYear()} ${appSettings.site_name || ''}. All rights reserved.`;
    }
  } catch (_) {
    appSettings = {};
    window.appSettings = appSettings;
  }

  await loadSidebar();
  window.addEventListener('popstate', navigate);
  await navigate();

  const userMenuBtn = qs('#user-menu-btn');
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== '_self') return;
    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;
    const url = new URL(rawHref, location.origin);
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/static/') || url.pathname.startsWith('/blog') || url.pathname.startsWith('/share/')) return;
    e.preventDefault();
    navigateTo(`${url.pathname}${url.search}`);
  });

  const dropdown = qs('#user-dropdown');
  if (userMenuBtn && dropdown) {
    userMenuBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); };
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  qs('#btn-logout')?.addEventListener('click', () => {
    saveToken(null); currentUser = null; updateAuthUI();
    toast('Đã đăng xuất', 'info'); navigateTo('/');
  });

  const doSearch = () => { const q = (qs('#search-input')?.value || '').trim(); if (q) navigateTo(`/all?q=${encodeURIComponent(q)}`); };
  qs('#search-btn')?.addEventListener('click', doSearch);
  qs('#search-input')?.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });

  qs('#hamburger')?.addEventListener('click', toggleSidebar);
  qs('#sidebar-overlay')?.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => updateHeaderMode(getCurrentPath(), getCurrentPath().split('?')[0].startsWith('/admin')));

  qs('#modal-close')?.addEventListener('click', closeModal);
  qs('#modal-overlay')?.addEventListener('click', (e) => { if (e.target === qs('#modal-overlay')) closeModal(); });

  if (typeof ADMIN_DEBUG !== 'undefined' && ADMIN_DEBUG) {
    document.addEventListener('click', (e) => {
      if (!getCurrentPath().split('?')[0].startsWith('/admin')) return;
      const target = e.target.closest('button, a, [data-del], [data-del-banner], [data-del-fs], [data-del-gc], [data-del-page], [data-del-ann], [data-del-post], [data-del-cat], [data-cancel-order], [data-delpkg]');
      if (!target) return;
      adminDebugLog('click captured', {
        text: target.textContent?.trim() || '',
        id: target.id || null,
        className: target.className || null,
        dataset: { ...target.dataset },
      });
    }, true);

    document.addEventListener('click', (e) => {
      if (!getCurrentPath().split('?')[0].startsWith('/admin')) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      adminDebugLog('click top element', {
        tag: el?.tagName || null,
        id: el?.id || null,
        className: el?.className || null,
      });
    }, true);

    window.addEventListener('error', (e) => {
      if (!getCurrentPath().split('?')[0].startsWith('/admin')) return;
      adminDebugLog('window error', { message: e.message, source: e.filename, line: e.lineno, column: e.colno });
    });

    window.addEventListener('unhandledrejection', (e) => {
      if (!getCurrentPath().split('?')[0].startsWith('/admin')) return;
      adminDebugLog('unhandled rejection', String(e.reason));
    });
  }
  } catch (err) {
    console.error('App init failed:', err);
    window.__appInitError = String(err?.stack || err?.message || err);
  }
}

init();
