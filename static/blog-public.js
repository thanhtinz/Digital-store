const BLOG_API = '/api/blog';
const blogBoot = window.__BLOG_BOOTSTRAP__ || {};
const blogApp = document.getElementById('blog-app');
const blogState = {
  searchQuery: new URLSearchParams(window.location.search).get('q') || '',
};

const blogEsc = (value) => {
  if (value == null) return '';
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
};

const blogFmtDate = (value) => value
  ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

async function blogFetch(path) {
  const res = await fetch(`${BLOG_API}${path}`);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

function blogMeta(title, description, image, extras = {}) {
  if (title) document.title = title;
  const setMeta = (selector, attr, value) => {
    const node = document.querySelector(selector);
    if (node && value) node.setAttribute(attr, value);
  };
  const keywords = extras.keywords || blogBoot.seoKeywords || blogBoot.siteKeywords || '';
  const author = extras.author || blogBoot.seoAuthor || blogBoot.siteAuthor || blogBoot.siteName || '';
  const canonicalUrl = extras.canonicalUrl || blogBoot.canonicalUrl || window.location.href;
  const twitterCard = extras.twitterCard || blogBoot.twitterCard || 'summary_large_image';
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[name="keywords"]', 'content', keywords);
  setMeta('meta[name="author"]', 'content', author);
  setMeta('link[rel="canonical"]', 'href', canonicalUrl);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:image"]', 'content', image);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[name="twitter:card"]', 'content', twitterCard);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('meta[name="twitter:image"]', 'content', image);
}

function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function buildTree(categories, posts) {
  const grouped = new Map();
  categories.forEach((category) => grouped.set(category.slug, { ...category, posts: [] }));
  posts.forEach((post) => {
    const key = post.category_slug || '__uncategorized__';
    if (!grouped.has(key)) grouped.set(key, { slug: key, name: post.category_name || 'Khác', posts: [] });
    grouped.get(key).posts.push(post);
  });
  return [...grouped.values()].filter((section) => section.posts.length);
}

function flattenTree(tree) {
  return tree.flatMap((section) => section.posts.map((post) => ({ ...post, section_name: section.name })));
}

function buildToc(contentHtml) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = contentHtml || '';
  const headings = [...wrapper.querySelectorAll('h1, h2, h3, h4')];
  const toc = [];
  headings.forEach((heading, index) => {
    const text = heading.textContent?.trim();
    if (!text) return;
    const id = `${slugifyHeading(text) || 'section'}-${index + 1}`;
    heading.id = id;
    toc.push({ id, text, level: Number(heading.tagName.slice(1)) });
  });
  return { html: wrapper.innerHTML, toc };
}

function highlightSearch(text, query) {
  const safeText = blogEsc(text || '');
  const term = String(query || '').trim();
  if (!term) return safeText;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safeText.replace(new RegExp(`(${escaped})`, 'ig'), '<mark class="blog-theme-highlight">$1</mark>');
}

function renderHeader(searchValue = '') {
  const siteName = blogBoot.siteName || 'Journal';
  const logo = blogBoot.logoUrl
    ? `<img src="${blogEsc(blogBoot.logoUrl)}" alt="${blogEsc(siteName)}" class="blog-theme-brand-logo" onerror="this.style.display='none';this.nextElementSibling && (this.nextElementSibling.style.display='inline-flex');" /><span class="blog-theme-brand-mark blog-theme-brand-mark-fallback" style="display:none"><i class="fa-solid fa-feather"></i></span>`
    : '<span class="blog-theme-brand-mark"><i class="fa-solid fa-feather"></i></span>';
  return `
    <header class="blog-theme-header">
      <div class="blog-theme-header-left">
        <button class="blog-theme-hamburger" id="blog-menu-toggle" type="button" aria-label="Menu" aria-expanded="false">
          <i class="fa-solid fa-bars"></i>
        </button>
        <a href="/blog" class="blog-theme-brand">
          ${logo}
          <div>
            <div class="blog-theme-brand-name">${blogEsc(siteName)}</div>
            <div class="blog-theme-brand-sub">Blog</div>
          </div>
        </a>
      </div>
      <div class="blog-theme-header-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="blog-search-input" placeholder="Tìm bài viết..." value="${blogEsc(searchValue)}" />
        <button type="button" id="blog-search-btn">Tìm</button>
      </div>
      <div class="blog-theme-header-actions"></div>
    </header>
  `;
}

