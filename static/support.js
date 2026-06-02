/**
 * Support System JS
 * All render functions use `view` (#app-view) — NEVER write to .main-content
 * Uses same design components as storefront: .products-hero, .info-card, etc.
 */

// ─── SUPPORT PAGES (warranty, faq, privacy, etc) ────

async function renderSupportPage(slug) {
  const view = qs('#app-view');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  const fallbackTitles = {
    warranty: 'Chính sách bảo hành',
    'purchase-guide': 'Hướng dẫn mua hàng',
    faq: 'Câu hỏi thường gặp',
    privacy: 'Chính sách bảo mật',
  };
  try {
    const page = await apiFetch(`/support/pages/${slug}`);
    view.innerHTML = '';

    const articleHtml = `
      <div class="support-article-header">
        <h1 class="support-article-title">${page.title}</h1>
        <div class="support-article-meta">
          <span><i class="fa-solid fa-calendar"></i> Cập nhật: ${fmtDate(page.updated_at || page.created_at || new Date())}</span>
        </div>
      </div>
      <article class="support-article">${page.content}</article>
    `;
    const container = el('div', 'support-article-container');
    container.innerHTML = articleHtml;
    view.appendChild(container);
    window.scrollTo(0, 0);
  } catch (err) {
    const title = fallbackTitles[slug] || 'Trang hỗ trợ';
    view.innerHTML = `
      <div class="support-article-container">
        <div class="support-article-header">
          <h1 class="support-article-title">${title}</h1>
        </div>
        <div class="empty-state" style="margin-top:12px;">
          <div class="empty-state-icon"><i class="fa-solid fa-circle-info" style="font-size:36px;color:var(--text-muted);"></i></div>
          <h3>Chưa có thông tin</h3>
          <p class="text-muted">Nội dung cho trang này chưa được cập nhật.</p>
          <a href="/support" class="btn btn-primary mt-12">Quay lại Hỗ trợ</a>
        </div>
      </div>`;
  }
}

// ─── SUPPORT HOME ────────────────────────────────────

