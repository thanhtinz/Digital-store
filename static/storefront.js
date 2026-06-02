// ═══════════════════════════════════════════════════════════════
//  STOREFRONT PAGES
// ═══════════════════════════════════════════════════════════════

async function renderHome(view) {
  if (!view) return;
  
  // ── Parallel API calls ───────────────────────────────────
  // Identify game categories
  const gameCatSlugs = categories.filter(c => c.product_type === 'game').map(c => c.slug);
  const hasGameCats = gameCatSlugs.length > 0;

  const [banners, flashSales, featuredData, announcementsData, gameProductsData] = await Promise.all([
    apiFetch('/banners/').catch(() => []),
    apiFetch('/flash-sales/active').catch(() => []),
    apiFetch('/products/featured?limit=12').catch(() => []),
    appSettings.features && appSettings.features.announcements !== false
      ? apiFetch('/announcements/').catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
    hasGameCats
      ? apiFetch(`/products/?category_slug=${gameCatSlugs[0]}&limit=18`).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
  ]);

  // Also fetch home category products in parallel
  let homeCatProducts = {};
  if (appSettings.home_categories) {
    const slugs = appSettings.home_categories.split(',').map(s => s.trim()).filter(Boolean);
    const catFetches = slugs.map(slug =>
      apiFetch(`/products/?category_slug=${slug}&limit=8`)
        .then(data => ({ slug, data }))
        .catch(() => ({ slug, data: null }))
    );
    const catResults = await Promise.all(catFetches);
    catResults.forEach(r => { if (r.data) homeCatProducts[r.slug] = r.data; });
  }
  // Once data is ready, clear the loading state and rebuild UI
  view.innerHTML = '';
  const heroBanners = banners.filter(b => b.banner_type === 'hero');
  const catBanners = banners.filter(b => b.banner_type === 'category');

  // ── Build all DOM in a fragment to minimize reflows ──────
  const frag = document.createDocumentFragment();

  // ── Banner Slider ────────────────────────────────────────
  if (heroBanners.length) {
    const slider = el('div', 'banner-slider');
    const track = el('div', 'banner-track');
    heroBanners.forEach((b, i) => {
      const slide = el('div', `banner-slide${i === 0 ? ' active' : ''}`);
      const inner = b.link
        ? `<a href="${b.link}"><img src="${withImageFallback(b.image_url)}" alt="${b.title}" loading="lazy" decoding="async" onerror="${onImgFallback()}" /></a>`
        : `<img src="${withImageFallback(b.image_url)}" alt="${b.title}" loading="lazy" decoding="async" onerror="${onImgFallback()}" />`;
      slide.innerHTML = inner;
      track.appendChild(slide);
    });

function paymentStatusLabel(status) {
  const normalized = String(status || '').toUpperCase();
  const labels = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Hết hạn',
    PROCESSING: 'Đang xử lý',
    FAILED: 'Lỗi',
  };
  return labels[normalized] || status || 'Chờ thanh toán';
}

function paymentMethodLabel(method) {
  const labels = { sepay: 'QR Ngân hàng', balance: 'Số dư' };
  return labels[method] || method || 'QR Ngân hàng';
}

    slider.appendChild(track);

    if (heroBanners.length > 1) {
      const dots = el('div', 'banner-dots');
      heroBanners.forEach((_, i) => {
        const dot = el('button', `banner-dot${i === 0 ? ' active' : ''}`);
        dot.dataset.idx = i;
        dots.appendChild(dot);
      });
      slider.appendChild(dots);

      // Nav arrows
      slider.innerHTML += `<button class="banner-arrow banner-prev" aria-label="Previous">‹</button><button class="banner-arrow banner-next" aria-label="Next">›</button>`;

      // Slider logic
      let cur = 0;
      const total = heroBanners.length;
      const go = (n) => {
        cur = ((n % total) + total) % total;
        slider.querySelectorAll('.banner-slide').forEach((s, i) => s.classList.toggle('active', i === cur));
        slider.querySelectorAll('.banner-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
      };
      slider.querySelector('.banner-prev').onclick = () => go(cur - 1);
      slider.querySelector('.banner-next').onclick = () => go(cur + 1);
      dots.onclick = e => { if (e.target.classList.contains('banner-dot')) go(+e.target.dataset.idx); };
      // Auto-rotate
      let autoTimer = setInterval(() => go(cur + 1), 5000);
      slider.onmouseenter = () => clearInterval(autoTimer);
      slider.onmouseleave = () => { autoTimer = setInterval(() => go(cur + 1), 5000); };
    }
    frag.appendChild(slider);
  }

  // ── Category Banners Grid ────────────────────────────────
  if (catBanners.length) {
    const grid = el('div', 'banner-grid');
    catBanners.forEach(b => {
      const card = el('div', 'banner-card');
      const inner = b.link
        ? `<a href="${b.link}"><img src="${withImageFallback(b.image_url)}" alt="${b.title}" loading="lazy" decoding="async" onerror="${onImgFallback()}" /></a>`
        : `<img src="${withImageFallback(b.image_url)}" alt="${b.title}" loading="lazy" decoding="async" onerror="${onImgFallback()}" />`;
      card.innerHTML = inner;
      grid.appendChild(card);
    });
    frag.appendChild(grid);
  }

  // ── Fallback hero if no banners ──────────────────────────
  if (!heroBanners.length && !catBanners.length) {
    const hero = el('div', 'hero');
    hero.innerHTML = `
      <h1>Mua sản phẩm số<br>uy tín, giá tốt</h1>
      <p>Tài khoản, key, gift card, phần mềm và hàng trăm sản phẩm số chất lượng cao</p>
      <div class="hero-tags">
        <span class="hero-tag">${ico.zap} Giao hàng tự động</span>
        <span class="hero-tag">${ico.shield} An toàn & uy tín</span>
        <span class="hero-tag">${ico.card} Thanh toán nhanh</span>
      </div>
    `;
    frag.appendChild(hero);
  }

  // ── Announcements ────────────────────────────────────────
  const announcements = announcementsData?.items || [];
  if (announcements.length && appSettings.features?.announcements !== false) {
    const annSection = el('div', 'ann-section');
    const hasMore = announcements.length > 1;
    annSection.innerHTML = `
      <div class="ann-header">
        <div class="ann-title"><i class="fa-solid fa-bullhorn"></i> Thông báo</div>
        ${hasMore ? `<button class="ann-toggle-btn" id="ann-toggle"><span class="ann-toggle-count">${announcements.length - 1} thông báo khác</span> <i class="fa-solid fa-chevron-down"></i></button>` : ''}
      </div>
      <div class="ann-scroll ${hasMore ? 'ann-collapsed' : ''}" id="ann-list">
        ${announcements.map((a, i) => `
          <div class="ann-card-v2 ${hasMore && i > 0 ? 'ann-hidden-card' : ''}">
            <div class="ann-card-header">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=e2e8f0" class="ann-avatar" alt="Admin" />
              <div class="ann-author-info">
                <div class="ann-author-name">Quản Trị Viên <i class="fa-solid fa-circle-check" style="color: #1d9bf0;"></i></div>
                <div class="ann-date">${new Date(a.created_at).toLocaleString('vi-VN')}</div>
              </div>
            </div>
            <div class="ann-card-content">
              ${a.title ? `<div class="ann-content-title">${a.title}</div>` : ''}
              <div class="ann-content-body">${a.content}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    frag.appendChild(annSection);

    if (hasMore) {
      const toggleBtn = annSection.querySelector('#ann-toggle');
      const list = annSection.querySelector('#ann-list');
      let expanded = false;
      toggleBtn.onclick = () => {
        expanded = !expanded;
        list.classList.toggle('ann-collapsed', !expanded);
        list.querySelectorAll('.ann-hidden-card').forEach(c => c.style.display = expanded ? '' : 'none');
        toggleBtn.querySelector('i').className = expanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        toggleBtn.querySelector('.ann-toggle-count').textContent = expanded ? 'Thu gọn' : `${announcements.length - 1} thông báo khác`;
      };
      // Initially hide extra cards
      annSection.querySelectorAll('.ann-hidden-card').forEach(c => c.style.display = 'none');
    }
  }

  // ── Category Tabs + Subcategory Grid (exclude game categories) ──
  const premiumCategories = categories.filter(c => c.product_type !== 'game' && c.product_type !== 'giftcard');
  if (premiumCategories.length) {
    const catSection = el('div', 'cat-section');

    // Parent category pills
    const pills = el('div', 'cat-pills');
    const allPill = el('button', 'cat-pill active', `${ico.grid} <span>Tất cả</span>`);
    allPill.dataset.slug = '';
    pills.appendChild(allPill);
    premiumCategories.forEach(cat => {
      const pill = el('button', 'cat-pill');
      const iconUrl = cat.image_url || cat.icon_url;
      const iconHtml = iconUrl ? `<img src="${withImageFallback(iconUrl)}" alt="" loading="lazy" decoding="async" onerror="${onImgFallback()}" style="width:16px;height:16px;object-fit:contain;border-radius:2px;margin-right:4px;" />` : ico.box;
      pill.innerHTML = `${iconHtml} <span>${cat.name}</span>`;
      pill.dataset.slug = cat.slug;
      pills.appendChild(pill);
    });
    catSection.appendChild(pills);

    // Subcategory cards container
    const subGrid = el('div', 'subcat-wrap');
    catSection.appendChild(subGrid);

    // Render subcategories for selected parent
    const renderSubcats = (parentSlug) => {
      subGrid.innerHTML = '';
      let children = [];
      let parent = null;
      if (!parentSlug) {
        // "Tất cả" — show all children from all premium parents
        premiumCategories.forEach(c => { if (c.children?.length) children.push(...c.children); });
      } else {
        parent = categories.find(c => c.slug === parentSlug);
        if (parent?.children?.length) children = parent.children;
      }
      if (children.length) {
        const grid = el('div', 'subcat-grid');
        children.forEach(sub => {
          const card = el('div', 'subcat-card');
          const iconHtml = sub.icon_url
            ? `<img src="${withImageFallback(sub.icon_url)}" alt="${esc(sub.name)}" loading="lazy" decoding="async" onerror="${onImgFallback()}" />`
            : `<div class="subcat-icon">${ico.box}</div>`;
          card.innerHTML = `${iconHtml}<span class="subcat-name">${esc(sub.name)}</span>`;
          card.onclick = () => {
            const p = categories.find(c => c.children?.some(s => s.slug === sub.slug));
            navigateTo(`/all?cat=${p ? p.slug : ''}&sub=${sub.slug}`);
          };
          grid.appendChild(card);
        });
        subGrid.appendChild(grid);
      } else if (parentSlug && parent) {
        const empty = el('div', 'empty-state');
        empty.innerHTML = `<div class="empty-state-icon">${ico.inbox}</div><h3>${esc(parent.name)} chưa có danh mục con</h3><p class="text-muted">Mở trang tất cả sản phẩm của danh mục này.</p><a class="btn btn-primary mt-12" href="/all?cat=${parent.slug}">Xem tất cả sản phẩm</a>`;
        subGrid.appendChild(empty);
      }
    };

    // Pill click handler
    pills.addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;
      qsa('.cat-pill', pills).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderSubcats(pill.dataset.slug || '');
    });

    // Initial render — show all
    renderSubcats('');

    frag.appendChild(catSection);
  }

  // ── Flash Sale ───────────────────────────────────────────
  if (flashSales.length && appSettings.features?.flash_sales !== false) {
    const section = el('div', 'flash-sale-section');
    section.innerHTML = `<div class="section-title">${ico.zap} Flash Sale</div>`;
    const row = el('div', 'flash-sale-row');
    flashSales.forEach(fs => {
      const card = el('div', 'flash-card');
      const discount = fs.original_price ? Math.round((1 - fs.sale_price / fs.original_price) * 100) : 0;
      const sold = fs.sold_count || 0;
      const total = fs.quantity_limit || 0;
      const progressPct = total > 0 ? Math.min((sold / total) * 100, 100) : 0;
      const cardHtml = `
        ${fs.product_image ? `<img class="flash-card-img" src="${fs.product_image}" alt="${fs.product_name || ''}" loading="lazy" decoding="async" />` : '<div class="flash-card-img flash-card-img-ph">' + ico.box + '</div>'}
        <div class="flash-card-body">
          <div class="flash-card-name">${fs.product_name || 'Sản phẩm'}</div>
          <div class="flash-card-prices">
            <span class="flash-price-sale">${fmt(fs.sale_price)}</span>
            ${fs.original_price ? `<span class="flash-price-original">${fmt(fs.original_price)}</span>` : ''}
          </div>
          ${discount ? `<span class="flash-badge">-${discount}%</span>` : ''}
          <div class="flash-countdown" data-end="${fs.ends_at}">--:--:--</div>
          ${total > 0 ? `<div class="flash-progress"><div class="flash-progress-bar" style="width:${progressPct}%"></div></div><div class="flash-progress-text">Đã bán ${sold}/${total}</div>` : ''}
        </div>
      `;
      card.innerHTML = cardHtml;
      card.onclick = () => { if (fs.product_slug) navigateTo(`/product/${fs.product_slug}`); };
      row.appendChild(card);
    });
    section.appendChild(row);
    frag.appendChild(section);

    // Countdown timers
    const updateCountdowns = () => {
      qsa('.flash-countdown', section).forEach(el => {
        const end = new Date(el.dataset.end).getTime();
        const diff = end - Date.now();
        if (diff <= 0) { el.textContent = 'Hết hạn'; return; }
        const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        el.textContent = `${h}:${m}:${s}`;
      });
    };
    updateCountdowns();
    const cdInterval = setInterval(updateCountdowns, 1000);
    // Clean up interval when navigating away
    const origClear = view._clearFlashInterval;
    if (!origClear) {
      const observer = new MutationObserver(() => {
        if (!document.contains(view)) { clearInterval(cdInterval); observer.disconnect(); }
      });
      observer.observe(view.parentNode, { childList: true });
    }
  }

  // ── Featured Products ────────────────────────────────────
  const featuredHead = el('div', 'section-head');
  featuredHead.innerHTML = `<div class="section-title mb-0">${ico.star} Sản phẩm nổi bật</div><a href="/all" class="btn btn-primary btn-sm" style="font-weight: 600;">Xem tất cả <i class="fa-solid fa-arrow-right"></i></a>`;
  frag.appendChild(featuredHead);
  
  if (!featuredData.length) {
    frag.appendChild(el('div', 'empty-state', `<div class="empty-state-icon">${ico.inbox}</div><h3>Chưa có sản phẩm nổi bật</h3>`));
  } else {
    const grid = el('div', 'product-grid');
    featuredData.forEach(p => grid.appendChild(productCard(p)));
    frag.appendChild(grid);
  }


  // ── Selected Categories on Home ──────────────────────────
  if (appSettings.home_categories) {
    const slugs = appSettings.home_categories.split(',').map(s => s.trim()).filter(Boolean);
    // Helper: find category by slug (parent or child)
    const findCatBySlug = (slug) => {
      const parent = categories.find(c => c.slug === slug);
      if (parent) return { cat: parent, parentCat: null };
      for (const p of categories) {
        const child = p.children?.find(s => s.slug === slug);
        if (child) return { cat: child, parentCat: p };
      }
      return null;
    };
    for (const slug of slugs) {
      const found = findCatBySlug(slug);
      if (!found) continue;
      const { cat, parentCat } = found;

      const catHead = el('div', 'section-head mt-32');
      const catIcon = cat.icon_url ? `<img src="${withImageFallback(cat.icon_url)}" loading="lazy" decoding="async" onerror="${onImgFallback()}" style="width:24px;height:24px;object-fit:contain;vertical-align:middle"/>` : ico.box;
      const linkSlug = parentCat ? `cat=${parentCat.slug}&sub=${cat.slug}` : `cat=${cat.slug}`;
      catHead.innerHTML = `<div class="section-title mb-0">${catIcon} ${cat.name}</div><a href="/all?${linkSlug}" class="btn btn-primary btn-sm" style="font-weight: 600;">Xem tất cả <i class="fa-solid fa-arrow-right"></i></a>`;
      frag.appendChild(catHead);

      const catData = homeCatProducts[slug];
      if (catData && catData.items && catData.items.length) {
        const list = el('div', 'product-list-grid');
        catData.items.forEach(p => list.appendChild(productListCard(p)));
        frag.appendChild(list);
      } else {
        frag.appendChild(el('p', 'text-muted mb-32', 'Đang cập nhật sản phẩm...'));
      }
    }
  }

  // ── Topup Game Section ─────────────────────────────────
  const gameItems = gameProductsData?.items || gameProductsData || [];
  if (hasGameCats && gameItems.length) {
    const gameHead = el('div', 'section-head mt-32');
    gameHead.innerHTML = `<div class="section-title mb-0"><i class="fa-solid fa-gamepad"></i> Topup Game</div><a href="/all?cat=${gameCatSlugs[0]}" class="btn btn-primary btn-sm" style="font-weight: 600;">Xem tất cả <i class="fa-solid fa-arrow-right"></i></a>`;
    frag.appendChild(gameHead);
    const gameGrid = el('div', 'home-game-slider');
    const perPage = 6;
    const totalPages = Math.ceil(gameItems.length / perPage);
    const track = el('div', 'hgs-track');
    for (let page = 0; page < totalPages; page++) {
      const pageEl = el('div', 'hgs-page');
      gameItems.slice(page * perPage, (page + 1) * perPage).forEach(p => {
        const card = el('div', 'home-game-card');
        card.onclick = () => navigateTo(`/product/${p.slug}`);
        card.innerHTML = `
          <div class="hgc-img">${p.image_url ? `<img src="${p.image_url}" alt="${esc(p.name)}" loading="lazy" />` : `<div class="hgc-img-ph"><i class="fa-solid fa-gamepad"></i></div>`}
            ${p.topup_type ? `<span class="hgc-tag hgc-tag-topup">${p.topup_type === 'uid' ? '<i class="fa-solid fa-id-badge"></i> UID' : '<i class="fa-solid fa-right-to-bracket"></i> Login'}</span>` : ''}
            ${p.server_region ? `<span class="hgc-tag hgc-tag-server">${p.server_region === 'vietnam' ? '🇻🇳 VN' : '🌐 Global'}</span>` : ''}
          </div>
          <div class="hgc-body">
            <div class="hgc-name">${esc(p.name)}</div>
            <div class="hgc-meta">
              <span class="hgc-rating"><i class="fa-solid fa-star"></i> ${p.review_avg ? p.review_avg.toFixed(1) : '0'}</span>
              ${p.sold_count > 0 ? `<span class="hgc-sold">${p.sold_count > 1000 ? (p.sold_count / 1000).toFixed(1) + 'K' : p.sold_count} Sold</span>` : ''}
            </div>
          </div>
        `;
        pageEl.appendChild(card);
      });
      track.appendChild(pageEl);
    }
    gameGrid.appendChild(track);

    // Dots
    if (totalPages > 1) {
      const dots = el('div', 'hgs-dots');
      for (let i = 0; i < totalPages; i++) {
        const dot = el('span', 'hgs-dot' + (i === 0 ? ' active' : ''));
        dot.dataset.page = i;
        dots.appendChild(dot);
      }
      gameGrid.appendChild(dots);

      let currentPage = 0;
      const goTo = (idx) => {
        currentPage = idx;
        track.style.transform = `translateX(-${idx * 100}%)`;
        dots.querySelectorAll('.hgs-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
      };
      dots.onclick = (e) => { const d = e.target.closest('.hgs-dot'); if (d) goTo(parseInt(d.dataset.page)); };

      // Touch swipe
      let startX = 0, startY = 0, dragging = false;
      track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; dragging = true; }, { passive: true });
      track.addEventListener('touchend', (e) => {
        if (!dragging) return;
        dragging = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          if (dx < 0 && currentPage < totalPages - 1) goTo(currentPage + 1);
          else if (dx > 0 && currentPage > 0) goTo(currentPage - 1);
        }
      }, { passive: true });
    }

    frag.appendChild(gameGrid);
  }

  // ── Gift Card Section (tabs by category + logo grid) ─────
  const giftcardCatsAll = categories.filter(c => c.product_type === 'giftcard' && c.is_active);
  // Pre-check which categories actually have products; hide whole section if none
  let giftcardCats = [];
  const gcProductCache = {};
  if (giftcardCatsAll.length) {
    const checks = await Promise.all(giftcardCatsAll.map(async (cat) => {
      try {
        const data = await apiFetch(`/products/?category_slug=${cat.slug}&limit=30`);
        const items = data.items || data || [];
        if (items.length) { gcProductCache[cat.slug] = items; return cat; }
      } catch(_) {}
      return null;
    }));
    giftcardCats = checks.filter(Boolean);
  }
  if (giftcardCats.length) {
    const gcSection = el('div', 'gc-section mt-32');

    // Header
    const gcHead = el('div', 'section-head');
    gcHead.innerHTML = `<div class="section-title mb-0"><i class="fa-solid fa-gift"></i> Gift Card</div>`;
    gcSection.appendChild(gcHead);

    // Tabs (one per giftcard category)
    const gcTabs = el('div', 'gc-tabs');
    giftcardCats.forEach((cat, i) => {
      const tab = el('button', 'gc-tab' + (i === 0 ? ' active' : ''));
      tab.dataset.gcCat = cat.slug;
      tab.textContent = cat.name;
      gcTabs.appendChild(tab);
    });
    gcSection.appendChild(gcTabs);

    // Grid container
    const gcGrid = el('div', 'gc-grid');
    gcGrid.innerHTML = '<div class="gc-grid-loading"><div class="spinner"></div></div>';
    gcSection.appendChild(gcGrid);

    // Load products for a category
    const loadGcCat = async (slug) => {
      gcGrid.innerHTML = '<div class="gc-grid-loading"><div class="spinner"></div></div>';
      try {
        let items = gcProductCache[slug];
        if (!items) {
          const data = await apiFetch(`/products/?category_slug=${slug}&limit=30`);
          items = data.items || data || [];
          gcProductCache[slug] = items;
        }
        if (!items.length) {
          gcGrid.innerHTML = '<div class="text-muted text-center" style="padding:32px 0;grid-column:1/-1">Chưa có sản phẩm</div>';
          return;
        }
        gcGrid.innerHTML = '';
        items.forEach(p => {
          const card = el('div', 'gc-card');
          card.onclick = () => navigateTo(`/product/${p.slug}`);
          if (p.image_url) {
            card.innerHTML = `<img src="${p.image_url}" alt="${esc(p.name)}" loading="lazy" decoding="async" />`;
          } else {
            card.innerHTML = `<div class="gc-card-name">${esc(p.name)}</div>`;
          }
          gcGrid.appendChild(card);
        });
        sfAnimateGcGrid(gcGrid);
      } catch(e) {
        gcGrid.innerHTML = '<div class="text-muted text-center" style="padding:32px 0;grid-column:1/-1">Lỗi tải dữ liệu</div>';
      }
    };

    // Tab click handler
    gcTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.gc-tab');
      if (!tab) return;
      gcTabs.querySelectorAll('.gc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadGcCat(tab.dataset.gcCat);
    });

    // Load first tab
    if (giftcardCats[0]) loadGcCat(giftcardCats[0].slug);

    frag.appendChild(gcSection);
  }

  // ── SMM Panel: "Tăng tương tác" (above wishlist) ──────────
  if (appSettings.features?.smm !== false) {
    try {
      const smmCatalog = await apiFetch('/smm/catalog');
      const platforms = Array.isArray(smmCatalog) ? smmCatalog : [];
      if (platforms.length) {
        const smmHead = el('div', 'section-head mt-32');
        smmHead.innerHTML = `
          <div class="section-title mb-0">
            <i class="fa-solid fa-share-nodes" style="color:#3b82f6"></i> Tăng tương tác
          </div>
          <a href="/smm/order" class="btn btn-primary btn-sm" style="font-weight:600;">
            Đặt đơn <i class="fa-solid fa-arrow-right"></i>
          </a>`;
        frag.appendChild(smmHead);

        const smmDesc = el('div', 'smm-home-desc');
        smmDesc.textContent = 'Tăng like, follow, view, comment cho mọi nền tảng mạng xã hội — giá rẻ, giao nhanh.';
        frag.appendChild(smmDesc);

        const smmGrid = el('div', 'smm-home-grid');
        platforms.forEach(p => {
          const totalServices = (p.categories || []).reduce((n, c) => n + (c.services?.length || 0), 0);
          const card = el('a', 'smm-home-card');
          card.href = `/smm/order?platform=${encodeURIComponent(p.slug || '')}`;
          card.onclick = (e) => {
            e.preventDefault();
            navigateTo(`/smm/order?platform=${encodeURIComponent(p.slug || '')}`);
          };
          card.title = `${p.name} — ${totalServices} dịch vụ`;
          card.setAttribute('aria-label', p.name);
          const iconHTML = p.icon_url
            ? `<img src="${esc(p.icon_url)}" alt="${esc(p.name)}" />`
            : `<i class="fa-solid fa-share-nodes"></i>`;
          const catCount = (p.categories || []).length;
          card.innerHTML = `
            <div class="smm-home-card-icon">${iconHTML}</div>
            <div class="smm-home-card-body">
              <div class="smm-home-card-name">${esc(p.name)}</div>
              <div class="smm-home-card-meta">${catCount} danh mục</div>
            </div>
          `;
          smmGrid.appendChild(card);
        });
        frag.appendChild(smmGrid);
      }
    } catch (_) {}
  }

  // ── Wishlist / Favorites on Home ──────────────────────────
  if (currentUser && appSettings.features?.wishlist !== false) {
    try {
      const wlData = await apiFetch('/wishlist/?limit=6');
      const wlHead = el('div', 'section-head mt-32');
      wlHead.innerHTML = `<div class="section-title mb-0"><i class="fa-solid fa-heart" style="color:#ef4444"></i> Sản phẩm yêu thích</div><a href="/wishlist" class="btn btn-primary btn-sm" style="font-weight: 600;">Xem tất cả <i class="fa-solid fa-arrow-right"></i></a>`;
      frag.appendChild(wlHead);
      if (wlData.items?.length) {
        const wlScroll = el('div', 'home-wl-scroll');
        wlData.items.forEach(p => wlScroll.appendChild(productCard(p)));
        frag.appendChild(wlScroll);
      } else {
        const emptyWl = el('div', 'wishlist-empty-hint');
        emptyWl.innerHTML = `<i class="fa-regular fa-heart"></i><p>Nhấn <i class="fa-solid fa-heart" style="color:#ef4444"></i> trên sản phẩm để thêm vào danh sách yêu thích</p>`;
        frag.appendChild(emptyWl);
      }
    } catch (_) {}
  }

  // ── Single DOM write ─────────────────────────────────────
  view.appendChild(frag);

  // ── Anime.js entrance effects ──
  sfAnimate(view);
}