function renderSidebar(tree, activeSlug) {
  return `
    <aside class="blog-theme-sidebar" id="blog-theme-sidebar">
      <div class="blog-theme-sidebar-card">
        <div class="blog-theme-sidebar-title">Menu</div>
        <div class="blog-theme-sidebar-links blog-theme-sidebar-links-static">
          <a class="blog-theme-sidebar-link" href="/blog">Trang chủ</a>
          <a class="blog-theme-sidebar-link" href="/">Cửa hàng</a>
        </div>
        ${tree.map((section) => `
          <div class="blog-theme-sidebar-section">
            <div class="blog-theme-sidebar-section-title">Danh mục</div>
            <div class="blog-theme-sidebar-section-name">${blogEsc(section.name)}</div>
            <div class="blog-theme-sidebar-links">
              ${section.posts.map((post) => `<a class="blog-theme-sidebar-link${post.slug === activeSlug ? ' active' : ''}" href="/blog/${encodeURIComponent(post.slug)}">${blogEsc(post.title)}</a>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </aside>
  `;
}

function renderFooter() {
  const siteName = blogBoot.siteName || 'Journal';
  const copyrightText = blogBoot.copyrightText || `Copyright © 2026 ${siteName}. All rights reserved.`;
  return `
    <footer class="blog-theme-footer">
      <div class="blog-theme-footer-inner blog-theme-footer-inner-compact">
        <div class="blog-theme-footer-copy">${blogEsc(copyrightText)}</div>
      </div>
    </footer>
  `;
}

function renderToc(toc) {
  return `
    <aside class="blog-theme-toc">
      <div class="blog-theme-toc-card">
        <div class="blog-theme-toc-title">Mục lục</div>
        ${toc.length ? `<div class="blog-theme-toc-links">${toc.map((item) => `<a class="blog-theme-toc-link level-${item.level}" href="#${item.id}">${blogEsc(item.text)}</a>`).join('')}</div>` : '<div class="blog-theme-toc-empty">Trang này không có mục lục.</div>'}
      </div>
    </aside>
  `;
}

function renderPrevNext(flatPosts, activeSlug) {
  const index = flatPosts.findIndex((item) => item.slug === activeSlug);
  const prev = index > 0 ? flatPosts[index - 1] : null;
  const next = index >= 0 && index < flatPosts.length - 1 ? flatPosts[index + 1] : null;
  if (!prev && !next) return '';
  return `
    <div class="blog-theme-prev-next">
      ${prev ? `<a class="blog-theme-prev-next-card" href="/blog/${encodeURIComponent(prev.slug)}"><span>Bài trước</span><strong>${blogEsc(prev.title)}</strong></a>` : '<span></span>'}
      ${next ? `<a class="blog-theme-prev-next-card align-right" href="/blog/${encodeURIComponent(next.slug)}"><span>Bài sau</span><strong>${blogEsc(next.title)}</strong></a>` : '<span></span>'}
    </div>
  `;
}

function renderShell({ sidebar, content, toc, searchValue = '' }) {
  blogApp.innerHTML = `
    <div class="blog-theme-shell blog-theme-shell-enter">
      ${renderHeader(searchValue)}
      <div class="blog-theme-overlay" id="blog-theme-overlay"></div>
      <div class="blog-theme-main-grid">
        ${sidebar}
        <main class="blog-theme-content">${content}</main>
        ${toc}
      </div>
      ${renderFooter()}
    </div>
  `;

  requestAnimationFrame(() => {
    blogApp.querySelector('.blog-theme-shell')?.classList.add('is-ready');
  });

  const searchInput = document.getElementById('blog-search-input');
  const searchBtn = document.getElementById('blog-search-btn');
  const menuToggle = document.getElementById('blog-menu-toggle');
  const sidebarEl = document.getElementById('blog-theme-sidebar');
  const overlayEl = document.getElementById('blog-theme-overlay');
  let searchTimer = null;

  const setSearchLoading = (loading) => {
    searchBtn?.classList.toggle('loading', loading);
    searchInput?.classList.toggle('loading', loading);
    if (searchBtn) searchBtn.disabled = loading;
  };

  const closeMenu = () => {
    sidebarEl?.classList.remove('open');
    overlayEl?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    sidebarEl?.classList.add('open');
    overlayEl?.classList.add('open');
    menuToggle?.setAttribute('aria-expanded', 'true');
  };

  menuToggle?.addEventListener('click', () => {
    if (sidebarEl?.classList.contains('open')) closeMenu();
    else openMenu();
  });
  overlayEl?.addEventListener('click', closeMenu);
  sidebarEl?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  const submitSearch = async () => {
    const q = (searchInput?.value || '').trim();
    if (q === blogState.searchQuery) return;
    setSearchLoading(true);
    blogState.searchQuery = q;
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    await renderHome();
  };

  const scheduleSearch = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      submitSearch();
    }, 350);
  };

  searchBtn?.addEventListener('click', submitSearch);
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitSearch();
    if (event.key === 'Escape') {
      searchInput.value = '';
      submitSearch();
    }
  });
  searchInput?.addEventListener('input', scheduleSearch);

  const tocLinks = [...document.querySelectorAll('.blog-theme-toc-link')];
  const headings = tocLinks.map((link) => document.getElementById(link.getAttribute('href')?.slice(1) || '')).filter(Boolean);
  if (tocLinks.length && headings.length) {
    const syncActiveToc = () => {
      let activeIndex = 0;
      headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top <= 140) activeIndex = index;
      });
      tocLinks.forEach((link, index) => link.classList.toggle('active', index === activeIndex));
    };
    syncActiveToc();
    window.addEventListener('scroll', syncActiveToc, { passive: true });
  }
}