async function renderSupportHome(view) {  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const pages = await apiFetch("/support/pages").catch(() => []);

    const contactEmail = appSettings.contact_email || '';
    const contactPhone = appSettings.contact_phone || '';
    const contactHours = appSettings.contact_hours || '8:00 - 22:00';
    const fb = appSettings.social_fb || '';
    const tele = appSettings.social_tele || '';
    const discord = appSettings.social_discord || '';

    const pageMeta = {
      warranty:         { icon: "fa-shield-halved", color: "#3b82f6" },
      "purchase-guide": { icon: "fa-book-open",     color: "#10b981" },
      faq:              { icon: "fa-circle-question",color: "#f59e0b" },
      privacy:          { icon: "fa-lock",           color: "#334155" },
    };

    view.innerHTML = '';

    // Hero
    const hero = el('div', 'products-hero');
    hero.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Hỗ trợ</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-headset"></i> Hỗ trợ & Liên hệ</h1>
      <p class="products-hero-desc">Chúng tôi luôn sẵn sàng giúp đỡ bạn mọi lúc</p>
    `;
    view.appendChild(hero);

    // Contact Info Card
    const contactCard = el('div', 'info-card');
    contactCard.innerHTML = `
      <div class="info-card-head">
        <div class="info-card-title"><i class="fa-solid fa-address-book"></i> Thông tin liên hệ</div>
      </div>
      <div class="info-card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-envelope" style="color:#3b82f6;font-size:18px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Email</div>
              <a href="mailto:${contactEmail}" style="color:var(--text-heading);font-weight:600;font-size:14px;text-decoration:none;">${contactEmail}</a>
            </div>
          </div>
          ${contactPhone ? `
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-phone" style="color:#10b981;font-size:18px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Hotline</div>
              <a href="tel:${contactPhone}" style="color:var(--text-heading);font-weight:600;font-size:14px;text-decoration:none;">${contactPhone}</a>
            </div>
          </div>` : ''}
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:#fef3c7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-clock" style="color:#f59e0b;font-size:18px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Giờ làm việc</div>
              <div style="color:var(--text-heading);font-weight:600;font-size:14px;">${contactHours}</div>
            </div>
          </div>
          ${fb || tele || discord ? `
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:#f3e8ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid fa-share-nodes" style="color:#a855f7;font-size:18px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Mạng xã hội</div>
              <div style="display:flex; gap:8px; margin-top:2px;">
                ${fb ? `<a href="${fb}" target="_blank" style="color:#1877F2;font-size:18px;" title="Facebook"><i class="fa-brands fa-facebook"></i></a>` : ''}
                ${tele ? `<a href="${tele}" target="_blank" style="color:#229ED9;font-size:18px;" title="Telegram"><i class="fa-brands fa-telegram"></i></a>` : ''}
                ${discord ? `<a href="${discord}" target="_blank" style="color:#5865F2;font-size:18px;" title="Discord"><i class="fa-brands fa-discord"></i></a>` : ''}
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
    view.appendChild(contactCard);

    // Support Pages Card
    if (pages.length) {
      const pagesCard = el('div', 'info-card');
      pagesCard.innerHTML = `
        <div class="info-card-head">
          <div class="info-card-title"><i class="fa-solid fa-book"></i> Thông tin & Chính sách</div>
        </div>
        <div class="info-card-body" style="padding:0;">
          ${pages.map(p => {
            const meta = pageMeta[p.slug] || { icon: "fa-file-lines", color: "#6b7280" };
            return `
            <a href="/support/${p.slug}" style="display:flex;align-items:center;gap:14px;padding:16px 20px;text-decoration:none;border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background='var(--bg-page)'" onmouseout="this.style.background='transparent'">
              <div style="width:40px;height:40px;border-radius:10px;background:${meta.color}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fa-solid ${meta.icon}" style="color:${meta.color};font-size:16px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:14px;color:var(--text-heading);">${p.title}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>`;
          }).join('')}
        </div>
      `;
      view.appendChild(pagesCard);
    }

    // Create Ticket Card
    const ticketCard = el('div', 'info-card');
    ticketCard.innerHTML = `
      <div class="info-card-head" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="info-card-title"><i class="fa-solid fa-paper-plane"></i> Gửi yêu cầu hỗ trợ</div>
        <a href="/support/tickets" style="color:rgba(255,255,255,.8);font-size:13px;text-decoration:none;font-weight:500;">Xem yêu cầu của tôi →</a>
      </div>
      <div class="info-card-body">
        ${currentUser ? `
        <form id="support-ticket-form">
          <div class="support-form-row">
            <div class="form-group">
              <label>Tiêu đề</label>
              <input type="text" name="subject" required class="form-input" placeholder="Vấn đề của bạn...">
            </div>
            <div class="form-group">
              <label>Danh mục</label>
              <select name="category" class="form-select">
                <option value="general">Chung</option>
                <option value="order">Đơn hàng</option>
                <option value="product">Sản phẩm</option>
                <option value="payment">Thanh toán</option>
                <option value="account">Tài khoản</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Mô tả chi tiết</label>
            <textarea name="message" required class="form-textarea" rows="4" placeholder="Mô tả chi tiết vấn đề..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Gửi yêu cầu</button>
        </form>
        ` : `
        <div style="text-align:center;padding:24px 0;">
          <p style="color:var(--text-muted);margin:0 0 12px;">Vui lòng đăng nhập để gửi yêu cầu hỗ trợ</p>
          <a href="/login" class="btn btn-primary">Đăng nhập</a>
        </div>
        `}
      </div>
    `;
    view.appendChild(ticketCard);

    // Ticket form handler + URL pre-fill
    if (currentUser) {
      const form = qs('#support-ticket-form');
      if (form) {
        // Pre-fill from URL params (e.g. /support?subject=...&category=...&message=...)
        try {
          const params = new URLSearchParams(location.search || '');
          const preSubject = params.get('subject');
          const preCategory = params.get('category');
          const preMessage = params.get('message');
          if (preSubject) {
            const f = form.querySelector('[name="subject"]');
            if (f) f.value = preSubject;
          }
          if (preCategory) {
            const f = form.querySelector('[name="category"]');
            if (f) f.value = preCategory;
          }
          if (preMessage) {
            const f = form.querySelector('[name="message"]');
            if (f) f.value = preMessage;
          }
          if (preSubject || preMessage) {
            // Scroll the form into view and focus
            setTimeout(() => {
              form.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const m = form.querySelector('[name="message"]');
              if (m) m.focus();
            }, 100);
          }
        } catch (_) {}
        // Pre-fill from URL query (?subject=...&category=...&message=...)
        try {
          const sp = new URLSearchParams(location.search || '');
          const preSubject = sp.get('subject');
          const preCategory = sp.get('category');
          const preMessage = sp.get('message');
          if (preSubject) form.elements['subject'].value = preSubject;
          if (preCategory) form.elements['category'].value = preCategory;
          if (preMessage) form.elements['message'].value = preMessage;
          if (preSubject || preMessage) {
            setTimeout(() => form.elements['message']?.focus(), 50);
          }
        } catch (_) {}
        form.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          try {
            await apiFetch('/support/tickets', {
              method: 'POST',
              body: JSON.stringify({
                subject: fd.get('subject'),
                category: fd.get('category'),
                message: fd.get('message'),
                priority: 'normal'
              })
            });
            toast('Đã gửi yêu cầu hỗ trợ!', 'success');
            form.reset();
          } catch (err) {
            toast(err.message || 'Lỗi gửi yêu cầu', 'error');
          }
        };
      }
    }
    window.scrollTo(0, 0);
  } catch (err) {
    view.innerHTML = `<div class="empty-state" style="margin-top:40px;"><h3>Không thể tải trang hỗ trợ</h3></div>`;
  }
}

// ─── USER TICKETS LIST ──────────────────────────────

async function renderUserTickets(view) {
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const tickets = await apiFetch('/support/tickets');
    view.innerHTML = '';

    const hero = el('div', 'products-hero');
    hero.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <a href="/support">Hỗ trợ</a> <span>›</span> <strong>Yêu cầu của tôi</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-clipboard-list"></i> Yêu cầu hỗ trợ</h1>
      <p class="products-hero-desc">Theo dõi trạng thái các yêu cầu hỗ trợ của bạn</p>
    `;
    view.appendChild(hero);

    const card = el('div', 'info-card');
    card.innerHTML = `
      <div class="info-card-head" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="info-card-title"><i class="fa-solid fa-list"></i> Danh sách yêu cầu</div>
        <a href="/support" style="color:rgba(255,255,255,.8);font-size:13px;text-decoration:none;font-weight:500;">← Quay lại Hỗ trợ</a>
      </div>
      <div class="info-card-body" style="padding:0;">
        ${tickets.length ? tickets.map(t => `
          <a href="/support/tickets/${t.id}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;text-decoration:none;border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background='var(--bg-page)'" onmouseout="this.style.background='transparent'">
            <div>
              <div style="font-weight:600;font-size:14px;color:var(--text-heading);">${t.subject}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">#${t.ticket_number || t.id} · ${t.category || 'Chung'} · ${new Date(t.created_at).toLocaleDateString('vi-VN')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge badge-${t.status === 'open' ? 'blue' : t.status === 'closed' ? 'gray' : 'yellow'}">${statusLabel(t.status)}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </a>
        `).join('') : `
          <div style="text-align:center;padding:48px 20px;">
            <i class="fa-solid fa-inbox" style="font-size:36px;color:var(--text-muted);margin-bottom:12px;"></i>
            <p style="color:var(--text-muted);">Bạn chưa có yêu cầu hỗ trợ nào</p>
            <a href="/support" class="btn btn-primary mt-12">Tạo yêu cầu mới</a>
          </div>
        `}
      </div>
    `;
    view.appendChild(card);
    window.scrollTo(0, 0);
  } catch (err) {
    view.innerHTML = `<div class="empty-state" style="margin-top:40px;"><h3>Vui lòng đăng nhập</h3><a href="/login" class="btn btn-primary mt-12">Đăng nhập</a></div>`;
  }
}