async function renderCategory(view, { slug }) {
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const [cat, data] = await Promise.all([apiFetch(`/categories/${slug}`), apiFetch(`/products/?category_slug=${slug}&limit=40`)]);
    view.innerHTML = '';
    const heroHead = el('div', 'products-hero');
    heroHead.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>${cat.name}</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-folder-open"></i> ${cat.name}</h1>
      <p class="products-hero-desc">${data.total} sản phẩm trong danh mục này</p>
    `;
    view.appendChild(heroHead);
    if (!data.items.length) {
      view.appendChild(el('div', 'empty-state', '<div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div><h3>Danh mục này chưa có sản phẩm</h3>'));
    } else {
      const grid = el('div', 'product-grid');
      data.items.forEach(p => grid.appendChild(productCard(p)));
      view.appendChild(grid);
      sfAnimate(view);
    }
  } catch (e) { view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>${e.message}</h3></div>`; }
}



async function renderAllProducts(view) {
  view.innerHTML = '';

  // Parse URL params
  const params = new URLSearchParams(location.search || '');
  const initQ = params.get('q') || '';
  const initCat = params.get('cat') || '';
  const initSub = params.get('sub') || '';

  // Hero header
  const heroHead = el('div', 'products-hero');
  heroHead.innerHTML = `
    <div class="breadcrumb mb-8" id="ph-bc"><a href="/">Trang chủ</a> <span>›</span> <strong>Sản phẩm</strong></div>
    <h1 class="products-hero-title" id="ph-title">${ico.shield} Tất cả sản phẩm</h1>
    <p class="products-hero-desc" id="ph-desc">Khám phá bộ sưu tập sản phẩm chất lượng cao được chọn lọc dành riêng cho bạn</p>
  `;
  view.appendChild(heroHead);

  // Filter card
  const filterCard = el('div', 'filter-card');
  // Build parent category options
  let catOptions = '<option value="">Tất cả</option>';
  categories.forEach(c => { catOptions += `<option value="${c.slug}" ${c.slug === initCat ? 'selected' : ''}>${c.name}</option>`; });

  // Build subcategory options (dynamic)
  let subOptions = '<option value="">Tất cả</option>';
  if (initCat) {
    const parent = categories.find(c => c.slug === initCat);
    if (parent?.children?.length) {
      parent.children.forEach(s => { subOptions += `<option value="${s.slug}" ${s.slug === initSub ? 'selected' : ''}>${s.name}</option>`; });
    }
  }

  filterCard.innerHTML = `
    <div class="filter-row">
      <div class="filter-group">
        <label class="filter-label">DANH MỤC</label>
        <select class="form-select" id="f-category">${catOptions}</select>
      </div>
      <div class="filter-group">
        <label class="filter-label">THỂ LOẠI</label>
        <select class="form-select" id="f-subcategory">${subOptions}</select>
      </div>
    </div>
    <div class="filter-row">
      <div class="filter-group">
        <label class="filter-label">MỨC GIÁ</label>
        <div class="filter-price-range">
          <input type="number" class="form-input" id="f-price-min" placeholder="Mức giá từ" />
          <span class="filter-price-sep">–</span>
          <input type="number" class="form-input" id="f-price-max" placeholder="Mức giá đến" />
        </div>
      </div>
    </div>
    <div class="filter-row">
      <div class="filter-group">
        <label class="filter-label">TÌM KIẾM</label>
        <input type="text" class="form-input" id="f-search" placeholder="Tên sản phẩm..." value="${initQ}" />
      </div>
      <div class="filter-group">
        <label class="filter-label">SẮP XẾP</label>
        <select class="form-select" id="f-sort">
          <option value="">Mặc định</option>
          <option value="price_asc">Giá thấp → cao</option>
          <option value="price_desc">Giá cao → thấp</option>
          <option value="newest">Mới nhất</option>
          <option value="name">Tên A → Z</option>
        </select>
      </div>
    </div>
    <div class="filter-actions">
      <button class="btn btn-primary" id="f-apply">${ico.shield} Lọc</button>
      <button class="btn btn-ghost" id="f-reset">${ico.arrowLeft} Đặt lại</button>
    </div>
  `;
  view.appendChild(filterCard);

  // Results area
  const resultsInfo = el('div', 'results-info');
  const resultsGrid = el('div', 'product-grid');
  const pagination = el('div', 'pagination');
  view.appendChild(resultsInfo);
  view.appendChild(resultsGrid);
  view.appendChild(pagination);

  let currentPage = 1;

  // Dynamic subcategory update when parent changes
  qs('#f-category', filterCard).addEventListener('change', () => {
    const slug = qs('#f-category', filterCard).value;
    const subEl = qs('#f-subcategory', filterCard);
    let opts = '<option value="">Tất cả</option>';
    if (slug) {
      const parent = categories.find(c => c.slug === slug);
      if (parent?.children?.length) {
        parent.children.forEach(s => { opts += `<option value="${s.slug}">${s.name}</option>`; });
      }
    }
    subEl.innerHTML = opts;
  });

  // Fetch & render
  const doFilter = async (page = 1) => {
    currentPage = page;
    const catSlug = qs('#f-category', filterCard).value;
    const subSlug = qs('#f-subcategory', filterCard).value;
    const search = qs('#f-search', filterCard).value.trim();
    const priceMin = qs('#f-price-min', filterCard).value;
    const priceMax = qs('#f-price-max', filterCard).value;
    const sortBy = qs('#f-sort', filterCard).value;

    // Update Hero Title
    let pageTitle = 'Tất cả sản phẩm';
    let pageDesc = 'Khám phá bộ sưu tập sản phẩm chất lượng cao được chọn lọc dành riêng cho bạn';
    let bcHtml = `<a href="/">Trang chủ</a> <span>›</span> <strong>Sản phẩm</strong>`;

    if (catSlug) {
      const c = categories.find(x => x.slug === catSlug);
      if (c) {
        pageTitle = c.name;
        pageDesc = `Khám phá các sản phẩm thuộc danh mục ${c.name}`;
        bcHtml = `<a href="/">Trang chủ</a> <span>›</span> <a href="/all">Sản phẩm</a> <span>›</span> <strong>${c.name}</strong>`;
        if (subSlug) {
          const s = c.children?.find(x => x.slug === subSlug);
          if (s) {
            pageTitle = s.name;
            pageDesc = `Khám phá các sản phẩm thuộc thể loại ${s.name}`;
            bcHtml = `<a href="/">Trang chủ</a> <span>›</span> <a href="/all">Sản phẩm</a> <span>›</span> <a href="/all?cat=${c.slug}">${c.name}</a> <span>›</span> <strong>${s.name}</strong>`;
          }
        }
      }
    }
    const titleEl = qs('#ph-title', heroHead);
    const descEl = qs('#ph-desc', heroHead);
    const bcEl = qs('#ph-bc', heroHead);
    if (titleEl) titleEl.innerHTML = `${ico.shield} ${pageTitle}`;
    if (descEl) descEl.innerHTML = pageDesc;
    if (bcEl) bcEl.innerHTML = bcHtml;

    let qs_parts = [`page=${page}`, `limit=20`];
    const filterSlug = subSlug || catSlug;
    if (filterSlug) qs_parts.push(`category_slug=${encodeURIComponent(filterSlug)}`);
    if (search) qs_parts.push(`search=${encodeURIComponent(search)}`);
    if (priceMin) qs_parts.push(`price_min=${priceMin}`);
    if (priceMax) qs_parts.push(`price_max=${priceMax}`);
    if (sortBy) qs_parts.push(`sort_by=${sortBy}`);

    resultsGrid.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    resultsInfo.innerHTML = '';
    pagination.innerHTML = '';

    try {
      const data = await apiFetch(`/products/?${qs_parts.join('&')}`);
      resultsInfo.innerHTML = `<span class="results-count"><strong>${data.total}</strong> sản phẩm</span>`;
      resultsGrid.innerHTML = '';
      if (!data.items.length) {
        resultsGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${ico.inbox}<h3>Không tìm thấy sản phẩm</h3></div>`;
      } else {
        data.items.forEach(p => resultsGrid.appendChild(productCard(p)));
      }
      // Pagination
      const totalPages = Math.ceil(data.total / data.limit);
      if (totalPages > 1) {
        let pHtml = '';
        for (let i = 1; i <= totalPages; i++) {
          pHtml += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        pagination.innerHTML = pHtml;
        qsa('.page-btn', pagination).forEach(btn => {
          btn.onclick = () => doFilter(+btn.dataset.page);
        });
      }
    } catch (e) {
      resultsGrid.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  };

  qs('#f-apply', filterCard).onclick = () => doFilter(1);
  qs('#f-reset', filterCard).onclick = () => {
    qs('#f-category', filterCard).value = '';
    qs('#f-subcategory', filterCard).innerHTML = '<option value="">Tất cả</option>';
    qs('#f-search', filterCard).value = '';
    qs('#f-price-min', filterCard).value = '';
    qs('#f-price-max', filterCard).value = '';
    qs('#f-sort', filterCard).value = '';
    doFilter(1);
  };
  // Enter key in search
  qs('#f-search', filterCard).addEventListener('keypress', e => { if (e.key === 'Enter') doFilter(1); });

  // Initial load
  await doFilter(1);
}

function productListCard(p) {
  const card = el('div', 'product-list-card');
  const imgHtml = p.image_url
    ? `<img class="product-list-img" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" decoding="async" />`
    : `<div class="product-list-img-placeholder"><i class="fa-solid fa-box-open"></i></div>`;
  const priceHtml = p.min_price
    ? (p.max_price && p.max_price > p.min_price
      ? `${fmt(p.min_price)} ~ ${fmt(p.max_price)}`
      : fmt(p.min_price))
    : '<span class="price-contact">Liên hệ</span>';

  // Delivery tag from first package
  let tagHtml = '';
  if (p.packages?.length) {
    const pkg = p.packages[0];
    if (pkg.delivery_type === 'auto') {
      tagHtml = `<span class="plist-tag plist-tag-auto"><i class="fa-solid fa-bolt"></i> Tự động</span>`;
    } else {
      tagHtml = `<span class="plist-tag plist-tag-manual"><i class="fa-solid fa-hand-holding-heart"></i> Thủ công</span>`;
    }
  }

  // Real rating
  const rating = p.avg_rating || 0;
  const reviewCount = p.review_count || 0;
  const stars = [1,2,3,4,5].map(i =>
    `<i class="fa-star ${i <= Math.round(rating) ? 'fa-solid filled' : 'fa-regular'}"></i>`
  ).join('');
  const ratingText = reviewCount > 0 ? `<span class="plist-rating-count">(${reviewCount})</span>` : '';

  const soldCount = p.sold_count || 0;
  const soldHtml = soldCount > 0 ? `<span class="plist-sold"><i class="fa-solid fa-bag-shopping"></i> Đã bán ${soldCount}</span>` : '';

  card.innerHTML = `
    ${imgHtml}
    <div class="product-list-info">
      <div class="product-list-name">${esc(p.name)}</div>
      <div class="product-list-price">${priceHtml}</div>
      <div class="product-list-tags">${tagHtml}${soldHtml}</div>
      <div class="product-list-stars">${stars} ${ratingText}</div>
    </div>
  `;
  card.onclick = () => { navigateTo(`/product/${p.slug}`); };
  return card;
}

function productCard(p) {
  // ── Gift Card product: portrait card style ──
  if (p.product_type === 'giftcard') {
    const card = el('div', 'gc-card');
    card.onclick = () => navigateTo(`/product/${p.slug}`);
    card.innerHTML = `
      ${p.image_url ? `<img src="${p.image_url}" alt="${esc(p.name)}" loading="lazy" />` : `<div class="gc-card-ph"><i class="fa-solid fa-gift"></i><span>${esc(p.name)}</span></div>`}
    `;
    return card;
  }
  // ── Game product: use home game card style ──
  if (p.product_type === 'game') {
    const card = el('div', 'home-game-card');
    card.onclick = () => navigateTo(`/product/${p.slug}`);
    card.innerHTML = `
      <div class="hgc-img">${p.image_url ? `<img src="${p.image_url}" alt="${esc(p.name)}" loading="lazy" />` : `<div class="hgc-img-ph"><i class="fa-solid fa-gamepad"></i></div>`}
        ${p.topup_type ? `<span class="hgc-tag hgc-tag-topup">${p.topup_type === 'uid' ? '<i class="fa-solid fa-id-badge"></i> UID' : '<i class="fa-solid fa-right-to-bracket"></i> Login'}</span>` : ''}
        ${p.server_region ? `<span class="hgc-tag hgc-tag-server">${p.server_region === 'vietnam' ? '🇻🇳 VN' : '🌐 Global'}</span>` : ''}
      </div>
      <div class="hgc-body">
        <div class="hgc-name">${esc(p.name)}</div>
        <div class="hgc-meta">
          <span class="hgc-rating"><i class="fa-solid fa-star"></i> ${p.review_avg ? p.review_avg.toFixed(1) : '0'}</span>
          ${p.sold_count > 0 ? `<span class="hgc-sold">${p.sold_count > 1000 ? (p.sold_count / 1000).toFixed(1) + 'K' : p.sold_count} Sold</span>` : ''}
        </div>
      </div>
    `;
    return card;
  }

  // ── Premium product: standard card ──
  const card = el('div', 'product-card');
  const imgHtml = p.image_url
    ? `<img class="product-card-img" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" decoding="async" />`
    : `<div class="product-card-img-placeholder"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>`;

  // Delivery tag
  let tagHtml = '';
  if (p.packages?.length) {
    const pkg = p.packages[0];
    tagHtml = pkg.delivery_type === 'api'
      ? `<span class="pcard-tag pcard-tag-auto"><i class="fa-solid fa-plug"></i> API</span>`
      : pkg.delivery_type === 'auto'
      ? `<span class="pcard-tag pcard-tag-auto"><i class="fa-solid fa-bolt"></i> Tự động</span>`
      : `<span class="pcard-tag pcard-tag-manual"><i class="fa-solid fa-hand-holding-heart"></i> Thủ công</span>`;
  }
  // Game tags on card
  let gameTagsHtml = '';
  if (p.product_type === 'game') {
    const tags = [];
    if (p.topup_type) tags.push(`<span class="pcard-game-tag">${p.topup_type === 'uid' ? 'UID' : 'Login'}</span>`);
    if (p.server_region) tags.push(`<span class="pcard-game-tag">${p.server_region === 'vietnam' ? 'VN' : 'Global'}</span>`);
    if (tags.length) gameTagsHtml = `<div class="pcard-game-tags">${tags.join('')}</div>`;
  } else if (p.product_type === 'giftcard') {
    gameTagsHtml = `<div class="pcard-game-tags"><span class="pcard-game-tag"><i class="fa-solid fa-gift"></i> Gift Card</span></div>`;
  }

  // Rating & sold
  const rating = p.avg_rating || 0;
  const reviewCount = p.review_count || 0;
  const soldCount = p.sold_count || 0;
  const stars = [1,2,3,4,5].map(i =>
    `<i class="fa-star ${i <= Math.round(rating) ? 'fa-solid filled' : 'fa-regular'}"></i>`
  ).join('');

  let metaItems = [];
  if (reviewCount > 0) metaItems.push(`<span class="pcard-meta-item"><i class="fa-solid fa-star filled"></i> ${rating}</span>`);
  if (soldCount > 0) metaItems.push(`<span class="pcard-meta-item"><i class="fa-solid fa-bag-shopping"></i> Đã bán ${soldCount}</span>`);

  card.innerHTML = `
    <div class="pcard-img-wrap">
      ${imgHtml}
      ${tagHtml}
    </div>
    <div class="product-card-body">
      <div class="product-card-name">${esc(p.name)}</div>
      ${gameTagsHtml}
      <div class="product-card-price">${p.min_price ? (p.max_price && p.max_price > p.min_price ? fmt(p.min_price) + ' ~ ' + fmt(p.max_price) : fmt(p.min_price)) : '<span class="price-contact">Liên hệ</span>'}</div>
      ${metaItems.length ? `<div class="pcard-meta">${metaItems.join('<span class="pcard-meta-sep">·</span>')}</div>` : ''}
    </div>
  `;
  card.onclick = () => { navigateTo(`/product/${p.slug}`); };
  return card;
}

// PRODUCT DETAIL
async function renderProduct(view, { slug }) {
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const p = await apiFetch(`/products/${slug}`);
    let selectedPkg = p.packages?.[0] || null;
    let quantity = 1;
    let appliedCoupon = null;

    let reviewPage = 1;
    let reviewData = null;

    // ── Helpers ──
    const isOutOfStock = (pkg) => {
      if (pkg.delivery_type === 'api') return false; // API stock managed by source
      if (pkg.delivery_type === 'auto') return pkg.stock_count < 1;
      if (pkg.is_stock_managed) return pkg.stock_quantity < 1;
      return false;
    };
    const getStockBadge = (pkg) => {
      if (pkg.delivery_type === 'api') return `<span class="pd-badge pd-badge-green"><i class="fa-solid fa-bolt"></i> Tự động qua API</span>`;
      if (pkg.delivery_type === 'auto') {
        return pkg.stock_count > 0
          ? `<span class="pd-badge pd-badge-green">Còn hàng (${pkg.stock_count})</span>`
          : `<span class="pd-badge pd-badge-red">Hết hàng</span>`;
      }
      if (pkg.is_stock_managed) {
        const qty = pkg.stock_quantity || 0;
        if (qty <= 0) return `<span class="pd-badge pd-badge-red">Hết hàng</span>`;
        if (qty <= 5) return `<span class="pd-badge pd-badge-orange">Sắp hết (${qty})</span>`;
        return `<span class="pd-badge pd-badge-green">Còn hàng (${qty})</span>`;
      }
      return `<span class="pd-badge pd-badge-blue">Giao thủ công</span>`;
    };
    const getDisplayPrice = (pkg) => pkg.flash_sale ? pkg.flash_sale.sale_price : pkg.price;
    const getStrikePrice = (pkg) => pkg.flash_sale ? pkg.price : pkg.original_price;
    const starsHtml = (rating, size = 16) => {
      let h = '';
      for (let i = 1; i <= 5; i++) {
        h += i <= Math.round(rating)
          ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="var(--amber)" stroke="var(--amber)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
          : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      return h;
    };

    // ── Load reviews ──
    const loadReviews = async (page = 1) => {
      try {
        reviewData = await apiFetch(`/reviews/product/${p.id}?page=${page}&limit=3`);
        reviewPage = page;
      } catch { reviewData = null; }
    };
    await loadReviews(1);

    // ── Timers cleanup ──
    const intervals = [];
    const cleanupTimers = () => intervals.forEach(id => clearInterval(id));
    const timerObs = new MutationObserver(() => {
      if (!document.contains(view)) { cleanupTimers(); timerObs.disconnect(); }
    });
    timerObs.observe(document.body, { childList: true, subtree: true });

    // ── Main render ──
    const render = () => {
      view.innerHTML = '';
      cleanupTimers();

      // Breadcrumb
      let bcCatHref = '';
      let bcParentHtml = '';
      if (p.category_slug) {
        const pCat = categories.find(c => c.children?.some(s => s.slug === p.category_slug || s.id === p.category_id));
        if (pCat) {
          bcParentHtml = `<a href="/all?cat=${pCat.slug}">${esc(pCat.name)}</a> <span>›</span> `;
          bcCatHref = `/all?cat=${pCat.slug}&sub=${p.category_slug || p.category_id}`;
        } else {
          bcCatHref = `/all?cat=${p.category_slug || p.category_id}`;
        }
      }
      // ── Top section: stacked layout ──
      const topSection = el('div', 'pd-top-section' + (p.product_type === 'game' ? ' pd-top-game' : '') + (p.product_type === 'giftcard' ? ' pd-top-gc' : ''));

      // Breadcrumb inside top section
      topSection.appendChild(el('div', 'breadcrumb', `<a href="/">Trang chủ</a> <span>›</span> ${bcParentHtml}${p.category_name ? `<a href="${bcCatHref}">${esc(p.category_name)}</a> <span>›</span> ` : ''}${esc(p.name)}`));

      const isGame = p.product_type === 'game' || p.product_type === 'giftcard';
      const isGiftcard = p.product_type === 'giftcard';

      if (isGiftcard) {
        // ── Gift Card: big product name ──
        const gcHeader = el('div', 'pd-gc-header');
        gcHeader.innerHTML = `<h1 class="pd-gc-name">${esc(p.name)}</h1>`;
        topSection.appendChild(gcHeader);
      } else if (isGame) {
        // ── Game: compact horizontal header ──
        const gameHeader = el('div', 'pd-game-header');
        const gameImg = el('div', isGiftcard ? 'pd-game-thumb pd-game-thumb--gc' : 'pd-game-thumb');
        if (p.image_url) {
          gameImg.innerHTML = `<img src="${p.image_url}" alt="${p.name}" />`;
        } else {
          gameImg.innerHTML = `<div class="pd-game-thumb-ph"><i class="fa-solid ${isGiftcard ? 'fa-gift' : 'fa-gamepad'}"></i></div>`;
        }
        const gameInfo = el('div', 'pd-game-info');
        const siteName = window.appSettings?.site_name || window.appSettings?.title || 'Store';
        const uppercaseLetters = (siteName.match(/[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-Ỵ]/g) || []).join('');
        const siteInitials = (uppercaseLetters || siteName.split(/\s+/).filter(Boolean).map(w => w[0]).join('')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '') || 's';
        const productCode = `${siteInitials}${String(p.id || '').padStart(4, '0')}`;
        gameInfo.innerHTML = `
          <span class="pd-game-tag pd-tag-topup-badge">${isGiftcard ? '<i class="fa-solid fa-gift"></i> GIFT CARD' : '<i class="fa-solid fa-gamepad"></i> TOP UP'}</span>
          <div class="pd-game-name-row">
            <h1 class="pd-game-name">${p.name}</h1>
            <span class="pd-game-rating-compact"><i class="fa-solid fa-star"></i> ${p.review_avg ? p.review_avg.toFixed(1) : '0'}</span>
          </div>
          <div class="pd-game-sub">
            <span class="pd-game-code"><span class="pd-code-row"><i class="fa-solid fa-barcode"></i> Mã SP: <span>${productCode}</span></span></span>
            ${!isGiftcard && p.topup_type ? `<span class="pd-game-tag pd-tag-topup">${p.topup_type === 'uid' ? '<i class="fa-solid fa-id-badge"></i> UID' : '<i class="fa-solid fa-right-to-bracket"></i> Login'}</span>` : ''}
            ${!isGiftcard && p.server_region ? `<span class="pd-game-tag pd-tag-server">${p.server_region === 'vietnam' ? '🇻🇳 Việt Nam' : '🌐 Quốc tế'}</span>` : ''}
          </div>
          <div class="pd-game-meta">
          </div>
        `;
        gameHeader.appendChild(gameImg);
        gameHeader.appendChild(gameInfo);
        topSection.appendChild(gameHeader);
      } else {
      // ── Premium: full stacked layout ──

      // Image with overlay badges
      const imgWrap = el('div', 'pd-hero-img');
      if (p.image_url) {
        imgWrap.innerHTML = `<img src="${p.image_url}" alt="${p.name}" loading="lazy" decoding="async" />`;
      } else {
        imgWrap.innerHTML = `<div class="pd-top-img-ph">${ico.box}</div>`;
      }
      // Discount badge overlay
      const maxDiscount = Math.max(0, ...(p.packages || []).map(pkg => {
        const op = pkg.flash_sale ? pkg.price : pkg.original_price;
        const cp = pkg.flash_sale ? pkg.flash_sale.sale_price : pkg.price;
        return (op && op > cp) ? Math.round((1 - cp / op) * 100) : 0;
      }));
      if (maxDiscount > 0) {
        imgWrap.innerHTML += `<span class="pd-hero-discount">GIẢM ĐẾN ${maxDiscount}%</span>`;
      }
      topSection.appendChild(imgWrap);

      // Product name + action icons (share & wishlist)
      const nameRow = el('div', 'pd-name-row');
      const siteName = window.appSettings?.site_name || window.appSettings?.title || 'Store';
      const uppercaseLetters = (siteName.match(/[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-Ỵ]/g) || []).join('');
      const siteInitials = (uppercaseLetters || siteName
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .join(''))
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '') || 's';
      const productCode = `${siteInitials}${String(p.id || '').padStart(4, '0')}`;
      nameRow.innerHTML = `
        <div class="pd-title-block">
          <h1 class="pd-name">${p.name}</h1>
          <div class="pd-product-code"><i class="fa-solid fa-barcode"></i> Mã sản phẩm: <span>${productCode}</span></div>
        </div>
        <div class="pd-name-actions">
          ${currentUser && appSettings.features?.affiliate !== false ? `<button class="pd-action-icon pd-share-icon" id="pd-share-btn" title="Chia sẻ kiếm tiền"><i class="fa-solid fa-hand-holding-dollar"></i><span class="pd-action-badge" id="pd-share-badge" style="display:none"></span></button>` : ''}
          ${appSettings.features?.wishlist !== false ? `<button class="pd-action-icon pd-heart-icon ${currentUser && window._wishlistIds?.has(p.id) ? 'active' : ''} ${currentUser ? '' : 'disabled'}" id="pd-heart-btn" title="${currentUser ? 'Yêu thích' : 'Đăng nhập để yêu thích'}"><i class="fa-${currentUser && window._wishlistIds?.has(p.id) ? 'solid' : 'regular'} fa-heart"></i></button>` : ''}
        </div>
      `;
      topSection.appendChild(nameRow);
      } // end premium branch

      // Wire share button
      const shareBtn = qs('#pd-share-btn', topSection);
      if (shareBtn) {
        // Load commission rate for badge
        apiFetch('/affiliate/me').then(aff => {
          if (aff.registered || aff.commission_rate) {
            const badge = qs('#pd-share-badge', topSection);
            if (badge) { badge.textContent = `${aff.commission_rate || 5}%`; badge.style.display = ''; }
          }
        }).catch(() => {});

        shareBtn.onclick = async () => {
          try {
            let aff = await apiFetch('/affiliate/me');
            if (!aff.registered) {
              aff = await apiFetch('/affiliate/register', { method: 'POST' });
              aff.registered = true;
              aff.commission_rate = aff.commission_rate || 5;
            }
            const rate = aff.commission_rate || 5;
            const refCode = aff.ref_code;
            const siteBase = location.origin;
            const shareTitle = `${p.name} | ${window.appSettings?.site_name || ''}`;
            const shareDesc = (p.description || p.notes || window.appSettings?.site_description || 'Xem ngay sản phẩm này').replace(/<[^>]*>/g, ' ').trim().slice(0, 180);
            const shareImage = withImageFallback(p.image_url || p.category_icon || window.appSettings?.logo_url || window.appSettings?.site_logo);
            const refLink = `${siteBase}/product/${p.slug}?ref=${refCode}`;
            const shareLanding = refLink;
            const shareText = encodeURIComponent(`${shareTitle} - ${shareDesc}`);
            const shareUrl = encodeURIComponent(shareLanding);

            const setShareMeta = () => {
              const setMeta = (selector, attr, value) => {
                const node = document.querySelector(selector);
                if (node && value) node.setAttribute(attr, value);
              };
              setMeta('meta[property="og:title"]', 'content', shareTitle);
              setMeta('meta[property="og:description"]', 'content', shareDesc);
              setMeta('meta[property="og:url"]', 'content', refLink);
              setMeta('meta[property="og:image"]', 'content', shareImage);
              setMeta('meta[name="twitter:title"]', 'content', shareTitle);
              setMeta('meta[name="twitter:description"]', 'content', shareDesc);
              setMeta('meta[name="twitter:image"]', 'content', shareImage);
            };
            setShareMeta();

            let pkgCommHtml = '';
            if (p.packages?.length) {
              pkgCommHtml = p.packages.map(pkg => {
                const price = pkg.flash_sale ? pkg.flash_sale.sale_price : pkg.price;
                const comm = Math.round(price * rate / 100);
                const name = pkg.name.length > 22 ? pkg.name.slice(0, 22) + '…' : pkg.name;
                return `<div class="share-comm-row"><span class="share-comm-name">${name}</span><span class="share-comm-price">${fmt(price)}</span><span class="share-comm-arrow">→</span><span class="share-comm-value">+${fmt(comm)}</span></div>`;
              }).join('');
            }

            openModal(`
              <div class="share-modal">
                <div class="share-hero">
                  <button class="share-close-btn" onclick="closeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  <div class="share-hero-glow"></div>
                  <div class="share-hero-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
                  <div class="share-hero-rate">${rate}%</div>
                  <div class="share-hero-label">hoa hồng mỗi đơn hàng</div>
                </div>

                <div class="share-body">
                  <div class="share-link-box">
                    <input type="text" class="share-link-input" id="share-ref-link" value="${refLink}" readonly />
                    <button class="share-copy-btn" id="share-copy-btn"><i class="fa-regular fa-copy"></i> Sao chép</button>
                  </div>

                  <div class="share-share-preview">
                    <div class="share-share-preview-thumb">${shareImage ? `<img src="${shareImage}" alt="${p.name}" onerror="${onImgFallback()}" />` : '<i class="fa-solid fa-image"></i>'}</div>
                    <div class="share-share-preview-meta">
                      <div class="share-share-preview-site">${window.appSettings?.site_name || ''}</div>
                      <div class="share-share-preview-title">${shareTitle}</div>
                      <div class="share-share-preview-desc">${shareDesc}</div>
                    </div>
                  </div>

                  <div class="share-socials">
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="share-social-item share-s-fb"><i class="fa-brands fa-facebook-f"></i><span>Facebook</span></a>
                    <a href="https://zalo.me/share?url=${shareUrl}" target="_blank" class="share-social-item share-s-zalo"><span class="share-zalo-z">Z</span><span>Zalo</span></a>
                    <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="share-social-item share-s-tg"><i class="fa-brands fa-telegram"></i><span>Telegram</span></a>
                    <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank" class="share-social-item share-s-x"><i class="fa-brands fa-x-twitter"></i><span>X</span></a>
                    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" class="share-social-item share-s-wa"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>
                    <a href="https://www.facebook.com/dialog/send?link=${shareUrl}&app_id=0&redirect_uri=${shareUrl}" target="_blank" class="share-social-item share-s-msg"><i class="fa-brands fa-facebook-messenger"></i><span>Messenger</span></a>
                  </div>

                  ${pkgCommHtml ? `
                  <details class="share-comm-details">
                    <summary class="share-comm-summary"><i class="fa-solid fa-calculator"></i> Xem hoa hồng dự kiến <i class="fa-solid fa-chevron-down share-chev"></i></summary>
                    <div class="share-comm-list">${pkgCommHtml}</div>
                  </details>` : ''}

                  <a href="/affiliate" class="share-stats-link" onclick="closeModal()"><i class="fa-solid fa-chart-line"></i> Xem thống kê hoa hồng</a>
                </div>
              </div>
            `);
            qs('#share-copy-btn').onclick = () => {
              navigator.clipboard.writeText(refLink).then(() => toast('Đã sao chép link', 'success')).catch(() => { qs('#share-ref-link').select(); document.execCommand('copy'); toast('Đã sao chép link', 'success'); });
            };
          } catch (err) { toast(err.message || 'Lỗi', 'error'); }
        };
      }

      // Wire heart/wishlist button
      const heartBtn = qs('#pd-heart-btn', topSection);
      if (heartBtn) {
        heartBtn.onclick = async () => {
          if (!currentUser) { toast('Đăng nhập để yêu thích', 'error'); return navigateTo('/login'); }
          try {
            const res = await apiFetch(`/wishlist/toggle/${p.id}`, { method: 'POST' });
            const icon = heartBtn.querySelector('i');
            if (res.wishlisted) {
              icon.className = 'fa-solid fa-heart';
              heartBtn.classList.add('active');
              window._wishlistIds?.add(p.id);
              toast('Đã thêm vào yêu thích', 'success');
            } else {
              icon.className = 'fa-regular fa-heart';
              heartBtn.classList.remove('active');
              window._wishlistIds?.delete(p.id);
              toast('Đã bỏ yêu thích', 'info');
            }
          } catch (err) { toast(err.message || 'Lỗi', 'error'); }
        };
        // Set initial active state
        if (currentUser && window._wishlistIds?.has(p.id)) heartBtn.classList.add('active');
      }

      // Rating + category + sold — single row (premium only, game has it in header)
      if (!isGame) {
      // Rating row
      const ratingRow = el('div', 'pd-rating-row');
      ratingRow.innerHTML = `
        <span class="pd-rating-stars">${starsHtml(p.review_avg || 0)}</span>
        <span class="pd-rating-avg">${p.review_avg ? p.review_avg.toFixed(1) : '—'}</span>
        <span class="pd-rating-count">(${p.review_count || 0} đánh giá)</span>
      `;
      topSection.appendChild(ratingRow);

      // Meta chips: parent cat, child cat, sold — pill/chip style
      const metaRow = el('div', 'pd-meta-row');
      const chips = [];
      if (p.category_name) {
        const parentCat = categories.find(c => c.children?.some(s => s.slug === p.category_slug || s.id === p.category_id));
        if (parentCat) {
          const pIcon = parentCat.image_url || parentCat.icon_url;
          const pImg = pIcon ? `<img src="${pIcon}" class="pd-chip-icon" alt="" />` : '';
          chips.push(`<a href="/all?cat=${parentCat.slug}" class="pd-chip">${pImg}${esc(parentCat.name)}</a>`);
          const subCat = parentCat.children?.find(s => s.slug === p.category_slug || s.id === p.category_id);
          const sIcon = subCat?.image_url || subCat?.icon_url || p.category_icon;
          const sImg = sIcon ? `<img src="${sIcon}" class="pd-chip-icon" alt="" />` : '';
          chips.push(`<a href="/all?cat=${parentCat.slug}&sub=${p.category_slug || p.category_id}" class="pd-chip">${sImg}${esc(p.category_name)}</a>`);
        } else {
          const cIcon = p.category_icon;
          const cImg = cIcon ? `<img src="${cIcon}" class="pd-chip-icon" alt="" />` : '';
          chips.push(`<a href="/all?cat=${p.category_slug || p.category_id}" class="pd-chip">${cImg}${esc(p.category_name)}</a>`);
        }
      }
      if (p.sold_count > 0) {
        chips.push(`<span class="pd-chip pd-chip-sold">🔥 Đã bán ${p.sold_count}</span>`);
      }
      if (chips.length) {
        metaRow.innerHTML = chips.join('');
        topSection.appendChild(metaRow);
      }
      } // end !isGame rating/meta

      view.appendChild(topSection);

      // ── Cards section ──
      const cards = el('div', 'pd-cards');

      // ── Card: Mô tả sản phẩm ──
      if (p.description) {
        const descCard = el('div', 'pd-card');
        descCard.innerHTML = '<div class="pd-card-title">Mô tả sản phẩm</div>';
        const descBody = el('div', 'pd-desc-body');
        descBody.innerHTML = p.description;
        descCard.appendChild(descBody);
        cards.appendChild(descCard);

        requestAnimationFrame(() => {
          if (descBody.scrollHeight > 300) {
            descBody.classList.add('collapsed');
            const toggleBtn = el('button', 'pd-desc-toggle', 'Xem thêm');
            toggleBtn.onclick = () => {
              const isCollapsed = descBody.classList.toggle('collapsed');
              toggleBtn.textContent = isCollapsed ? 'Xem thêm' : 'Thu gọn';
            };
            descCard.appendChild(toggleBtn);
          }
        });
      }

      // ── Card: Chọn gói sản phẩm ──
      if (p.packages?.length) {
        const pkgCard = el('div', 'pd-card');
        pkgCard.innerHTML = `<div class="pd-card-title">${(isGame || isGiftcard) && p.sold_count > 0 ? `<span>Chọn gói sản phẩm</span><span class="pd-card-title-right">🔥 ${p.sold_count} đã bán</span>` : 'Chọn gói sản phẩm'}</div>`;
        const pkgGrid = el('div', isGiftcard ? 'pd-pkg-grid-gc' : (isGame ? 'pd-pkg-grid-game' : 'pd-pkg-grid'));

        p.packages.forEach(pkg => {
          const oos = isOutOfStock(pkg);
          const fs = pkg.flash_sale;
          const displayPrice = getDisplayPrice(pkg);
          const strikePrice = getStrikePrice(pkg);
          const discountPct = (fs && pkg.price > 0) ? Math.round((1 - fs.sale_price / pkg.price) * 100) : 0;

          if (isGiftcard) {
            // ── Gift Card: full image card, price badge overlay ──
            const card = el('div', 'pd-gcpkg-card' + (selectedPkg?.id === pkg.id ? ' selected' : '') + (oos ? ' oos' : ''));
            const imgHtml = pkg.image_url
              ? `<img src="${pkg.image_url}" alt="${pkg.name}" class="pd-gcpkg-img" />`
              : `<div class="pd-gcpkg-ph"><i class="fa-solid fa-gift"></i></div>`;
            card.innerHTML = `
              ${imgHtml}
              <span class="pd-gcpkg-price${fs ? ' flash-price' : ''}">${fmt(displayPrice)}</span>
              ${strikePrice ? `<span class="pd-gcpkg-strike">${fmt(strikePrice)}</span>` : ''}
              ${fs ? `<span class="pd-gcpkg-sale">-${discountPct}%</span>` : ''}
              ${oos ? '<span class="pd-gcpkg-oos">Hết hàng</span>' : ''}
            `;
            if (!oos) {
              card.onclick = () => {
                appliedCoupon = null;
                selectedPkg = pkg;
                quantity = 1;
                qsa('.pd-gcpkg-card', pkgGrid).forEach(e => e.classList.remove('selected'));
                card.classList.add('selected');
                renderOrderForm();
                if (typeof updateNotesCard === 'function') updateNotesCard();
              };
            }
            pkgGrid.appendChild(card);
          } else if (isGame) {
            // ── Game: 2-column card layout ──
            const card = el('div', 'pd-gpkg-card' + (selectedPkg?.id === pkg.id ? ' selected' : '') + (oos ? ' oos' : ''));
            const imgHtml = pkg.image_url
              ? `<img src="${pkg.image_url}" alt="${pkg.name}" class="pd-gpkg-img" />`
              : `<div class="pd-gpkg-icon"><i class="fa-solid fa-cube"></i></div>`;
            card.innerHTML = `
              ${fs ? `<span class="pd-gpkg-sale-badge">-${discountPct}%</span>` : ''}
              ${imgHtml}
              <div class="pd-gpkg-name">${pkg.name}</div>
              <div class="pd-gpkg-price">
                <span class="pd-gpkg-amount${fs ? ' flash-price' : ''}">${fmt(displayPrice)}</span>
                ${strikePrice ? `<span class="pd-gpkg-strike">${fmt(strikePrice)}</span>` : ''}
              </div>
              ${oos ? '<div class="pd-gpkg-oos">Hết hàng</div>' : ''}
            `;
            if (!oos) {
              card.onclick = () => {
                appliedCoupon = null;
                selectedPkg = pkg;
                quantity = 1;
                qsa('.pd-gpkg-card', pkgGrid).forEach(e => e.classList.remove('selected'));
                card.classList.add('selected');
                renderOrderForm();
                if (typeof updateNotesCard === 'function') updateNotesCard();
              };
            }
            pkgGrid.appendChild(card);
          } else {
            // ── Premium: pill layout ──
            const pill = el('div', 'pd-pkg-pill' + (selectedPkg?.id === pkg.id ? ' selected' : '') + (oos ? ' oos' : '') + (fs ? ' flash' : ''));
            const deliveryIcon = pkg.delivery_type === 'api' ? '<i class="fa-solid fa-plug pd-pkg-dtype-icon" title="API tự động"></i>' : pkg.delivery_type === 'auto' ? '<i class="fa-solid fa-bolt pd-pkg-dtype-icon" title="Giao tự động"></i>' : '<i class="fa-solid fa-truck pd-pkg-dtype-icon" title="Giao thủ công"></i>';
            const stockInfo = (() => {
              const boxIcon = '<i class="fa-solid fa-box"></i>';
              if (pkg.delivery_type === 'auto') {
                if (pkg.stock_count <= 0) return `<span class="pd-pkg-stock pd-stock-red">${boxIcon} Hết hàng</span>`;
                if (pkg.stock_count <= 5) return `<span class="pd-pkg-stock pd-stock-orange">${boxIcon} Còn ${pkg.stock_count}</span>`;
                return `<span class="pd-pkg-stock pd-stock-green">${boxIcon} Còn ${pkg.stock_count}</span>`;
              }
              if (pkg.is_stock_managed) {
                const sq = pkg.stock_quantity || 0;
                if (sq <= 0) return `<span class="pd-pkg-stock pd-stock-red">${boxIcon} Hết hàng</span>`;
                if (sq <= 5) return `<span class="pd-pkg-stock pd-stock-orange">${boxIcon} Còn ${sq}</span>`;
                return `<span class="pd-pkg-stock pd-stock-green">${boxIcon} Còn ${sq}</span>`;
              }
              if (pkg.delivery_type === 'api') return `<span class="pd-pkg-stock pd-stock-green">${deliveryIcon} Tự động</span>`;
              return `<span class="pd-pkg-stock pd-stock-green">${deliveryIcon} Sẵn hàng</span>`;
            })();
            pill.innerHTML = `
              <div class="pd-pkg-main">
                <div class="pd-pkg-name${oos ? ' oos-text' : ''}">${pkg.name}</div>
                ${pkg.description ? `<div class="pd-pkg-desc">${pkg.description}</div>` : ''}
                <div class="pd-pkg-badges">
                  ${stockInfo}
                  ${fs ? `<span class="pd-badge pd-badge-flash">${ico.zap} -${discountPct}%</span>` : ''}
                </div>
                ${fs?.ends_at ? `<div class="pd-pkg-timer" data-end="${fs.ends_at}">⏳ --:--:--</div>` : ''}
              </div>
              <div class="pd-pkg-pricing">
                <div class="pd-pkg-price${fs ? ' flash-price' : ''}">${fmt(displayPrice)}</div>
                ${strikePrice ? `<div class="pd-pkg-strike">${fmt(strikePrice)}</div>` : ''}
              </div>
            `;
            if (!oos) {
              pill.onclick = () => {
                appliedCoupon = null;
                selectedPkg = pkg;
                quantity = 1;
                qsa('.pd-pkg-pill', pkgGrid).forEach(e => e.classList.remove('selected'));
                pill.classList.add('selected');
                renderOrderForm();
                if (typeof updateNotesCard === 'function') updateNotesCard();
              };
            }
            pkgGrid.appendChild(pill);
          }
        });

        pkgCard.appendChild(pkgGrid);
        cards.appendChild(pkgCard);

        // Flash sale timers
        const updateTimers = () => {
          qsa('.pd-pkg-timer', pkgGrid).forEach(t => {
            const end = new Date(t.dataset.end).getTime();
            const diff = end - Date.now();
            if (diff <= 0) { t.textContent = 'Hết hạn'; return; }
            const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            t.textContent = `⏳ ${h}:${m}:${s}`;
          });
        };
        updateTimers();
        intervals.push(setInterval(updateTimers, 1000));

        // ── Card 2: Đặt hàng ──
        const orderCard = el('div', 'pd-card');
        orderCard.innerHTML = '<div class="pd-card-title">Đặt hàng</div>';
        const orderBody = el('div', 'pd-order-body');
        orderCard.appendChild(orderBody);
        cards.appendChild(orderCard);

        const renderOrderForm = async () => {
          orderBody.innerHTML = '';
          if (!selectedPkg) {
            orderBody.innerHTML = '<p class="text-muted">Vui lòng chọn gói sản phẩm</p>';
            return;
          }
          const oos = isOutOfStock(selectedPkg);
          const price = getDisplayPrice(selectedPkg);

          // B) Thông tin Order section
          const infoSection = el('div', 'pd-order-info');
          const infoTitle = el('div', 'pd-order-info-title', 'Thông tin Order');
          infoSection.appendChild(infoTitle);

          // For API packages, fetch fields from provider
          let fieldsToRender = selectedPkg.fields || [];
          if (selectedPkg.delivery_type === 'api' && selectedPkg.api_provider_id) {
            try {
              const apiFields = await apiFetch('/products/packages/' + selectedPkg.id + '/api-fields');
              if (apiFields?.length) {
                fieldsToRender = apiFields.map(f => ({
                  field_name: f.label || f.key || f.field_name,
                  field_type: f.type || 'text',
                  is_required: f.required !== false,
                  options: f.options || null,
                  _api_key: f.key || f.field_name,
                }));
              }
            } catch(e) { /* fallback to local fields */ }
          }

          if (fieldsToRender.length) {
            fieldsToRender.forEach(f => {
              const fg = el('div', 'form-group');
              const label = el('label', 'form-label', f.field_name + (f.is_required ? ' *' : ''));
              fg.appendChild(label);
              let input;
              if (f.field_type === 'textarea') { input = el('textarea', 'form-textarea pd-order-input'); input.placeholder = f.field_name; }
              else if (f.field_type === 'select') {
                const opts = JSON.parse(f.options || '[]');
                input = el('select', 'form-select pd-order-input');
                const defaultOpt = document.createElement('option'); defaultOpt.value = ''; defaultOpt.textContent = `-- Chọn ${f.field_name} --`; input.appendChild(defaultOpt);
                opts.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; input.appendChild(opt); });
              } else if (f.field_type === 'number') { input = el('input', 'form-input pd-order-input'); input.type = 'number'; input.placeholder = f.field_name; }
              else if (f.field_type === 'email') { input = el('input', 'form-input pd-order-input'); input.type = 'email'; input.placeholder = f.field_name; }
              else { input = el('input', 'form-input pd-order-input'); input.type = 'text'; input.placeholder = f.field_name; }
              input.dataset.field = f._api_key || f.field_name;
              input.required = f.is_required;
              fg.appendChild(input);
              infoSection.appendChild(fg);
            });
          } else {
            const noFields = el('div', 'pd-order-no-fields', 'Không có trường thông tin nào cần điền');
            infoSection.appendChild(noFields);
          }
          // For API packages with fields, update the section title
          if (selectedPkg.delivery_type === 'api' && fieldsToRender.length) {
            infoTitle.textContent = 'Nhập thông tin';
          }
          orderBody.appendChild(infoSection);

          // C) Coupon/Discount accordion
          const couponWrap = el('div', 'pd-coupon-wrap');
          couponWrap.innerHTML = `
            <div class="pd-coupon-toggle" id="pd-coupon-toggle">
              <span class="pd-coupon-toggle-label"><i class="fa-solid fa-ticket"></i> Bạn có mã giảm giá?</span>
              <span class="pd-coupon-chevron" id="pd-coupon-chevron"><i class="fa-solid fa-chevron-down"></i></span>
            </div>
            <div class="pd-coupon-body" id="pd-coupon-body" style="display:none">
              <div class="pd-coupon-row">
                <input class="pd-coupon-input" id="pd-coupon-code" type="text" placeholder="Nhập mã giảm giá" value="${appliedCoupon?.code || ''}" />
                <button class="pd-coupon-btn" id="pd-coupon-apply">Áp dụng</button>
              </div>
              <div class="form-hint" id="pd-coupon-status">${appliedCoupon ? `Đã áp dụng mã ${appliedCoupon.code}` : ''}</div>
            </div>
          `;
          orderBody.appendChild(couponWrap);

          // D) Price summary
          const priceSummary = el('div', 'pd-price-summary');
          priceSummary.innerHTML = `
            <div class="pd-price-row">
              <span class="pd-price-label">Tạm tính</span>
              <span class="pd-price-value" id="pd-subtotal-price">${fmt(price)}</span>
            </div>
            <div class="pd-price-row" id="pd-discount-row" style="display:none;">
              <span class="pd-price-label">Giảm giá</span>
              <span class="pd-price-value" id="pd-discount-price" style="color:#10b981;">-0</span>
            </div>
            <div class="pd-price-divider"></div>
            <div class="pd-price-row pd-price-total-row">
              <span class="pd-price-label pd-price-total-label">Tổng cộng</span>
              <span class="pd-price-value pd-price-total-value" id="pd-total-price">${fmt(price)}</span>
            </div>
          `;
          orderBody.appendChild(priceSummary);

          const updateProductCouponSummary = () => {
            const discountRow = qs('#pd-discount-row', orderBody);
            const discountPrice = qs('#pd-discount-price', orderBody);
            const totalPrice = qs('#pd-total-price', orderBody);
            if (!totalPrice) return;
            if (appliedCoupon?.discount) {
              if (discountRow) discountRow.style.display = '';
              if (discountPrice) discountPrice.innerHTML = `-${fmt(appliedCoupon.discount)}`;
              totalPrice.innerHTML = fmt(Math.max(0, price - appliedCoupon.discount));
            } else {
              if (discountRow) discountRow.style.display = 'none';
              if (discountPrice) discountPrice.textContent = '-0';
              totalPrice.innerHTML = fmt(price);
            }
          };
          updateProductCouponSummary();

          // F) Action buttons row
          const btnRow = el('div', 'pd-btn-row');
          if (oos) {
            btnRow.innerHTML = '<button class="btn pd-btn-buy" disabled>Hết hàng</button>';
          } else if (!currentUser) {
            btnRow.innerHTML = `
              <button class="btn pd-btn-buy pd-btn-login" id="pd-buy-now"><i class="fa-solid fa-arrow-right-to-bracket"></i> Đăng nhập để mua</button>
              <button class="btn pd-btn-cart-icon" id="pd-add-cart" title="Thêm vào giỏ">
                <i class="fa-solid fa-cart-plus"></i>
              </button>
            `;
          } else {
            btnRow.innerHTML = `
              <button class="btn pd-btn-buy" id="pd-buy-now"><i class="fa-solid fa-bolt"></i> Mua ngay</button>
              <button class="btn pd-btn-cart-icon" id="pd-add-cart" title="Thêm vào giỏ">
                <i class="fa-solid fa-cart-plus"></i>
              </button>
            `;
          }
          orderBody.appendChild(btnRow);

          // Wire up events
          const collectFields = () => {
            const fieldVals = {}; let valid = true;
            qsa('[data-field]', orderBody).forEach(inp => {
              if (inp.required && !inp.value.trim()) { valid = false; toast(`Vui lòng nhập ${inp.dataset.field}`, 'error'); }
              else fieldVals[inp.dataset.field] = inp.value.trim();
            });
            return valid ? fieldVals : null;
          };

          // Coupon toggle
          const couponToggle = qs('#pd-coupon-toggle', orderBody);
          const couponBody = qs('#pd-coupon-body', orderBody);
          const couponChevron = qs('#pd-coupon-chevron', orderBody);
          if (couponToggle) couponToggle.onclick = () => {
            const open = couponBody.style.display !== 'none';
            couponBody.style.display = open ? 'none' : 'block';
            couponChevron.style.transform = open ? '' : 'rotate(180deg)';
            if (open) {
              couponWrap.classList.remove('is-open');
            } else {
              couponWrap.classList.add('is-open');
            }
          };
          const couponApply = qs('#pd-coupon-apply', orderBody);
          if (couponApply) couponApply.onclick = async () => {
            const codeInput = qs('#pd-coupon-code', orderBody);
            const status = qs('#pd-coupon-status', orderBody);
            const code = codeInput?.value.trim();
            if (!code) return toast('Nhập mã giảm giá', 'error');
            try {
              const quoted = await apiFetch('/gift-codes/quote', { method: 'POST', body: JSON.stringify({ code, amount: price }) });
              appliedCoupon = { code: quoted.code, discount: quoted.discount, final_amount: quoted.final_amount };
              if (status) status.textContent = `Đã áp dụng mã ${quoted.code} (-${fmt(quoted.discount)})`;
              updateProductCouponSummary();
              toast('Đã áp dụng mã giảm giá', 'success');
            } catch (err) {
              appliedCoupon = null;
              if (status) status.textContent = '';
              updateProductCouponSummary();
              toast(err.message || 'Mã giảm giá không hợp lệ', 'error');
            }
          };

          const addCartBtn = qs('#pd-add-cart', orderBody);
          const buyNowBtn = qs('#pd-buy-now', orderBody);
          if (addCartBtn) addCartBtn.onclick = () => {
            if (!selectedPkg) return toast('Chọn gói', 'error');
            if (isOutOfStock(selectedPkg)) return toast('Hết hàng', 'error');
            if (!currentUser) { toast('Đăng nhập để mua', 'error'); return navigateTo('/login'); }
            const f = collectFields();
            if (f) addToCart(p, selectedPkg, quantity, f, appliedCoupon);
          };
          if (buyNowBtn) buyNowBtn.onclick = () => {
            if (!selectedPkg) return toast('Chọn gói', 'error');
            if (isOutOfStock(selectedPkg)) return toast('Hết hàng', 'error');
            if (!currentUser) { toast('Đăng nhập để mua', 'error'); return navigateTo('/login'); }
            const f = collectFields();
            // Mua ngay: thêm vào giỏ rồi đi THẲNG tới bước chọn phương thức thanh toán (checkout)
            if (f) { addToCart(p, selectedPkg, quantity, f, appliedCoupon); navigateTo('/checkout'); }
          };
        };
        renderOrderForm();
      } else {
        const noPkgCard = el('div', 'pd-card');
        noPkgCard.innerHTML = '<div class="pd-card-title">Chọn gói sản phẩm</div><p class="text-muted">Hiện chưa có gói sản phẩm.</p>';
        cards.appendChild(noPkgCard);
      }

      // ── Card: Lưu ý (not for game) ──
      let updateNotesCard;
      if (!isGame) {
      const notesCard = el('div', 'pd-card pd-card-notes');
      notesCard.id = 'pd-notes-card';
      notesCard.style.display = 'none';
      if (p.description) {
        cards.insertBefore(notesCard, cards.children[1] || null);
      } else {
        cards.appendChild(notesCard);
      }

      updateNotesCard = () => {
        const productNotes = p.notes || '';
        const pkgNotes = selectedPkg?.notes || '';
        if (!productNotes && !pkgNotes) {
          notesCard.style.display = 'none';
          return;
        }
        notesCard.style.display = '';
        notesCard.innerHTML = `
          <div class="pd-card-title pd-notes-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Lưu ý quan trọng
          </div>
          <div class="pd-notes-body">
            ${productNotes ? `<div>${productNotes}</div>` : ''}
            ${pkgNotes ? `<div class="pd-pkg-notes-section">${selectedPkg ? `<strong>${selectedPkg.name}:</strong> ` : ''}${pkgNotes}</div>` : ''}
          </div>
        `;
      };
      updateNotesCard();
      } // end !isGame notes

      // ── Card 5: Đánh giá ──
      if (appSettings.features?.reviews !== false) {
      const reviewCard = el('div', 'pd-card');
      reviewCard.innerHTML = `<div class="pd-card-title pd-review-card-header"><span class="pd-review-card-title-left">${ico.starFill} Đánh giá sản phẩm</span><span class="pd-review-card-badge" id="pd-review-badge">0 đánh giá</span></div>`;
      const reviewBody = el('div', 'pd-review-body');
      reviewCard.appendChild(reviewBody);
      cards.appendChild(reviewCard);

      const renderReviews = () => {
        reviewBody.innerHTML = '';
        // Update badge
        const badge = qs('#pd-review-badge', reviewCard);
        if (badge) badge.textContent = `${reviewData?.total_reviews || 0} đánh giá`;

        if (!reviewData || reviewData.total_reviews === 0) {
          // No reviews — show empty state
          reviewBody.innerHTML = `
            <div class="pd-review-empty">
              <div class="pd-review-empty-icon">${ico.inbox}</div>
              <div class="pd-review-empty-text">Chưa có đánh giá nào cho sản phẩm này</div>
            </div>
          `;
        } else {
          // Summary block — centered layout
          const dist = reviewData.distribution || {};
          const maxCount = Math.max(...Object.values(dist), 1);
          reviewBody.innerHTML = `
            <div class="pd-review-summary">
              <div class="pd-review-big">
                <div class="pd-review-big-num">${reviewData.avg_rating?.toFixed(1) || '—'}</div>
                <div class="pd-review-big-stars">${starsHtml(reviewData.avg_rating || 0, 20)}</div>
                <div class="pd-review-big-count">${reviewData.total_reviews} đánh giá</div>
              </div>
              <div class="pd-review-divider-h"></div>
              <div class="pd-review-bars">
                ${[5,4,3,2,1].map(n => {
                  const count = dist[n] || 0;
                  const pct = reviewData.total_reviews > 0 ? Math.round((count / reviewData.total_reviews) * 100) : 0;
                  return `<div class="pd-bar-row">
                    <span class="pd-bar-label">${n} ${ico.starFill}</span>
                    <div class="pd-bar-track"><div class="pd-bar-fill" style="width:${pct}%"></div></div>
                    <span class="pd-bar-count">${count}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
          `;

          // Review list
          if (reviewData.items?.length) {
            const list = el('div', 'pd-review-list');
            reviewData.items.forEach(r => {
              const item = el('div', 'pd-review-item');
              const avatarUrl = withAvatarFallback(r.user_avatar_url || r.avatar_url);
              const avatarHtml = avatarUrl
                ? `<img class="pd-review-avatar" src="${avatarUrl}" alt="${esc(r.user_name)}" onerror="${onImgFallback('avatar')}" />`
                : `<div class="pd-review-avatar pd-review-avatar-fallback">${esc((r.user_name || 'U').charAt(0).toUpperCase())}</div>`;
              item.innerHTML = `
                <div class="pd-review-head">
                  <div class="pd-review-user-wrap">
                    ${avatarHtml}
                    <div class="pd-review-user-meta">
                      <span class="pd-review-user">${esc(r.user_name)}</span>
                      ${r.is_verified ? '<span class="pd-badge pd-badge-green pd-badge-sm">Đã mua hàng</span>' : ''}
                    </div>
                  </div>
                </div>
                <div class="pd-review-stars">${starsHtml(r.rating, 14)}</div>
                <div class="pd-review-comment">${esc(r.comment)}</div>
                <div class="pd-review-date">${r.created_at ? fmtDate(r.created_at) : ''}</div>
              `;
              list.appendChild(item);
            });
            reviewBody.appendChild(list);
          }

          // Pagination
          if (reviewData.pages > 1) {
            const pag = el('div', 'pd-review-pag');
            for (let i = 1; i <= reviewData.pages; i++) {
              const btn = el('button', 'pd-pag-btn' + (i === reviewPage ? ' active' : ''), String(i));
              btn.onclick = async () => { await loadReviews(i); renderReviews(); };
              pag.appendChild(btn);
            }
            reviewBody.appendChild(pag);
          }
        }

        // Login prompt / Review form area
        const reviewAction = el('div', 'pd-review-action');
        if (!currentUser) {
          reviewAction.innerHTML = `
            <div class="pd-review-login-prompt">
              <div class="pd-review-login-icon">
                <i class="fa-solid fa-arrow-right-to-bracket"></i>
              </div>
              <div class="pd-review-login-text">
                Vui lòng <a href="/login">đăng nhập</a> và mua hàng để đánh giá sản phẩm
              </div>
            </div>
          `;
        } else {
          const writeBtn = el('button', 'btn btn-primary pd-review-write-btn', 'Viết đánh giá');
          writeBtn.onclick = () => {
            let modalRating = 0;
            const modalHtml = `
              <div class="pd-review-modal">
                <div class="pd-review-modal-title">Viết đánh giá</div>
                <div class="pd-review-modal-stars" id="modal-star-select">
                  ${[1,2,3,4,5].map(i => `<span class="pd-modal-star" data-val="${i}">${ico.star}</span>`).join('')}
                </div>
                <textarea class="form-textarea" id="modal-review-comment" placeholder="Nhập nhận xét của bạn..." rows="4"></textarea>
                <button class="btn btn-primary btn-lg btn-full mt-16" id="modal-review-submit" disabled>Gửi đánh giá</button>
              </div>
            `;
            openModal(modalHtml, 'Viết đánh giá');

            // Wire star selector
            requestAnimationFrame(() => {
              const starSelect = qs('#modal-star-select');
              const submitBtn = qs('#modal-review-submit');
              qsa('.pd-modal-star', starSelect).forEach(s => {
                s.onclick = () => {
                  modalRating = parseInt(s.dataset.val);
                  qsa('.pd-modal-star', starSelect).forEach((ss, idx) => {
                    ss.innerHTML = idx < modalRating ? ico.starFill : ico.star;
                  });
                  submitBtn.disabled = false;
                };
              });
              submitBtn.onclick = async () => {
                const comment = qs('#modal-review-comment').value.trim();
                if (!modalRating) return toast('Chọn số sao', 'error');
                try {
                  await apiFetch('/reviews/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: p.id, rating: modalRating, comment })
                  });
                  toast('Đã gửi đánh giá', 'success');
                  closeModal();
                  await loadReviews(1);
                  renderReviews();
                } catch (e) { toast(e.message || 'Lỗi gửi đánh giá', 'error'); }
              };
            });
          };
          reviewAction.appendChild(writeBtn);
        }
        reviewBody.appendChild(reviewAction);
      };
      renderReviews();
      } // end reviews feature check

      // ── Card 6: Sản phẩm liên quan ──
      if (p.related?.length) {
        const relCard = el('div', 'pd-card');
        relCard.innerHTML = '<div class="pd-card-title">Sản phẩm liên quan</div>';
        const relScroll = el('div', 'pd-rel-scroll');
        p.related.forEach(r => relScroll.appendChild(productCard(r)));
        relCard.appendChild(relScroll);
        cards.appendChild(relCard);
      }

      view.appendChild(cards);
      // ── Anime.js detail page effects ──
      sfAnimateDetail(view);
    };

    render();
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>${e.message}</h3></div>`;
  }
}

// CART
window.updateCartQty = async function(pkg_id, diff) {
  const item = cart.find(i => i.pkg_id === pkg_id);
  if (item) {
    item.quantity += diff;
    if (item.quantity <= 0) {
      removeFromCart(pkg_id);
    } else {
      if (cartCoupon?.code) {
        try {
          const quoted = await apiFetch('/gift-codes/quote', { method: 'POST', body: JSON.stringify({ code: cartCoupon.code, amount: cartTotal() }) });
          cartCoupon = { code: quoted.code, discount: quoted.discount, final_amount: quoted.final_amount };
        } catch (_) {
          cartCoupon = null;
        }
      }
      saveCart();
      updateAuthUI(); // update header badge
    }
    const view = document.getElementById('app-view');
    if (view && location.pathname === '/cart') renderCart(view);
  }
};

function renderCart(view) {
  if (!currentUser) {
    toast('Vui lòng đăng nhập để xem giỏ hàng', 'error');
    navigateTo('/login');
    return;
  }

  view.innerHTML = '';
  
  const heroHead = el('div', 'products-hero');
  heroHead.innerHTML = `
    <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Giỏ hàng</strong></div>
    <h1 class="products-hero-title"><i class="fa-solid fa-cart-shopping"></i> Giỏ hàng của bạn</h1>
    <p class="products-hero-desc">Kiểm tra lại sản phẩm và tiến hành thanh toán</p>
  `;
  view.appendChild(heroHead);

  // 3 Steps
  view.innerHTML += `
    <div class="checkout-steps-card">
      <div class="checkout-steps">
        <div class="checkout-step active">
          <div class="step-icon"><i class="fa-solid fa-cart-shopping"></i></div>
          <div class="step-label">GIỎ HÀNG</div>
        </div>
        <div class="step-line"></div>
        <div class="checkout-step">
          <div class="step-icon"><i class="fa-solid fa-credit-card"></i></div>
          <div class="step-label">THANH TOÁN</div>
        </div>
        <div class="step-line"></div>
        <div class="checkout-step">
          <div class="step-icon"><i class="fa-solid fa-check"></i></div>
          <div class="step-label">HOÀN TẤT</div>
        </div>
      </div>
    </div>
  `;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (!cart.length) {
    const emptyState = el('div', 'checkout-steps-card', `
      <div style="padding: 40px 20px; text-align: center;">
        <div class="empty-state-icon" style="margin-bottom: 20px;">
          <div style="width: 80px; height: 80px; background: var(--primary); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 32px;">
            <i class="fa-solid fa-cart-shopping"></i>
          </div>
        </div>
        <h3 style="font-size: 22px; font-weight: 700; color: var(--text-heading); margin-bottom: 12px;">Giỏ hàng trống</h3>
        <p style="color: var(--text-muted); margin-bottom: 24px;">Hãy thêm sản phẩm vào giỏ hàng để mua sắm</p>
        <a href="/" class="btn btn-primary btn-lg" style="width: 100%; max-width: 300px;"><i class="fa-solid fa-bag-shopping"></i> Xem sản phẩm</a>
      </div>
    `);
    view.appendChild(emptyState);
    return;
  }

  // Cart Header Card
  const contentWrapper = el('div');
  
  // Unified card for the items list
  const listCard = el('div', 'info-card');
  
  // Card Header
  const listHeader = el('div', 'info-card-head');
  listHeader.innerHTML = `<div class="info-card-title"><i class="fa-solid fa-list-ul"></i> Danh sách sản phẩm (${totalItems})</div>`;
  listCard.appendChild(listHeader);

  // Card Body
  const listBody = el('div');
  listBody.style.padding = '16px';

  cart.forEach((item, index) => {
    const itemEl = el('div');
    if (index > 0) {
      itemEl.style.borderTop = '1px dashed var(--border)';
      itemEl.style.paddingTop = '16px';
      itemEl.style.marginTop = '16px';
    }
    
    let fieldsHtml = '';
    if (item.fields && Object.keys(item.fields).length > 0) {
      fieldsHtml = `
        <div style="background: var(--bg-body); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-clipboard-list"></i> THÔNG TIN ĐƠN HÀNG
          </div>
          ${Object.entries(item.fields).map(([k,v]) => `
            <div style="margin-bottom: 12px; border-bottom: 1px dashed var(--border); padding-bottom: 12px;">
              <div style="color: var(--text-muted); font-size: 13px; margin-bottom: 4px;">${k}</div>
              <div style="font-weight: 600;">${v}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    itemEl.innerHTML = `
      <div style="position: relative;">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          ${withImageFallback(item.product_img) ? `<img src="${withImageFallback(item.product_img)}" loading="lazy" decoding="async" onerror="${onImgFallback()}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border);" />` : `<div style="width: 80px; height: 80px; background: var(--bg-body); border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);"><i class="fa-solid fa-image text-muted"></i></div>`}
          
          <div style="flex: 1; padding-right: 40px;">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px; color: var(--text-heading);">${item.product_name}</div>
            <div style="color: var(--text-muted); font-size: 14px; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-cube"></i> ${item.pkg_name}</div>
          </div>
          
          <button class="cart-item-remove" data-pkg="${item.pkg_id}" style="position: absolute; top: 0; right: 0; background: #fee2e2; color: #ef4444; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        ${fieldsHtml}
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
          <div style="color: #ef4444; font-size: 20px; font-weight: 700;">${fmt(item.pkg_price)}</div>
          
          <div style="display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <button class="qty-btn" onclick="updateCartQty(${item.pkg_id}, -1)" style="width: 36px; height: 36px; border: none; background: transparent; cursor: pointer; color: var(--text-muted);"><i class="fa-solid fa-minus"></i></button>
            <div style="width: 40px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; border-left: 1px solid var(--border); border-right: 1px solid var(--border); background: #fafafa;">${item.quantity}</div>
            <button class="qty-btn" onclick="updateCartQty(${item.pkg_id}, 1)" style="width: 36px; height: 36px; border: none; background: transparent; cursor: pointer; color: var(--text-muted);"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      </div>
    `;
    listBody.appendChild(itemEl);
  });
  
  listCard.appendChild(listBody);
  contentWrapper.appendChild(listCard);
  const totals = cartGrandTotal();
  const { subtotal, discount, taxRate, taxAmount, grandTotal } = totals;

  const summary = el('div', 'cart-summary-card');
  summary.innerHTML = `
    <div class="cart-summary-head">
      <div class="cart-summary-title"><i class="fa-solid fa-receipt"></i> Tóm tắt đơn hàng</div>
    </div>
    <div class="cart-summary-body">
      <div class="summary-row">
        <span class="summary-label">Tạm tính (${totalItems} sản phẩm)</span>
        <span class="summary-value">${fmt(subtotal)}</span>
      </div>
      ${discount > 0 ? `
      <div class="summary-row">
        <span class="summary-label">Giảm giá</span>
        <span class="summary-value" style="color:#10b981;">-${fmt(discount)}</span>
      </div>
      ` : ''}
      ${taxRate > 0 ? `
      <div class="summary-row">
        <span class="summary-label">Thuế (${taxRate}%)</span>
        <span class="summary-value">${fmt(taxAmount)}</span>
      </div>
      ` : ''}
      <div class="divider" style="margin: 16px 0; border-top: 1px dashed var(--border-dark);"></div>
      <div class="summary-row">
        <span class="summary-label fw-700" style="font-size: 16px;">Tổng cộng</span>
        <span class="summary-total" style="font-size: 22px; color: #ef4444;">${fmt(grandTotal)}</span>
      </div>
    </div>
  `;
  
  const couponCard = el('div', 'info-card');
  couponCard.style.marginBottom = '16px';
  couponCard.style.overflow = 'hidden';
  couponCard.innerHTML = `
    <div class="info-card-head" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="const body = this.nextElementSibling; const icon = this.querySelector('.fa-chevron-down'); if(body.style.display==='none'){body.style.display='block';icon.style.transform='rotate(180deg)';}else{body.style.display='none';icon.style.transform='rotate(0)';}">
      <div class="info-card-title"><i class="fa-solid fa-ticket"></i> Mã giảm giá</div>
      <i class="fa-solid fa-chevron-down" style="transition: transform 0.2s; color: #fff;"></i>
    </div>
    <div class="info-card-body" style="display: none;">
      <input type="text" class="form-input" id="cart-coupon-code" value="${cartCoupon?.code || ''}" placeholder="Nhập mã giảm giá" style="margin-bottom: 12px; background: #fff; border: 1px solid var(--border); border-radius: 8px; height: 44px;">
      ${cartCoupon ? `<div class="form-hint" style="color:#10b981;margin-bottom:10px;"><i class="fa-solid fa-ticket"></i> Đã áp dụng ${esc(cartCoupon.code)}: -${fmt(cartCoupon.discount)}</div>` : ''}
      <button class="btn btn-primary btn-full" id="cart-coupon-apply" style="background: #3b5998; border-color: #3b5998; border-radius: 8px; font-weight: 600; box-shadow: 0 2px 4px rgba(59, 89, 152, 0.2);">Áp dụng</button>
      ${cartCoupon ? `<button class="btn btn-ghost btn-full mt-8" id="cart-coupon-remove" style="border-radius:8px;">Bỏ mã</button>` : ''}
    </div>
  `;
  
  const actionsWrap = el('div');
  actionsWrap.innerHTML = `
    <button class="btn btn-primary btn-lg btn-full" id="btn-checkout" style="background: #10b981; border-color: #10b981; border-radius: 12px; margin-bottom: 16px; font-weight: 600; color: #fff; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-wallet"></i> Thanh toán đơn hàng</button>
    
    <div style="border: 1px solid var(--border); border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
      <button class="btn btn-ghost btn-full" onclick="navigateTo('/orders')" style="border-bottom: 1px solid var(--border); border-radius: 0; color: #64748b; font-weight: 500;"><i class="fa-solid fa-receipt"></i> Xem đơn hàng đã đặt</button>
      <button class="btn btn-ghost btn-full" onclick="location.reload()" style="color: #10b981; border-bottom: 1px solid var(--border); border-radius: 0; font-weight: 500;"><i class="fa-solid fa-arrows-rotate"></i> Cập nhật giá</button>
      <button class="btn btn-ghost btn-full" id="btn-clear-cart" style="color: #94a3b8; border-radius: 0; font-weight: 500;"><i class="fa-solid fa-trash-can"></i> Xóa tất cả</button>
    </div>
  `;
  
  contentWrapper.appendChild(summary);
  contentWrapper.appendChild(couponCard);
  contentWrapper.appendChild(actionsWrap);
  view.appendChild(contentWrapper);
  
  contentWrapper.addEventListener('click', e => { const btn = e.target.closest('[data-pkg]'); if (btn) { removeFromCart(parseInt(btn.dataset.pkg)); renderCart(view); } });
  qs('#btn-checkout', actionsWrap).addEventListener('click', () => { if (!currentUser) { toast('Đăng nhập để thanh toán', 'error'); return navigateTo('/login'); } navigateTo('/checkout'); });
  qs('#cart-coupon-apply', couponCard)?.addEventListener('click', async () => {
    const code = qs('#cart-coupon-code', couponCard)?.value.trim();
    if (!code) return toast('Nhập mã giảm giá', 'error');
    try {
      const quoted = await apiFetch('/gift-codes/quote', { method: 'POST', body: JSON.stringify({ code, amount: cartTotal() }) });
      cartCoupon = { code: quoted.code, discount: quoted.discount, final_amount: quoted.final_amount };
      saveCart();
      toast('Đã áp dụng mã giảm giá', 'success');
      renderCart(view);
    } catch (err) {
      toast(err.message || 'Mã giảm giá không hợp lệ', 'error');
    }
  });
  qs('#cart-coupon-remove', couponCard)?.addEventListener('click', () => {
    cartCoupon = null;
    saveCart();
    toast('Đã bỏ mã giảm giá', 'info');
    renderCart(view);
  });

  qs('#btn-clear-cart', actionsWrap).addEventListener('click', () => { 
    if (confirm('Bạn muốn xóa tất cả sản phẩm khỏi giỏ?')) { 
      clearCart();
      renderCart(view);
    } 
  });
}

// CHECKOUT
// OFFERS
async function renderOffers(view) {
  view.innerHTML = '';
  
  const heroHead = el('div', 'products-hero');
  heroHead.innerHTML = `
    <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Ưu đãi</strong></div>
    <h1 class="products-hero-title"><i class="fa-solid fa-gift"></i> Ưu đãi đặc biệt</h1>
    <p class="products-hero-desc">Mã giảm giá và khuyến mãi dành riêng cho bạn</p>
  `;
  view.appendChild(heroHead);

  try {
    const codes = await apiFetch('/gift-codes/public');
    
    if (!codes || codes.length === 0) {
      view.appendChild(el('div', 'empty-state', '<div class="empty-state-icon"><i class="fa-solid fa-box-open" style="color: var(--border-dark);"></i></div><h3>Chưa có ưu đãi nào</h3><p class="text-muted">Các mã giảm giá sẽ xuất hiện tại đây khi có chương trình khuyến mãi.</p>'));
      return;
    }

    const grid = el('div', 'offers-grid');
    grid.innerHTML = codes.map(gc => {
      const discountText = gc.discount_type === 'percent' 
        ? `Giảm ${gc.discount_value}%` 
        : `Giảm ${fmt(gc.discount_value)}`;
      
      const details = [];
      if (gc.description) details.push(gc.description);
      if (gc.min_order > 0) details.push(`Đơn tối thiểu ${fmt(gc.min_order)}`);
      if (gc.max_discount && gc.discount_type === 'percent') details.push(`Giảm tối đa ${fmt(gc.max_discount)}`);
      if (gc.expires_at) details.push(`HSD: ${fmtDate(gc.expires_at)}`);

      return `
        <div class="offer-card">
          <div class="offer-left">
            <div class="offer-icon"><i class="fa-solid fa-ticket"></i></div>
          </div>
          <div class="offer-main">
            <div class="offer-title">${discountText}</div>
            <div class="offer-desc">${details.length > 0 ? details.join(' • ') : 'Áp dụng cho mọi đơn hàng'}</div>
            <div class="offer-bottom">
              <span class="offer-code" onclick="navigator.clipboard.writeText('${gc.code}'); toast('Đã sao chép mã', 'success')">${gc.code}</span>
              <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${gc.code}'); toast('Đã sao chép mã', 'success')">Sao chép</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    view.appendChild(grid);
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><h3>Lỗi tải ưu đãi</h3><p>${e.message}</p></div>`;
  }
}

async function renderWishlist(view) {
  if (!currentUser) { navigateTo('/login'); return; }
  view.innerHTML = '';
  const heroHead = el('div', 'products-hero');
  heroHead.innerHTML = `
    <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Yêu thích</strong></div>
    <h1 class="products-hero-title"><i class="fa-solid fa-heart" style="color:#ef4444"></i> Sản phẩm yêu thích</h1>
    <p class="products-hero-desc">Danh sách sản phẩm bạn đã lưu</p>
  `;
  view.appendChild(heroHead);

  // Search bar
  const searchWrap = el('div', 'wl-search-wrap');
  searchWrap.innerHTML = `<div class="wl-search-bar"><i class="fa-solid fa-search"></i><input type="text" class="wl-search-input" id="wl-search" placeholder="Tìm trong yêu thích..." /></div>`;
  view.appendChild(searchWrap);

  const container = el('div', 'wl-container');
  view.appendChild(container);

  let curPage = 1;
  let searchQ = '';
  let debounceTimer = null;

  const loadPage = async (page) => {
    container.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    try {
      const data = await apiFetch(`/wishlist/?page=${page}&limit=12&q=${encodeURIComponent(searchQ)}`);
      container.innerHTML = '';
      if (!data.items?.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fa-regular fa-heart" style="font-size:48px;color:var(--text-muted);opacity:0.3;"></i></div><h3>${searchQ ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm yêu thích'}</h3><p class="text-muted">${searchQ ? 'Thử từ khóa khác' : 'Bấm nút ❤️ trên sản phẩm để thêm vào đây'}</p></div>`;
        return;
      }
      const grid = el('div', 'product-grid');
      data.items.forEach(p => grid.appendChild(productCard(p)));
      container.appendChild(grid);

      // Pagination
      if (data.pages > 1) {
        const pager = el('div', 'wl-pager');
        for (let i = 1; i <= data.pages; i++) {
          const btn = el('button', `wl-page-btn ${i === data.page ? 'active' : ''}`);
          btn.textContent = i;
          btn.onclick = () => { curPage = i; loadPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }); };
          pager.appendChild(btn);
        }
        container.appendChild(pager);
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><h3>Lỗi tải danh sách</h3><p>${e.message}</p></div>`;
    }
  };

  qs('#wl-search', view).oninput = (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { searchQ = e.target.value.trim(); curPage = 1; loadPage(1); }, 300);
  };

  await loadPage(1);
}

async function renderCheckout(view) {
  if (!cart.length) return navigateTo('/cart');
  if (!currentUser) { toast('Đăng nhập', 'error'); return navigateTo('/login'); }
  view.innerHTML = '';

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totals = cartGrandTotal();
  const { subtotal, discount, taxRate, taxAmount, grandTotal } = totals;

  // ── Step 2: Payment Method Selection ──
  const balanceOn = appSettings.features?.balance !== false;
  let userBalance = 0;
  if (balanceOn) {
    try { const bData = await apiFetch('/balance'); userBalance = bData.balance || 0; } catch(e) {}
  }

  function renderStep2() {
    view.innerHTML = '';
    const heroHead = el('div', 'products-hero');
    heroHead.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <a href="/cart">Giỏ hàng</a> <span>›</span> <strong>Thanh toán</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-credit-card"></i> Chọn phương thức thanh toán</h1>
      <p class="products-hero-desc">Chọn cổng thanh toán và xác nhận đơn hàng</p>
    `;
    view.appendChild(heroHead);

    view.innerHTML += `
      <div class="checkout-steps-card">
        <div class="checkout-steps">
          <div class="checkout-step completed" onclick="navigateTo('/cart')" style="cursor:pointer">
            <div class="step-icon"><i class="fa-solid fa-cart-shopping"></i></div>
            <div class="step-label">GIỎ HÀNG</div>
          </div>
          <div class="step-line active"></div>
          <div class="checkout-step active">
            <div class="step-icon"><i class="fa-solid fa-credit-card"></i></div>
            <div class="step-label">THANH TOÁN</div>
          </div>
          <div class="step-line"></div>
          <div class="checkout-step">
            <div class="step-icon"><i class="fa-solid fa-check"></i></div>
            <div class="step-label">HOÀN TẤT</div>
          </div>
        </div>
      </div>
    `;

    const grid = el('div', 'checkout-grid');
    const left = el('div');
    left.innerHTML = `
      <div class="card mb-16">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
            <div class="fw-700" style="font-size: 16px;"><i class="fa-solid fa-bag-shopping text-primary"></i> Sản phẩm đặt mua</div>
            <div style="background: var(--primary); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${totalItems} sản phẩm</div>
          </div>
          <div style="border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
            ${cart.map(i => `
              <div style="display: flex; gap: 16px; margin-bottom: ${cart.length > 1 ? '16px' : '0'};">
                ${withImageFallback(i.product_img) ? `<img src="${withImageFallback(i.product_img)}" loading="lazy" decoding="async" onerror="${onImgFallback()}" style="width:60px; height:60px; border-radius:8px; object-fit:cover" />` : `<div style="width:60px; height:60px; border-radius:8px; background:var(--bg-body); display:flex; align-items:center; justify-content:center"><i class="fa-solid fa-image text-muted"></i></div>`}
                <div style="flex:1">
                  <div class="fw-600" style="margin-bottom: 4px;">${i.product_name} <span class="text-primary">x${i.quantity}</span></div>
                  <div class="text-muted text-sm"><i class="fa-solid fa-cube"></i> ${i.pkg_name}</div>
                  ${cartCoupon ? `<div class="text-sm" style="color:#10b981;margin-top:4px;"><i class="fa-solid fa-ticket"></i> Mã ${esc(cartCoupon.code)} áp dụng cho toàn đơn</div>` : ''}
                </div>
                <div class="fw-700" style="color:var(--text-heading)">${fmt(i.pkg_price * i.quantity)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card mb-16" style="overflow: hidden;">
        <div class="cart-summary-head">
          <div class="cart-summary-title"><i class="fa-solid fa-credit-card"></i> Phương thức thanh toán</div>
        </div>
        <div class="card-body">
          ${balanceOn && userBalance >= grandTotal ? `
          <div class="payment-option selected" data-method="balance">
            <div class="payment-option-icon pay-icon-balance"><i class="fa-solid fa-wallet"></i></div>
            <div class="payment-option-info">
              <div class="payment-option-name">Số dư tài khoản</div>
              <div class="payment-option-desc">Số dư hiện tại: <strong style="color:#10b981">${fmt(userBalance)}</strong></div>
            </div>
            <div class="payment-option-check active"><i class="fa-solid fa-circle-check"></i></div>
          </div>` : balanceOn ? `
          <div class="payment-option disabled" data-method="balance">
            <div class="payment-option-icon pay-icon-disabled"><i class="fa-solid fa-wallet"></i></div>
            <div class="payment-option-info">
              <div class="payment-option-name">Số dư tài khoản</div>
              <div class="payment-option-desc">Số dư: <strong style="color:#ef4444">${fmt(userBalance)}</strong> — <a href="/profile" style="color:var(--primary)">Nạp thêm</a></div>
            </div>
            <div class="payment-option-check"><i class="fa-regular fa-circle"></i></div>
          </div>` : ''}
          <div class="payment-option ${!balanceOn || userBalance < grandTotal ? 'selected' : ''}" data-method="sepay">
            <div class="payment-option-icon pay-icon-sepay"><i class="fa-solid fa-qrcode"></i></div>
            <div class="payment-option-info">
              <div class="payment-option-name">QR Ngân hàng</div>
              <div class="payment-option-desc">Chuyển khoản QR, áp dụng mọi ngân hàng VN</div>
            </div>
            <div class="payment-option-check ${!balanceOn || userBalance < grandTotal ? 'active' : ''}"><i class="${!balanceOn || userBalance < grandTotal ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i></div>
          </div>
        </div>
      </div>
    `;

    const right = el('div', 'cart-summary-card');
    right.innerHTML = `
      <div class="cart-summary-head"><div class="cart-summary-title"><i class="fa-solid fa-receipt"></i> Tóm tắt đơn hàng</div></div>
      <div class="cart-summary-body">
        <div class="summary-row"><span class="summary-label">Tạm tính</span><span class="summary-value">${fmt(subtotal)}</span></div>
        ${discount > 0 ? `<div class="summary-row"><span class="summary-label">Giảm giá</span><span class="summary-value" style="color:#10b981;">-${fmt(discount)}</span></div>` : ''}
        ${taxRate > 0 ? `
        <div class="summary-row"><span class="summary-label">Thuế (${taxRate}%)</span><span class="summary-value">${fmt(taxAmount)}</span></div>
        ` : ''}
        <div class="divider" style="margin: 16px 0; border-top: 1px dashed var(--border-dark);"></div>
        <div class="summary-row" style="background: var(--primary-light); padding: 16px; border-radius: 8px; margin: 0 -8px;">
          <span class="summary-label fw-700" style="color: var(--primary); font-size: 16px;">Tổng cộng</span>
          <span class="summary-total" style="font-size: 22px; color: #ef4444;">${fmt(grandTotal)}</span>
        </div>
      </div>
    `;
    
    // Nút tạo đơn nằm ngoài card
    const actionsWrapper = el('div');
    actionsWrapper.innerHTML = `
      <button class="btn btn-primary btn-lg btn-full mt-16" id="btn-pay" style="background: #10b981; border-color: #10b981;"><i class="fa-solid fa-wallet"></i> Tạo đơn & Thanh toán</button>
      <a href="/cart" class="btn btn-ghost btn-full mt-8" style="text-align: center;"><i class="fa-solid fa-arrow-left"></i> Quay lại giỏ hàng</a>
    `;
    
    const rightWrapper = el('div');
    rightWrapper.appendChild(right);
    rightWrapper.appendChild(actionsWrapper);
    
    grid.appendChild(left); grid.appendChild(rightWrapper); view.appendChild(grid);

    // Payment method selection
    let selectedMethod = userBalance >= grandTotal ? 'balance' : 'sepay';
    qsa('.payment-option', left).forEach(opt => {
      opt.onclick = () => {
        if (opt.dataset.method === 'balance' && userBalance < grandTotal) return;
        selectedMethod = opt.dataset.method;
        qsa('.payment-option', left).forEach(o => {
          const isSelected = o.dataset.method === selectedMethod;
          o.classList.toggle('selected', isSelected);
          const check = o.querySelector('.payment-option-check');
          const icon = check?.querySelector('i');
          if (icon) {
            icon.className = isSelected ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
            check.classList.toggle('active', isSelected);
          }
        });
      };
    });

    // Pay button
    qs('#btn-pay', actionsWrapper).onclick = async () => {
      const btn = qs('#btn-pay', actionsWrapper); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
      try {
        const order = await apiFetch('/orders/create', { method: 'POST', body: JSON.stringify({ items: cart.map(item => ({ package_id: item.pkg_id, quantity: item.quantity, custom_fields_data: item.fields || {} })), payment_method: selectedMethod, coupon_code: cartCoupon?.code || null }) });
        if (selectedMethod === 'sepay') {
          const payment = await apiFetch('/payment/create-link', { method: 'POST', body: JSON.stringify({ order_code: order.order_code }) });
          cart.length = 0; cartCoupon = null; saveCart(); updateCartCount();
          if (payment?.payment_url) {
            window.location.href = payment.payment_url;
          } else {
            navigateTo(`/orders/${order.order_code}`);
          }
        } else {
          // Balance payment
          cart.length = 0; cartCoupon = null; saveCart(); updateCartCount();
          renderStep3(order, 'balance');
        }
      } catch (e) {
        renderStep3(null, 'error', null, e.message);
      }
    };
  }

  // ── Step 3: Order Result ──
  function renderStep3(order, method, payUrl = null, errorMsg = null) {
    view.innerHTML = '';
    const heroHead = el('div', 'products-hero');
    heroHead.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <a href="/cart">Giỏ hàng</a> <span>›</span> <strong>Hoàn tất</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-flag-checkered"></i> Trạng thái đơn hàng</h1>
      <p class="products-hero-desc">Kết quả giao dịch của bạn</p>
    `;
    view.appendChild(heroHead);

    view.innerHTML += `
      <div class="checkout-steps-card">
        <div class="checkout-steps">
          <div class="checkout-step completed" onclick="navigateTo('/cart')" style="cursor:pointer">
            <div class="step-icon"><i class="fa-solid fa-cart-shopping"></i></div>
            <div class="step-label">GIỎ HÀNG</div>
          </div>
          <div class="step-line active"></div>
          <div class="checkout-step completed">
            <div class="step-icon"><i class="fa-solid fa-credit-card"></i></div>
            <div class="step-label">THANH TOÁN</div>
          </div>
          <div class="step-line active"></div>
          <div class="checkout-step active">
            <div class="step-icon"><i class="fa-solid fa-check"></i></div>
            <div class="step-label">HOÀN TẤT</div>
          </div>
        </div>
      </div>
    `;

    const content = el('div', 'card');
    content.style.maxWidth = '600px';
    content.style.margin = '0 auto';
    content.style.padding = '40px 24px';
    content.style.textAlign = 'center';

    if (errorMsg) {
      content.innerHTML = `
        <div style="font-size: 64px; color: #ef4444; margin-bottom: 16px;"><i class="fa-solid fa-circle-xmark"></i></div>
        <h2 style="margin-bottom: 8px;">Thanh toán thất bại</h2>
        <p class="text-muted mb-24" style="font-size:15px;">${errorMsg}</p>
        <button class="btn btn-primary btn-lg" onclick="location.reload()"><i class="fa-solid fa-rotate-right"></i> Thử lại</button>
      `;
    } else if (method === 'sepay') {
      const sepayData = payUrl || {};
      const checkoutOrder = sepayData.order || order;
      content.style.maxWidth = '920px';
      content.style.textAlign = 'left';
      const qrBlock = sepayData.qr_code || sepayData.qrCodeUrl
        ? `<div class="checkout-shell-qr-wrap"><img src="${sepayData.qr_code || sepayData.qrCodeUrl}" alt="QR thanh toán" class="checkout-shell-qr" /></div>`
        : `<div class="checkout-shell-qr-wrap checkout-shell-qr-placeholder"><i class="fa-solid fa-qrcode"></i><span>QR sẽ hiển thị sau khi xử lý</span></div>`;
      const bankMeta = [
        sepayData.account_name ? `<div class="checkout-shell-meta-row"><span>Chủ tài khoản</span><strong>${esc(sepayData.account_name)}</strong></div>` : '',
        sepayData.accountNumber || sepayData.account_number ? `<div class="checkout-shell-meta-row"><span>Số tài khoản</span><strong>${esc(sepayData.accountNumber || sepayData.account_number)}</strong></div>` : '',
        sepayData.bankCode || sepayData.bin ? `<div class="checkout-shell-meta-row"><span>Mã ngân hàng</span><strong>${esc(String(sepayData.bankCode || sepayData.bin))}</strong></div>` : '',
        sepayData.transferContent || sepayData.description ? `<div class="checkout-shell-meta-row"><span>Nội dung CK</span><strong>${esc(sepayData.transferContent || sepayData.description)}</strong></div>` : '',
      ].filter(Boolean).join('');
      const sepayItems = checkoutOrder.items || order.items || [];
      content.innerHTML = `
        <div class="checkout-shell-card">
          <div class="checkout-shell-head">
            <div>
              <div class="checkout-shell-eyebrow">Thanh toán SePay</div>
              <h3>Quét QR hoặc chuyển khoản</h3>
              <p>Mã đơn: <strong>${checkoutOrder.order_code || order.order_code}</strong>. Thanh toán trong giao diện cửa hàng, không chuyển sang trang khác.</p>
            </div>
            <div class="checkout-shell-status pending"><i class="fa-solid fa-clock"></i> ${paymentStatusLabel(sepayData.status || 'PENDING')}</div>
          </div>
          <div class="checkout-shell-body">
            <div class="checkout-shell-summary">
              <div class="checkout-shell-total">
                <span>Tổng cần thanh toán</span>
                <strong>${fmt(sepayData.amount || checkoutOrder.total_amount || order.total_amount || 0)}</strong>
              </div>
              <div class="checkout-shell-items">
                ${sepayItems.map(item => `
                  <div class="checkout-shell-item">
                    <div class="checkout-shell-item-name">${esc(item.product_name || 'Sản phẩm')} <span>x${item.quantity || 1}</span></div>
                    <div class="checkout-shell-item-meta">${esc(item.package_name || 'Gói')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="checkout-shell-payment">
              ${qrBlock}
              <div class="checkout-shell-meta">
                ${bankMeta || '<div class="checkout-shell-meta-row"><span>Thông tin</span><strong>Quét QR hoặc chuyển khoản theo thông tin thanh toán bên dưới</strong></div>'}
              </div>
              <div class="checkout-shell-actions">
                <button class="btn btn-primary btn-full" id="btn-step3-check-status"><i class="fa-solid fa-rotate"></i> Cập nhật trạng thái thanh toán</button>
                  <a href="/orders/${order.order_code}" class="btn btn-ghost btn-full"><i class="fa-solid fa-receipt"></i> Xem chi tiết đơn</a>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="font-size: 64px; color: #10b981; margin-bottom: 16px;"><i class="fa-solid fa-circle-check"></i></div>
        <h2 style="margin-bottom: 8px;">Thanh toán thành công!</h2>
        <p class="text-muted mb-8">Mã đơn: <strong>${order.order_code}</strong></p>
        <p class="mb-24" style="color:var(--text-heading)">Cảm ơn bạn! Đơn hàng đã được thanh toán và xử lý thành công.</p>
        <div style="display:flex; justify-content:center; gap: 12px; flex-wrap:wrap;">
          <a href="/" class="btn btn-outline btn-lg"><i class="fa-solid fa-house"></i> Về trang chủ</a>
          <a href="/orders/${order.order_code}" class="btn btn-primary btn-lg">Xem đơn hàng</a>
        </div>
      `;
    }

    view.appendChild(content);

    qs('#btn-step3-check-status', content)?.addEventListener('click', async () => {
      const btn = qs('#btn-step3-check-status', content);
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';
      await apiFetch(`/payment/status/${order.order_code}`).catch(() => null);
      const refreshed = await apiFetch(`/payment/checkout-data/${order.order_code}`).catch(() => null);
      renderStep3(order, 'sepay', refreshed || payUrl);
    });
  }

  // Start at Step 2
  renderStep2();
}

async function renderSepayCheckout(view, { code }) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    await apiFetch(`/payment/status/${code}`).catch(() => null);
    let checkoutData = await apiFetch(`/payment/checkout-data/${code}`).catch(() => null);
    if (!checkoutData?.sepay?.transferContent || checkoutData?.paymentLinkId) {
      await apiFetch('/payment/create-link', { method: 'POST', body: JSON.stringify({ order_code: code }) });
      checkoutData = await apiFetch(`/payment/checkout-data/${code}`);
    }

    const sepayData = checkoutData?.sepay || {};
    const items = checkoutData?.items || [];
    const expiresAt = sepayData.expiredAt || sepayData.expires_at ? Number(sepayData.expiredAt || sepayData.expires_at) * 1000 : (Date.now() + 15 * 60 * 1000);
    view.innerHTML = `
      <div class="checkout-fullpage">
        <div class="checkout-fullpage-card">
          <div class="checkout-fullpage-top">
            <div>
              <div class="checkout-shell-eyebrow">Thanh toán SePay</div>
              <h1>Hoàn tất thanh toán</h1>
              <p>Quét QR hoặc chuyển khoản theo thông tin bên dưới. Không cần mở trang PayOS.</p>
            </div>
            <a href="/orders/${code}" class="btn btn-ghost"><i class="fa-solid fa-receipt"></i> Chi tiết đơn</a>
          </div>
          <div class="checkout-fullpage-grid">
            <div class="checkout-fullpage-left">
              <div class="checkout-shell-total">
                <span>Tổng cần thanh toán</span>
                <strong>${fmt(sepayData.amount || checkoutData.total_amount || 0)}</strong>
              </div>
              <div class="checkout-countdown" id="checkout-countdown">15:00</div>
              <div class="checkout-shell-items">
                ${items.map(item => `
                  <div class="checkout-shell-item">
                    <div class="checkout-shell-item-name">${esc(item.product_name || 'Sản phẩm')} <span>x${item.quantity || 1}</span></div>
                    <div class="checkout-shell-item-meta">${esc(item.package_name || 'Gói')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="checkout-fullpage-right">
              ${sepayData.qr_code || sepayData.qrCodeUrl ? `<div class="checkout-shell-qr-wrap"><img src="${sepayData.qr_code || sepayData.qrCodeUrl}" alt="QR thanh toán" class="checkout-shell-qr" /></div>` : `<div class="checkout-shell-qr-wrap checkout-shell-qr-placeholder"><i class="fa-solid fa-qrcode"></i><span>QR chưa sẵn sàng</span></div>`}
              <div class="checkout-shell-meta">
                ${sepayData.account_name ? `<div class="checkout-shell-meta-row"><span>Chủ tài khoản</span><strong>${esc(sepayData.account_name)}</strong></div>` : ''}
                ${sepayData.accountNumber || sepayData.account_number ? `<div class="checkout-shell-meta-row"><span>Số tài khoản</span><strong>${esc(sepayData.accountNumber || sepayData.account_number)}</strong></div>` : ''}
                ${sepayData.bankCode || sepayData.bin ? `<div class="checkout-shell-meta-row"><span>Mã ngân hàng</span><strong>${esc(String(sepayData.bankCode || sepayData.bin))}</strong></div>` : ''}
                ${sepayData.transferContent || sepayData.description ? `<div class="checkout-shell-meta-row"><span>Nội dung CK</span><strong>${esc(sepayData.transferContent || sepayData.description)}</strong></div>` : ''}
              </div>
              <a class="btn btn-outline btn-full" href="${sepayData.payment_url || '#'}" target="_blank" rel="noopener" ${sepayData.payment_url ? '' : 'aria-disabled="true"'}><i class="fa-solid fa-up-right-from-square"></i> Mở link PayOS đã tạo</a>
              <button class="btn btn-primary btn-full" id="btn-checkout-full-check"><i class="fa-solid fa-rotate"></i> Cập nhật trạng thái</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      const mins = Math.floor(left / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      const el = qs('#checkout-countdown', view);
      if (el) el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (left <= 0 && el) el.classList.add('expired');
    };
    tick();
    const timer = setInterval(() => {
      if (!document.body.contains(view)) return clearInterval(timer);
      tick();
    }, 1000);

    qs('#btn-checkout-full-check', view)?.addEventListener('click', async () => {
      await apiFetch(`/payment/status/${code}`).catch(() => null);
      renderSepayCheckout(view, { code });
    });
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><h3>${e.message}</h3></div>`;
  }
}


// ORDERS
function orderPrimaryItem(order) {
  return Array.isArray(order?.items) && order.items.length ? order.items[0] : null;
}

function orderSummaryLabel(order) {
  const primary = orderPrimaryItem(order);
  if (!primary) return `${esc(order.product_name || '')}${order.package_name ? ` - ${esc(order.package_name)}` : ''}`.trim() || 'Đơn hàng';
  const extra = (order.items?.length || 0) - 1;
  const base = `${esc(primary.product_name || '')} - ${esc(primary.package_name || '')}`;
  return extra > 0 ? `${base} <span class="text-muted">+${extra} sản phẩm</span>` : base;
}

function orderDisplayImage(order) {
  const primary = orderPrimaryItem(order);
  return withImageFallback(primary?.product_img || order.product_img);
}

async function renderOrders(view) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const data = await apiFetch('/orders/my');
    view.innerHTML = '';
    
    // Top Card: Header & Search
    view.innerHTML += `
      <div class="card mb-16" style="padding: 20px;">
        <div style="display:flex; align-items:center; gap:16px; margin-bottom: 24px;">
          <div style="width:48px; height:48px; background:var(--primary); color:#fff; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">
            <i class="fa-solid fa-receipt"></i>
          </div>
          <div>
            <h1 style="margin:0; font-size:22px; color:var(--text-heading);">Đơn hàng của tôi</h1>
            <p class="text-muted" style="margin:4px 0 0 0; font-size:14px;">Tổng cộng ${data.total} đơn hàng</p>
          </div>
        </div>
        <div style="display:flex; gap:12px;">
          <div style="flex:1; position:relative;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
            <input type="text" class="form-input" placeholder="Tìm mã đơn hàng, tên sản phẩm..." style="padding-left:42px; width:100%; border-radius:10px; background: #f8fafc;" disabled />
          </div>
          <button class="btn btn-primary" style="border-radius:10px; padding:0 24px;">Tìm kiếm</button>
        </div>
      </div>
    `;

    // Filter Tabs
    const pendingCount = data.items.filter(i => i.status === 'pending_payment' || i.status === 'pending').length;
    const paidCount = data.items.filter(i => i.status === 'paid').length;
    const completedCount = data.items.filter(i => i.status === 'completed').length;
    const cancelledCount = data.items.filter(i => i.status === 'cancelled' || i.status === 'expired').length;
    const failedCount = data.items.filter(i => i.status === 'failed').length;
    view.innerHTML += `
      <div class="card mb-16" style="padding: 6px;">
        <div style="display:flex; overflow-x:auto; gap:4px; scrollbar-width:none;" id="orders-filter-tabs">
          <button class="btn btn-ghost" data-status="all" style="flex:1; justify-content:center; border-radius:8px; white-space:nowrap; padding: 10px 16px; background:#e2e8f0; color:var(--text-heading); font-weight:600;">Tất cả <span style="background:rgba(0,0,0,0.1); margin-left:8px; padding:2px 8px; border-radius:12px; font-size:12px;">${data.total}</span></button>
          <button class="btn btn-ghost" data-status="pending" style="flex:1; justify-content:center; border-radius:8px; white-space:nowrap; padding: 10px 16px; color:var(--text-secondary);">Đặt hàng <span style="background:#f1f5f9; margin-left:8px; padding:2px 8px; border-radius:12px; font-size:12px;">${pendingCount}</span></button>
          <button class="btn btn-ghost" data-status="paid" style="flex:1; justify-content:center; border-radius:8px; white-space:nowrap; padding: 10px 16px; color:var(--text-secondary);">Đã thanh toán <span style="background:#f1f5f9; margin-left:8px; padding:2px 8px; border-radius:12px; font-size:12px;">${paidCount}</span></button>
          <button class="btn btn-ghost" data-status="completed" style="flex:1; justify-content:center; border-radius:8px; white-space:nowrap; padding: 10px 16px; color:var(--text-secondary);">Đã giao hàng <span style="background:#f1f5f9; margin-left:8px; padding:2px 8px; border-radius:12px; font-size:12px;">${completedCount}</span></button>
          <button class="btn btn-ghost" data-status="cancelled" style="flex:1; justify-content:center; border-radius:8px; white-space:nowrap; padding: 10px 16px; color:var(--text-secondary);">Đã hủy <span style="background:#f1f5f9; margin-left:8px; padding:2px 8px; border-radius:12px; font-size:12px;">${cancelledCount}</span></button>
          <button class="btn btn-ghost" data-status="failed" style="flex:1; justify-content:center; border-radius:8px; white-space:nowrap; padding: 10px 16px; color:var(--text-secondary);">Lỗi <span style="background:#f1f5f9; margin-left:8px; padding:2px 8px; border-radius:12px; font-size:12px;">${failedCount}</span></button>
        </div>
      </div>
    `;

    const listWrap = el('div');
    view.appendChild(listWrap);

    let currentFilter = 'all';

    function renderList() {
      listWrap.innerHTML = '';
      const filtered = currentFilter === 'all' ? data.items : data.items.filter(i => {
        if (currentFilter === 'pending') return i.status === 'pending' || i.status === 'pending_payment';
        if (currentFilter === 'cancelled') return i.status === 'cancelled' || i.status === 'expired';
        return i.status === currentFilter;
      });
      
      if (!filtered.length) { 
        listWrap.innerHTML = `<div class="empty-state"><h3>Chưa có đơn hàng</h3></div>`; 
        return; 
      }

      filtered.forEach(o => {
        const card = el('div', 'card mb-16');
        card.style.padding = '20px';
        
        let stText = 'Lỗi', stColor = '#ef4444', stIcon = 'circle-xmark';
        if (o.status === 'completed') { stText = 'Đã giao hàng'; stColor = '#10b981'; stIcon = 'circle-check'; }
        else if (o.status === 'pending' || o.status === 'pending_payment') { stText = 'Đặt hàng'; stColor = '#f59e0b'; stIcon = 'clock'; }
        else if (o.status === 'paid') { stText = 'Đã thanh toán'; stColor = '#3b82f6'; stIcon = 'credit-card'; }
        else if (o.status === 'cancelled' || o.status === 'expired') { stText = 'Đã hủy'; stColor = '#ef4444'; stIcon = 'circle-xmark'; }
        else if (o.status === 'failed') { stText = 'Lỗi / đã hoàn tiền'; stColor = '#ef4444'; stIcon = 'triangle-exclamation'; }

        const img = orderDisplayImage(o) || `<div style="width:56px; height:56px; border-radius:10px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:24px;"><i class="fa-solid fa-box"></i></div>`;
        const imgHtml = img.startsWith('<') ? img : `<img src="${img}" onerror="${onImgFallback()}" style="width:56px; height:56px; border-radius:10px; object-fit:cover; border:1px solid var(--border);" />`;
        const detailHash = `/orders/${o.order_code}`;

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="font-weight:800; font-size:16px; color:var(--text-heading);">#${o.order_code}</div>
            <div style="font-weight:600; font-size:13px; color:${stColor}; display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-${stIcon}"></i> ${stText}
            </div>
          </div>
          <div style="font-weight:600; font-size:15px; color:var(--text-heading); line-height:1.4; margin-bottom:16px;">${orderSummaryLabel(o)}</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; color:var(--text-muted); font-size:14px; margin-bottom:20px; border-bottom:1px dashed var(--border); padding-bottom:20px;">
            <div>${fmtDate(o.created_at)}</div>
            <div>Tổng tiền: <span style="font-weight:800; color:#10b981; font-size:16px;">${fmt(o.total_amount)}</span></div>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center;">
            ${imgHtml}
            <a href="${detailHash}" class="btn" style="background:#eef2ff; color:var(--primary); border:none; padding:10px 20px; border-radius:8px; font-weight:600;">Xem chi tiết</a>
          </div>
        `;
        listWrap.appendChild(card);
      });
    }

    renderList();

    const tabs = view.querySelectorAll('#orders-filter-tabs button');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => {
          t.style.background = 'transparent';
          t.style.color = 'var(--text-secondary)';
          t.style.fontWeight = 'normal';
          const span = t.querySelector('span');
          if(span) { span.style.background = '#f1f5f9'; span.style.color = 'inherit'; }
        });
        
        tab.style.background = '#e2e8f0';
        tab.style.color = 'var(--text-heading)';
        tab.style.fontWeight = '600';
        const span = tab.querySelector('span');
        if(span) { span.style.background = 'rgba(0,0,0,0.1)'; span.style.color = 'inherit'; }
        
        currentFilter = tab.getAttribute('data-status');
        renderList();
      });
    });

  } catch (e) { view.innerHTML = `<div class="empty-state"><h3>${e.message}</h3></div>`; }
}

// ORDER DETAIL
async function renderOrderDetail(view, { code }) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const query = new URLSearchParams(location.search || '');
    const showCheckoutShell = query.get('checkout') === 'sepay';
    await apiFetch(`/payment/status/${code}`).catch(() => null);
    const [d, checkoutData] = await Promise.all([
      apiFetch(`/orders/my/${code}`),
      showCheckoutShell ? apiFetch(`/payment/checkout-data/${code}`).catch(() => null) : Promise.resolve(null),
    ]);
    view.innerHTML = '';
    
    view.innerHTML += `
      <div style="margin-bottom: 24px;">
        <button onclick="navigateTo('/orders')" class="btn btn-outline" style="background:#fff; border-radius:12px; padding:10px 20px; font-weight:600; border-color:var(--border); color:var(--text-heading);"><i class="fa-solid fa-arrow-left"></i> Quay lại danh sách</button>
      </div>
    `;

    let stText = 'Lỗi', stColor = '#ef4444', stBg = '#fee2e2', stIcon = 'circle-xmark';
    if (d.status === 'completed') { stText = 'Đã giao hàng'; stColor = '#10b981'; stBg = '#ecfdf5'; stIcon = 'circle-check'; }
    else if (d.status === 'pending' || d.status === 'pending_payment') { stText = 'Đặt hàng'; stColor = '#f59e0b'; stBg = '#fef3c7'; stIcon = 'clock'; }
    else if (d.status === 'paid') { stText = 'Đã thanh toán'; stColor = '#3b82f6'; stBg = '#eff6ff'; stIcon = 'credit-card'; }
    else if (d.status === 'failed') { stText = 'Lỗi / đã hoàn tiền'; stColor = '#ef4444'; stBg = '#fee2e2'; stIcon = 'triangle-exclamation'; }

    const grid = el('div', 'checkout-grid');
    const leftCol = el('div');
    
    leftCol.innerHTML += `
      <div class="card mb-16" style="padding: 20px; border-top: 4px solid var(--primary); border-radius: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:700; font-size:16px; color:var(--text-heading);">Chi tiết đơn hàng #${d.order_code}</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-outline btn-sm" style="border-radius:8px; border-color:var(--border); color:var(--text-heading); font-weight:600; padding:6px 12px; font-size:13px;" onclick="navigateTo('/product/${d.product_slug || ''}')"><i class="fa-solid fa-rotate-right"></i> Mua lại</button>
            <div style="color:${stColor}; font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px; white-space:nowrap;">
              <i class="fa-solid fa-${stIcon}"></i> ${stText}
            </div>
          </div>
        </div>
        <div class="text-muted text-sm"><i class="fa-regular fa-calendar"></i> ${fmtDate(d.created_at)}</div>
      </div>
    `;
    
    const img = orderDisplayImage(d) || `<div style="width:56px; height:56px; border-radius:10px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:24px;"><i class="fa-solid fa-box"></i></div>`;
    const imgHtml = img.startsWith('<') ? img : `<img src="${img}" onerror="${onImgFallback()}" style="width:56px; height:56px; border-radius:10px; object-fit:cover; border:1px solid var(--border);" />`;

    const orderItems = Array.isArray(d.items) && d.items.length ? d.items : [{ product_name: d.product_name, package_name: d.package_name, product_img: d.product_img, quantity: d.quantity, line_total: d.total_amount, custom_fields_data: d.custom_fields_data, delivery_data: d.delivery_data, product_slug: d.product_slug }];

    leftCol.innerHTML += `
      <div class="card mb-16" style="overflow: hidden;">
        <div class="cart-summary-head" style="background:#f8fafc; border-bottom:1px solid var(--border); padding:16px 20px;">
          <div class="cart-summary-title" style="color:var(--text-heading); font-size:15px;"><i class="fa-solid fa-box text-primary"></i> Sản phẩm trong đơn</div>
        </div>
        <div class="card-body" style="padding:20px;">
          ${orderItems.map((item, idx) => {
            const itemImg = withImageFallback(item.product_img) || '';
            const itemImgHtml = itemImg ? `<img src="${itemImg}" onerror="${onImgFallback()}" style="width:56px; height:56px; border-radius:10px; object-fit:cover; border:1px solid var(--border);" />` : `<div style="width:56px; height:56px; border-radius:10px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:24px;"><i class="fa-solid fa-box"></i></div>`;
            return `
              <div style="display:flex; gap:16px; align-items:center; ${idx < orderItems.length - 1 ? 'padding-bottom:16px; margin-bottom:16px; border-bottom:1px dashed var(--border);' : ''}">
                ${itemImgHtml}
                <div style="flex:1">
                  <div class="fw-700" style="margin-bottom: 8px; font-size:16px; color:var(--text-heading);">${esc(item.product_name || 'Sản phẩm')}</div>
                  <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                    <div style="display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; padding:4px 10px; border-radius:6px; font-size:13px; font-weight:500; color:#475569;">
                      <i class="fa-solid fa-tag text-primary" style="opacity:0.7"></i> ${esc(item.package_name || 'Gói')}
                    </div>
                    <div class="text-sm text-muted">SL: ${item.quantity || 1}</div>
                    <div class="text-sm" style="font-weight:700; color:var(--primary);">${fmt(item.line_total || 0)}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    leftCol.innerHTML += `
      <div class="card mb-16" style="overflow: hidden;">
        <div class="cart-summary-head" style="background:#f8fafc; border-bottom:1px solid var(--border); padding:16px 20px;">
          <div class="cart-summary-title" style="color:var(--text-heading); font-size:15px;"><i class="fa-solid fa-credit-card text-primary"></i> Thông tin thanh toán</div>
        </div>
        <div class="card-body" style="padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; font-size:15px; color:var(--text-secondary);">
            <div>Giá gốc</div>
            <div style="font-weight:600;">${fmt(d.total_amount)}</div>
          </div>
          <div style="border-top:1px dashed var(--border); margin:16px 0;"></div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:700; font-size:16px; color:var(--text-heading);">Tổng thanh toán</div>
            <div style="font-weight:800; font-size:20px; color:var(--primary);">${fmt(d.total_amount)}</div>
          </div>
        </div>
      </div>
    `;

    const itemsWithFields = orderItems.filter(item => item.custom_fields_data && Object.keys(item.custom_fields_data).length > 0);
    if (itemsWithFields.length > 0) {
      leftCol.innerHTML += `
        <div class="card mb-16" style="overflow: hidden;">
          <div class="cart-summary-head" style="background:#f8fafc; border-bottom:1px solid var(--border); padding:16px 20px;">
            <div class="cart-summary-title" style="color:var(--text-heading); font-size:15px;"><i class="fa-solid fa-list-ul text-primary"></i> Thông tin đơn hàng</div>
          </div>
          <div class="card-body" style="padding:20px;">
            ${itemsWithFields.map(item => `
              <div style="margin-bottom:16px; background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:16px;">
                <div style="font-weight:700; color:var(--text-heading); margin-bottom:12px;">${esc(item.product_name || 'Sản phẩm')} — ${esc(item.package_name || 'Gói')}</div>
                ${Object.entries(item.custom_fields_data || {}).map(([k,v]) => `
                  <div style="margin-bottom:12px;">
                    <div style="color:var(--text-muted); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">${esc(k)}</div>
                    <div style="font-weight:600; font-size:15px; color:var(--text-heading); word-break:break-all;">${esc(v)}</div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (d.status === 'completed' && d.delivery_data) {
      // Parse accounts (split by newline)
      const rawAccounts = d.delivery_data.split('\\n').map(s => s.trim()).filter(Boolean);
      const accounts = rawAccounts.length > 0 ? rawAccounts : [d.delivery_data]; // fallback if not newline-separated
      
      const accListHtml = accounts.map((acc, idx) => `
        <div style="background:#eefdf4; border:1px solid #a7f3d0; border-radius:12px; margin-bottom:12px; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#d1fae5; padding:10px 16px; border-bottom:1px solid #a7f3d0;">
            <div style="color:#059669; font-weight:800; font-size:15px;">#${idx + 1}</div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-sm" style="background:#a7f3d0; color:#059669; border:none; border-radius:6px; padding:6px 10px;" onclick="navigator.clipboard.writeText(\`${acc.replace(/`/g, '\\`')}\`).then(()=>toast('Đã sao chép','success'))" title="Sao chép"><i class="fa-solid fa-copy"></i></button>
              <button class="btn btn-sm" style="background:#fecaca; color:#dc2626; border:none; border-radius:6px; padding:6px 10px;" onclick="openReportErrorModal('${d.order_code}', '${esc(d.product_name)}', \`${acc.replace(/`/g, '\\`')}\`)" title="Báo lỗi tài khoản"><i class="fa-solid fa-bug"></i></button>
            </div>
          </div>
          <div style="padding:16px; font-family:monospace; font-size:15px; color:#064e3b; word-break:break-all; white-space:pre-wrap;">${esc(acc)}</div>
        </div>
      `).join('');

      leftCol.innerHTML += `
        <div class="card mb-16" style="border:1px solid #a7f3d0; overflow:hidden;">
          <div style="background:#d1fae5; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #a7f3d0;">
            <div style="color:#059669; font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-gift"></i> Thông tin tài khoản
            </div>
            <div style="background:#a7f3d0; color:#059669; font-weight:600; font-size:13px; padding:4px 12px; border-radius:20px;">
              ${accounts.length} tài khoản
            </div>
          </div>
          <div class="card-body" style="padding:24px; background:#fff;">
            
            <!-- Actions -->
            <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:12px; margin-bottom:24px;">
              <button class="btn" style="background:#16a34a; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:600;" onclick="navigator.clipboard.writeText(\`${d.delivery_data.replace(/`/g, '\\`')}\`).then(()=>toast('Đã sao chép tất cả','success'))"><i class="fa-solid fa-copy"></i> Sao chép tất cả</button>
              <button class="btn" style="background:#2563eb; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:600;" onclick="downloadFile('${d.order_code}.txt', \`${d.delivery_data.replace(/`/g, '\\`')}\`)"><i class="fa-solid fa-file-lines"></i> Xuất TXT</button>
              <button class="btn" style="background:#334155; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:600;" onclick="downloadFile('${d.order_code}.csv', \`${accounts.join('\\n').replace(/`/g, '\\`')}\`)"><i class="fa-solid fa-file-csv"></i> Xuất CSV</button>
            </div>

            <div style="border-top:1px dashed #cbd5e1; margin-bottom:24px;"></div>

            <!-- Account List -->
            <div>
              ${accListHtml}
            </div>
          </div>
        </div>
      `;
    }

    const rightCol = el('div');
    const sepayData = checkoutData?.sepay || null;
    const sepayItems = checkoutData?.items || orderItems;
    const isSepay = d.payment_method === 'sepay';
    const sepaypending = (d.status === 'pending' || d.status === 'pending_payment') && isSepay;
    const sepaypaid = d.status === 'paid' || d.status === 'completed';
    const sepaycancelled = d.status === 'cancelled' || d.status === 'expired';

    if (showCheckoutShell && isSepay) {
      if (sepaypaid) {
        // Success state inside checkout shell
        rightCol.innerHTML = `
          <div class="checkout-shell-card mb-16">
            <div class="checkout-shell-head">
              <div>
                <div class="checkout-shell-eyebrow">Thanh toán SePay</div>
                <h3>Thanh toán thành công!</h3>
                <p>Đơn hàng đã được thanh toán và đang xử lý giao hàng.</p>
              </div>
              <div class="checkout-shell-status paid"><i class="fa-solid fa-circle-check"></i> Đã thanh toán</div>
            </div>
            <div class="checkout-shell-body">
              <div class="checkout-shell-summary" style="text-align:center; padding:32px 20px;">
                <div style="font-size:64px; color:#10b981; margin-bottom:16px;"><i class="fa-solid fa-circle-check"></i></div>
                <h2 style="margin-bottom:8px; color:var(--text-heading);">Cảm ơn bạn!</h2>
                <p style="color:var(--text-muted); margin-bottom:24px;">Mã đơn: <strong>${d.order_code}</strong> — Tổng: <strong>${fmt(d.total_amount)}</strong></p>
                <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                  <a href="/" class="btn btn-outline"><i class="fa-solid fa-house"></i> Về trang chủ</a>
                  <a href="/orders/${d.order_code}" class="btn btn-primary"><i class="fa-solid fa-receipt"></i> Xem đơn hàng</a>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (sepaycancelled) {
        // Cancelled/expired state
        rightCol.innerHTML = `
          <div class="checkout-shell-card mb-16">
            <div class="checkout-shell-head">
              <div>
                <div class="checkout-shell-eyebrow">Thanh toán SePay</div>
                <h3>Thanh toán không thành công</h3>
                <p>Đơn hàng đã bị huỷ hoặc hết hạn thanh toán.</p>
              </div>
              <div class="checkout-shell-status cancelled"><i class="fa-solid fa-circle-xmark"></i> ${paymentStatusLabel(d.status)}</div>
            </div>
            <div class="checkout-shell-body">
              <div class="checkout-shell-summary" style="text-align:center; padding:32px 20px;">
                <div style="font-size:64px; color:#ef4444; margin-bottom:16px;"><i class="fa-solid fa-circle-xmark"></i></div>
                <h2 style="margin-bottom:8px; color:var(--text-heading);">Đơn hàng đã huỷ</h2>
                <p style="color:var(--text-muted); margin-bottom:24px;">Mã đơn: <strong>${d.order_code}</strong></p>
                <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                  <a href="/" class="btn btn-primary"><i class="fa-solid fa-house"></i> Về trang chủ</a>
                  <a href="/orders" class="btn btn-outline"><i class="fa-solid fa-list"></i> Đơn hàng</a>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (sepaypending && sepayData) {
        // Pending — show QR/bank info shell
        const qrBlock = sepayData.qr_code || sepayData.qrCodeUrl
          ? `<div class="checkout-shell-qr-wrap"><img src="${sepayData.qr_code || sepayData.qrCodeUrl}" alt="QR thanh toán" class="checkout-shell-qr" /></div>`
          : `<div class="checkout-shell-qr-wrap checkout-shell-qr-placeholder"><i class="fa-solid fa-qrcode"></i><span>QR sẽ hiển thị sau khi xử lý</span></div>`;
        const bankMeta = [
          sepayData.account_name ? `<div class="checkout-shell-meta-row"><span>Chủ tài khoản</span><strong>${esc(sepayData.account_name)}</strong></div>` : '',
          sepayData.accountNumber || sepayData.account_number ? `<div class="checkout-shell-meta-row"><span>Số tài khoản</span><strong>${esc(sepayData.accountNumber || sepayData.account_number)}</strong></div>` : '',
          sepayData.bankCode || sepayData.bin ? `<div class="checkout-shell-meta-row"><span>Mã ngân hàng</span><strong>${esc(String(sepayData.bankCode || sepayData.bin))}</strong></div>` : '',
          sepayData.transferContent || sepayData.description ? `<div class="checkout-shell-meta-row"><span>Nội dung CK</span><strong>${esc(sepayData.transferContent || sepayData.description)}</strong></div>` : '',
        ].filter(Boolean).join('');

        rightCol.innerHTML = `
          <div class="checkout-shell-card mb-16">
            <div class="checkout-shell-head">
              <div>
                <div class="checkout-shell-eyebrow">Thanh toán SePay</div>
                <h3>Quét QR hoặc tiếp tục tới PayOS</h3>
                <p>Giữ nguyên giao diện cửa hàng, chỉ chuyển sang PayOS khi bạn cần hoàn tất trên trang cổng thanh toán.</p>
              </div>
              <div class="checkout-shell-status ${d.status}"><i class="fa-solid fa-clock"></i> ${paymentStatusLabel(sepayData.status || 'PENDING')}</div>
            </div>
            <div class="checkout-shell-body">
              <div class="checkout-shell-summary">
                <div class="checkout-shell-total">
                  <span>Tổng cần thanh toán</span>
                  <strong>${fmt(sepayData.amount || d.total_amount || 0)}</strong>
                </div>
                <div class="checkout-shell-items">
                  ${sepayItems.map(item => `
                    <div class="checkout-shell-item">
                      <div class="checkout-shell-item-name">${esc(item.product_name || 'Sản phẩm')} <span>x${item.quantity || 1}</span></div>
                      <div class="checkout-shell-item-meta">${esc(item.package_name || 'Gói')}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="checkout-shell-payment">
                ${qrBlock}
                <div class="checkout-shell-meta">
                  ${bankMeta || '<div class="checkout-shell-meta-row"><span>Thông tin</span><strong>Quét QR hoặc chuyển khoản theo thông tin thanh toán bên dưới</strong></div>'}
                </div>
                <div class="checkout-shell-actions">
                  <button class="btn btn-primary btn-full" id="btn-check-status"><i class="fa-solid fa-rotate"></i> Cập nhật trạng thái thanh toán</button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Fallback pending without checkout data
        rightCol.innerHTML = `
          <div class="card" style="border-color:var(--yellow); background:var(--yellow-light)">
            <div class="card-body">
              <h3 style="margin-top:0; color:#b45309">Chưa thanh toán</h3>
              <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Bạn cần thanh toán đơn hàng này để hệ thống xử lý giao hàng.</p>
              <button class="btn btn-primary btn-full btn-checkout-order"><i class="fa-solid fa-credit-card"></i> Thanh toán ngay</button>
              <button class="btn btn-ghost btn-full mt-8" id="btn-check-status"><i class="fa-solid fa-rotate"></i> Cập nhật trạng thái</button>
            </div>
          </div>
        `;
      }
    } else if (d.status === 'pending' || d.status === 'pending_payment') {
      rightCol.innerHTML = `
        <div class="card" style="border-color:var(--yellow); background:var(--yellow-light)">
          <div class="card-body">
            <h3 style="margin-top:0; color:#b45309">Chưa thanh toán</h3>
            <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Bạn cần thanh toán đơn hàng này để hệ thống xử lý giao hàng.</p>
            <button class="btn btn-primary btn-full btn-checkout-order"><i class="fa-solid fa-credit-card"></i> Thanh toán ngay</button>
            <button class="btn btn-ghost btn-full mt-8" id="btn-check-status"><i class="fa-solid fa-rotate"></i> Cập nhật trạng thái</button>
          </div>
        </div>
      `;
    }

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    view.appendChild(grid);
    
    qs('#btn-check-status', rightCol)?.addEventListener('click', async () => {
      const btn = qs('#btn-check-status', rightCol);
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...'; }
      await apiFetch(`/payment/status/${code}`).catch(() => null);
      renderOrderDetail(view, { code });
    });

    qsa('.btn-checkout-order', rightCol).forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang mở PayOS...';
        try {
          const payment = await apiFetch('/payment/create-link', { method: 'POST', body: JSON.stringify({ order_code: code }) });
          if (payment?.payment_url) window.location.href = payment.payment_url;
          else toast('Không lấy được link PayOS', 'error');
        } catch (err) {
          toast(err.message || 'Không tạo được link PayOS', 'error');
          btn.disabled = false;
          btn.innerHTML = oldHtml;
        }
      });
    });
  } catch (e) { view.innerHTML = `<div class="empty-state"><h3>${e.message}</h3></div>`; }
}

// ── Helpers for Delivery Data ──
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openReportErrorModal(orderCode, productName, accountData) {
  // Create a custom fullscreen overlay specifically for this modal to match the design perfectly
  const overlay = el('div');
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
  
  const modal = el('div');
  modal.style.cssText = 'background:#fff; border-radius:12px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);';
  
  modal.innerHTML = `
    <div style="background: linear-gradient(135deg, #1e3a8a, #0d9488); color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
      <h3 style="margin:0; font-size:18px; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-bug"></i> Báo lỗi tài khoản</h3>
      <button id="btn-close-custom-modal" style="background:rgba(255,255,255,0.2); border:none; color:#fff; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div style="padding:24px;">
      <div style="background:#f8fafc; border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:20px;">
        <div style="display:flex; margin-bottom:12px;"><div style="width:100px; color:var(--text-secondary); font-weight:600;">Đơn hàng:</div><div style="font-weight:700; color:var(--text-heading);">#${orderCode}</div></div>
        <div style="display:flex; margin-bottom:12px;"><div style="width:100px; color:var(--text-secondary); font-weight:600;">Sản phẩm:</div><div style="font-weight:600; color:var(--text-heading);">${productName}</div></div>
        <div style="color:var(--text-secondary); font-weight:600; margin-bottom:8px;">Tài khoản lỗi:</div>
        <div style="background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px; border-radius:8px; font-family:monospace; font-size:14px; word-break:break-all;">${esc(accountData)}</div>
      </div>
      
      <div style="margin-bottom:24px;">
        <label style="display:block; font-weight:700; margin-bottom:8px; font-size:14px; color:var(--text-heading)">Mô tả lỗi <span style="color:#ef4444">*</span></label>
        <textarea id="error-desc" class="form-input" rows="4" placeholder="Mô tả chi tiết lỗi bạn gặp phải với tài khoản này..." style="border-radius:8px; resize:none; width:100%; border:1px solid var(--border); padding:12px; font-family:inherit;"></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button class="btn btn-outline" id="btn-cancel-custom-modal" style="background:#f1f5f9; border:none; color:var(--text-secondary); padding:10px 20px; border-radius:8px; font-weight:600;">Đóng</button>
        <button class="btn btn-primary" id="btn-submit-error" style="background: linear-gradient(135deg, #1e3a8a, #0d9488); border:none; padding:10px 20px; border-radius:8px; font-weight:600;"><i class="fa-solid fa-paper-plane"></i> Gửi báo lỗi</button>
      </div>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeCustomModal = () => document.body.removeChild(overlay);
  
  qs('#btn-close-custom-modal', modal).onclick = closeCustomModal;
  qs('#btn-cancel-custom-modal', modal).onclick = closeCustomModal;
  
  // Close on outside click
  overlay.onclick = (e) => { if (e.target === overlay) closeCustomModal(); };
  
  qs('#btn-submit-error', modal).onclick = async () => {
    const desc = qs('#error-desc', modal).value.trim();
    if (!desc) return toast('Vui lòng nhập mô tả lỗi', 'error');
    
    const btn = qs('#btn-submit-error', modal);
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
    
    try {
      await apiFetch('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: `Báo lỗi tài khoản đơn hàng #${orderCode}`,
          content: `Sản phẩm: ${productName}\n\nTài khoản lỗi:\n${accountData}\n\nMô tả lỗi của khách hàng:\n${desc}`
        })
      });
      closeCustomModal();
      toast('Đã gửi báo lỗi thành công. Chúng tôi sẽ kiểm tra và phản hồi sớm!', 'success', 5000);
    } catch (e) {
      toast(e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi báo lỗi';
    }
  };
}