async function fetchBlogData(searchQuery = '') {
  const categories = await blogFetch('/categories').catch(() => []);
  const params = new URLSearchParams({ page: '1', limit: '50' });
  if (searchQuery) params.set('q', searchQuery);
  const postData = await blogFetch(`/posts?${params.toString()}`);
  const posts = Array.isArray(postData.items) ? postData.items : [];
  const tree = buildTree(categories, posts);
  const flatPosts = flattenTree(tree);
  return { tree, flatPosts };
}

async function renderHome() {
  const searchQuery = blogState.searchQuery;
  const { tree, flatPosts } = await fetchBlogData(searchQuery);
  const featured = flatPosts.slice(0, 6);
  renderShell({
    sidebar: renderSidebar(tree, ''),
    content: featured.length ? `
      <section class="blog-theme-grid">
        ${featured.map((post) => `
          <a class="blog-theme-card" href="/blog/${encodeURIComponent(post.slug)}">
            ${post.thumbnail_url ? `<div class="blog-theme-card-cover"><img src="${blogEsc(post.thumbnail_url)}" alt="${blogEsc(post.title)}" /></div>` : ''}
            <div class="blog-theme-card-body">
              <div class="blog-theme-card-meta">${highlightSearch(post.category_name || post.section_name || 'Blog', searchQuery)} · ${blogFmtDate(post.published_at || post.created_at)}</div>
              <h2>${highlightSearch(post.title, searchQuery)}</h2>
              <p>${highlightSearch(post.excerpt || 'Mở bài viết để xem nội dung chi tiết.', searchQuery)}</p>
            </div>
          </a>
        `).join('')}
      </section>
    ` : '<div class="blog-theme-empty">Chưa có bài viết</div>',
    toc: '',
    searchValue: searchQuery,
  });
  blogMeta(`Blog | ${blogBoot.siteName || ''}`, blogBoot.siteDescription || 'Blog', blogBoot.logoUrl || blogBoot.faviconUrl || '');
}

async function renderPost() {
  const slug = blogBoot.initialSlug || window.location.pathname.split('/').filter(Boolean).pop();
  const [{ tree, flatPosts }, post] = await Promise.all([
    fetchBlogData(),
    blogFetch(`/posts/${encodeURIComponent(slug)}`),
  ]);
  const { html, toc } = buildToc(post.content || '');
  renderShell({
    sidebar: renderSidebar(tree, slug),
    content: `
      <article class="blog-theme-article">
        <div class="blog-theme-article-meta">${post.category_name ? `<span class="blog-theme-chip">${blogEsc(post.category_name)}</span>` : ''}<span>${blogFmtDate(post.published_at || post.created_at)}</span></div>
        <h1 class="blog-theme-article-title">${blogEsc(post.title)}</h1>
        ${post.excerpt ? `<p class="blog-theme-article-excerpt">${blogEsc(post.excerpt)}</p>` : ''}
        ${post.thumbnail_url ? `<div class="blog-theme-article-cover"><img src="${blogEsc(post.thumbnail_url)}" alt="${blogEsc(post.title)}" /></div>` : ''}
        <div class="blog-theme-prose">${html}</div>
        ${renderPrevNext(flatPosts, slug)}
      </article>
    `,
    toc: renderToc(toc),
  });
  blogMeta(post.meta_title || `${post.title} | ${blogBoot.siteName || ''}`, post.meta_description || post.excerpt || blogBoot.siteDescription || '', post.thumbnail_url || blogBoot.logoUrl || blogBoot.faviconUrl || '');
}

async function initBlogTheme() {
  try {
    if ((blogBoot.initialSlug || '').trim()) await renderPost();
    else await renderHome();
  } catch (error) {
    renderShell({
      sidebar: '<aside class="blog-theme-sidebar"></aside>',
      content: `<div class="docs-error"><h1>Không tải được blog</h1><p>${blogEsc(error.message)}</p></div>`,
      toc: '',
    });
  }
}

initBlogTheme();