// ─── TICKET DETAIL ──────────────────────────────────

async function renderTicketDetail(ticketId) {
  const view = qs('#app-view');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  try {
    const ticket = await apiFetch(`/support/tickets/${ticketId}`);
    const messages = await apiFetch(`/support/tickets/${ticketId}/messages`).catch(() => []);
    view.innerHTML = '';

    const hero = el('div', 'products-hero');
    hero.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <a href="/support">Hỗ trợ</a> <span>›</span> <a href="/support/tickets">Yêu cầu</a> <span>›</span> <strong>#${ticket.ticket_number || ticket.id}</strong></div>
      <h1 class="products-hero-title">${ticket.subject}</h1>
      <p class="products-hero-desc">
        <span class="badge badge-${ticket.status === 'open' ? 'blue' : ticket.status === 'closed' ? 'gray' : 'yellow'}" style="margin-right:8px;">${statusLabel(ticket.status)}</span>
        <span class="badge badge-${ticket.priority === 'high' || ticket.priority === 'urgent' ? 'red' : 'gray'}">${priorityLabel(ticket.priority)}</span>
        <span style="margin-left:12px;opacity:.8;">${ticket.category || 'Chung'} · ${new Date(ticket.created_at).toLocaleDateString('vi-VN')}</span>
      </p>
    `;
    view.appendChild(hero);

    // Messages Card
    const msgCard = el('div', 'info-card');
    msgCard.innerHTML = `
      <div class="info-card-head">
        <div class="info-card-title"><i class="fa-solid fa-comments"></i> Tin nhắn (${messages.length})</div>
      </div>
      <div class="info-card-body" style="padding:0;">
        ${messages.map(msg => {
          const avatarUrl = withAvatarFallback(msg.sender_avatar_url || (msg.sender_type === 'admin' ? '' : currentUser?.avatar_url));
          const avatarHtml = avatarUrl
            ? `<img class="support-msg-avatar" src="${avatarUrl}" alt="${msg.sender_name}" onerror="${onImgFallback('avatar')}" />`
            : `<div class="support-msg-avatar support-msg-avatar-fallback">${esc((msg.sender_name || 'U').charAt(0).toUpperCase())}</div>`;
          return `
          <div class="support-msg-row${msg.sender_type === 'admin' ? ' is-admin' : ''}">
            <div class="support-msg-avatar-wrap">${avatarHtml}</div>
            <div class="support-msg-bubble">
              <div class="support-msg-head">
                <strong class="support-msg-name${msg.sender_type === 'admin' ? ' is-admin' : ''}">
                  ${msg.sender_name}
                  ${msg.sender_type === 'admin' ? '<span class="support-msg-badge">Admin</span>' : ''}
                </strong>
                <span class="support-msg-time">${new Date(msg.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div class="support-msg-text">${msg.message}</div>
            </div>
          </div>
        `;}).join('')}
        ${!messages.length ? '<div style="padding:32px 20px;text-align:center;color:var(--text-muted);">Chưa có tin nhắn</div>' : ''}
      </div>
    `;
    view.appendChild(msgCard);

    // Reply Card
    if (ticket.status !== 'closed') {
      const replyCard = el('div', 'info-card');
      replyCard.innerHTML = `
        <div class="info-card-head">
          <div class="info-card-title"><i class="fa-solid fa-reply"></i> Phản hồi</div>
        </div>
        <div class="info-card-body">
          <form id="reply-form">
            <textarea name="message" required class="input" rows="4" placeholder="Nhập tin nhắn phản hồi..."></textarea>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;"><i class="fa-solid fa-paper-plane"></i> Gửi phản hồi</button>
          </form>
        </div>
      `;
      view.appendChild(replyCard);

      qs('#reply-form').onsubmit = async (e) => {
        e.preventDefault();
        const msg = qs('#reply-form [name="message"]').value;
        try {
          await apiFetch(`/support/tickets/${ticketId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
              sender_name: currentUser?.name || 'Khách hàng',
              sender_type: 'user',
              message: msg
            })
          });
          toast('Gửi phản hồi thành công', 'success');
          renderTicketDetail(ticketId);
        } catch (err) {
          toast('Lỗi gửi phản hồi', 'error');
        }
      };
    } else {
      const closedNotice = el('div', 'info-card');
      closedNotice.style.cssText = 'text-align:center;padding:20px;background:var(--bg-page);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-muted);';
      closedNotice.textContent = 'Yêu cầu này đã được đóng';
      view.appendChild(closedNotice);
    }
    window.scrollTo(0, 0);
  } catch (err) {
    view.innerHTML = `<div class="empty-state" style="margin-top:40px;"><h3>Không thể tải chi tiết yêu cầu</h3><a href="/support/tickets" class="btn btn-primary mt-12">Quay lại</a></div>`;
  }
}

// ─── HELPERS ─────────────────────────────────────────

function statusLabel(status) {
  return { open: 'Đang mở', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đã đóng' }[status] || status;
}

function priorityLabel(priority) {
  return { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn cấp' }[priority] || priority;
}