// ═══════════════════════════════════════════════════════════════
//  ANIME.JS STOREFRONT ANIMATIONS
// ═══════════════════════════════════════════════════════════════

function sfAnimate(container) {
  if (typeof anime === 'undefined' || !anime.animate) return;

  // Banner slider fade + scale
  const bannerSlider = container.querySelector('.banner-slider');
  if (bannerSlider) {
    anime.animate(bannerSlider, {
      opacity: [0, 1], scale: [0.97, 1],
      duration: 600, ease: 'outExpo'
    });
  }

  // Banner grid cards staggered
  const bannerCards = container.querySelectorAll('.banner-card');
  if (bannerCards.length) {
    anime.animate(bannerCards, {
      opacity: [0, 1], translateY: [30, 0], scale: [0.95, 1],
      duration: 500, ease: 'outExpo',
      delay: anime.stagger(80, { start: 200 })
    });
  }

  // Section headers slide in
  const sectionHeads = container.querySelectorAll('.section-head');
  if (sectionHeads.length) {
    anime.animate(sectionHeads, {
      opacity: [0, 1], translateX: [-20, 0],
      duration: 500, ease: 'outExpo',
      delay: anime.stagger(60, { start: 100 })
    });
  }

  // Flash sale cards pop in
  const flashCards = container.querySelectorAll('.flash-card');
  if (flashCards.length) {
    anime.animate(flashCards, {
      opacity: [0, 1], translateY: [25, 0], scale: [0.92, 1],
      duration: 500, ease: 'outBack(1.4)',
      delay: anime.stagger(60, { start: 150 })
    });
  }

  // Game cards staggered entrance
  const gameCards = container.querySelectorAll('.home-game-card');
  if (gameCards.length) {
    anime.animate(gameCards, {
      opacity: [0, 1], translateY: [20, 0],
      duration: 450, ease: 'outExpo',
      delay: anime.stagger(40, { start: 200 })
    });
  }

  // Gift card tabs slide in
  const gcTabs = container.querySelectorAll('.gc-tab');
  if (gcTabs.length) {
    anime.animate(gcTabs, {
      opacity: [0, 1], translateX: [-15, 0],
      duration: 400, ease: 'outExpo',
      delay: anime.stagger(50, { start: 100 })
    });
  }

  // Gift cards staggered pop
  const gcCards = container.querySelectorAll('.gc-card');
  if (gcCards.length) {
    anime.animate(gcCards, {
      opacity: [0, 1], scale: [0.9, 1],
      duration: 450, ease: 'outBack(1.3)',
      delay: anime.stagger(50, { start: 200 })
    });
  }

  // Product grid cards (category/search pages)
  const prodCards = container.querySelectorAll('.product-grid > *');
  if (prodCards.length) {
    anime.animate(prodCards, {
      opacity: [0, 1], translateY: [24, 0],
      duration: 450, ease: 'outExpo',
      delay: anime.stagger(40, { start: 100 })
    });
  }

  // Wishlist scroll items
  const wlCards = container.querySelectorAll('.home-wl-scroll > *');
  if (wlCards.length) {
    anime.animate(wlCards, {
      opacity: [0, 1], translateX: [30, 0],
      duration: 450, ease: 'outExpo',
      delay: anime.stagger(60, { start: 250 })
    });
  }

  // Announcements
  const announcements = container.querySelectorAll('.ann-card');
  if (announcements.length) {
    anime.animate(announcements, {
      opacity: [0, 1], translateY: [15, 0],
      duration: 400, ease: 'outExpo',
      delay: anime.stagger(50, { start: 150 })
    });
  }
}

// Animate gift card grid on tab switch
function sfAnimateGcGrid(gridEl) {
  if (typeof anime === 'undefined' || !anime.animate) return;
  const cards = gridEl.querySelectorAll('.gc-card');
  if (cards.length) {
    anime.animate(cards, {
      opacity: [0, 1], scale: [0.88, 1], translateY: [15, 0],
      duration: 400, ease: 'outBack(1.3)',
      delay: anime.stagger(40)
    });
  }
}

// Detail page animations
function sfAnimateDetail(container) {
  if (typeof anime === 'undefined' || !anime.animate) return;

  // Top section entrance
  const topSection = container.querySelector('.pd-top-section');
  if (topSection) {
    anime.animate(topSection, {
      opacity: [0, 1], translateY: [20, 0],
      duration: 500, ease: 'outExpo'
    });
  }

  // Gift card title pop
  const gcName = container.querySelector('.pd-gc-name');
  if (gcName) {
    anime.animate(gcName, {
      opacity: [0, 1], scale: [0.85, 1],
      duration: 600, ease: 'outBack(1.5)', delay: 150
    });
  }

  // Game header thumb
  const gameThumb = container.querySelector('.pd-game-thumb');
  if (gameThumb) {
    anime.animate(gameThumb, {
      opacity: [0, 1], scale: [0.9, 1], rotate: [-3, 0],
      duration: 500, ease: 'outBack(1.4)', delay: 100
    });
  }

  // Cards staggered
  const pdCards = container.querySelectorAll('.pd-card');
  if (pdCards.length) {
    anime.animate(pdCards, {
      opacity: [0, 1], translateY: [30, 0],
      duration: 500, ease: 'outExpo',
      delay: anime.stagger(80, { start: 200 })
    });
  }

  // Package cards pop in
  const pkgCards = container.querySelectorAll('.pd-gcpkg-card, .pd-gpkg-card, .pd-pkg-card');
  if (pkgCards.length) {
    anime.animate(pkgCards, {
      opacity: [0, 1], scale: [0.88, 1],
      duration: 400, ease: 'outBack(1.3)',
      delay: anime.stagger(60, { start: 300 })
    });
  }

  // Breadcrumb
  const bc = container.querySelector('.breadcrumb');
  if (bc) {
    anime.animate(bc, {
      opacity: [0, 1], translateX: [-15, 0],
      duration: 400, ease: 'outExpo', delay: 50
    });
  }

  // Rating row
  const ratingRow = container.querySelector('.pd-rating-row');
  if (ratingRow) {
    anime.animate(ratingRow, {
      opacity: [0, 1], translateY: [10, 0],
      duration: 400, ease: 'outExpo', delay: 250
    });
  }

  // Reviews staggered
  const reviews = container.querySelectorAll('.pd-review-item');
  if (reviews.length) {
    anime.animate(reviews, {
      opacity: [0, 1], translateY: [20, 0],
      duration: 400, ease: 'outExpo',
      delay: anime.stagger(60, { start: 400 })
    });
  }
}
