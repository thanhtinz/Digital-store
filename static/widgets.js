/* ═══════════════════════════════════════════════════════════════
   Widgets tự chứa: chuông thông báo + live chat (user & admin)
   Dùng globals từ core.js: apiFetch, currentUser, authToken, toast, esc
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const isAdminPage = () => location.pathname.startsWith('/admin');
  const loggedIn = () => !!(window.authToken || (typeof authToken !== 'undefined' && authToken));
  const escq = (s) => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));

  // ─────────────────────────────────────────────────────
  // 1) CHUÔNG THÔNG BÁO (trang người dùng)
  // ─────────────────────────────────────────────────────
  let bellOpen = false;
  function mountBell() {
    if (isAdminPage() || document.querySelector('.noti-bell')) return;
    const btn = document.createElement('button');
    btn.className = 'noti-bell';
    btn.type = 'button';
    btn.title = 'Thông báo';
    btn.innerHTML = '<i class="fa-solid fa-bell"></i><span class="noti-badge" style="display:none">0</span>';
    const panel = document.createElement('div');
    panel.className = 'noti-panel';
    panel.style.display = 'none';
    panel.innerHTML = '<div class="noti-head"><span>Thông báo</span><button class="noti-readall" type="button">Đọc tất cả</button></div><div class="noti-list"></div>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.onclick = async () => {
      bellOpen = !bellOpen;
      panel.style.display = bellOpen ? 'block' : 'none';
      if (bellOpen) await loadNotis(panel);
    };
    panel.querySelector('.noti-readall').onclick = async () => {
      try { await apiFetch('/notifications/read-all', { method: 'POST' }); await loadNotis(panel); refreshBadge(); } catch (e) {}
    };
    document.addEventListener('click', (e) => {
      if (bellOpen && !panel.contains(e.target) && !btn.contains(e.target)) { bellOpen = false; panel.style.display = 'none'; }
    });
    refreshBadge();
    setInterval(refreshBadge, 30000);
  }

  async function refreshBadge() {
    const badge = document.querySelector('.noti-badge');
    const bell = document.querySelector('.noti-bell');
    if (!badge || !bell) return;
    if (!loggedIn()) { bell.style.display = 'none'; return; }
    bell.style.display = 'flex';
    try {
      const r = await apiFetch('/notifications/unread-count');
      const n = r.unread_count || 0;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = n > 0 ? 'flex' : 'none';
    } catch (e) {}
  }

  async function loadNotis(panel) {
    const list = panel.querySelector('.noti-list');
    list.innerHTML = '<div class="noti-empty">Đang tải…</div>';
    try {
      const r = await apiFetch('/notifications?limit=30');
      if (!r.items || !r.items.length) { list.innerHTML = '<div class="noti-empty">Chưa có thông báo</div>'; return; }
      list.innerHTML = '';
      r.items.forEach((n) => {
        const item = document.createElement('div');
        item.className = 'noti-item' + (n.is_read ? '' : ' unread');
        item.innerHTML = `<div class="noti-title">${escq(n.title)}</div>${n.body ? `<div class="noti-body">${escq(n.body)}</div>` : ''}<div class="noti-time">${fmtTime(n.created_at)}</div>`;
        item.onclick = async () => {
          try { await apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }); } catch (e) {}
          refreshBadge();
          if (n.link) location.href = n.link;
        };
        list.appendChild(item);
      });
    } catch (e) { list.innerHTML = '<div class="noti-empty">Không tải được</div>'; }
  }

  // ─────────────────────────────────────────────────────
  // 2) LIVE CHAT — phía người dùng
  // ─────────────────────────────────────────────────────
  let chatOpen = false, lastMsgId = 0, chatPoll = null;
  function mountChat() {
    if (isAdminPage() || document.querySelector('.chat-launcher')) return;
    const launcher = document.createElement('button');
    launcher.className = 'chat-launcher';
    launcher.type = 'button';
    launcher.title = 'Hỗ trợ trực tuyến';
    launcher.innerHTML = '<i class="fa-solid fa-comment-dots"></i>';
    const box = document.createElement('div');
    box.className = 'chat-box';
    box.style.display = 'none';
    box.innerHTML = `
      <div class="chat-head"><span><i class="fa-solid fa-headset"></i> Hỗ trợ</span><button class="chat-close" type="button">✕</button></div>
      <div class="chat-messages"></div>
      <form class="chat-form"><input class="chat-input" placeholder="Nhập tin nhắn…" autocomplete="off" maxlength="4000" /><button type="submit" class="chat-send"><i class="fa-solid fa-paper-plane"></i></button></form>`;
    document.body.appendChild(launcher);
    document.body.appendChild(box);

    launcher.onclick = () => { chatOpen ? closeChat(box) : openChat(box); };
    box.querySelector('.chat-close').onclick = () => closeChat(box);
    box.querySelector('.chat-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = box.querySelector('.chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      try {
        const r = await apiFetch('/chat/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
        if (r.message) { appendMsg(box, r.message); lastMsgId = Math.max(lastMsgId, r.message.id); }
      } catch (err) { toast && toast(err.message || 'Gửi lỗi', 'error'); }
    };
  }

  async function openChat(box) {
    if (!loggedIn()) { toast && toast('Vui lòng đăng nhập để chat với hỗ trợ', 'info'); location.href = '/login'; return; }
    chatOpen = true; box.style.display = 'flex';
    const wrap = box.querySelector('.chat-messages');
    wrap.innerHTML = '<div class="chat-empty">Đang tải…</div>';
    try {
      const r = await apiFetch('/chat/my');
      wrap.innerHTML = '';
      if (!r.messages.length) wrap.innerHTML = '<div class="chat-empty">Xin chào! Chúng tôi có thể giúp gì cho bạn?</div>';
      r.messages.forEach((m) => { appendMsg(box, m); lastMsgId = Math.max(lastMsgId, m.id); });
    } catch (e) { wrap.innerHTML = '<div class="chat-empty">Không tải được hội thoại</div>'; }
    if (chatPoll) clearInterval(chatPoll);
    chatPoll = setInterval(() => pollChat(box), 4000);
  }
  function closeChat(box) { chatOpen = false; box.style.display = 'none'; if (chatPoll) { clearInterval(chatPoll); chatPoll = null; } }

  async function pollChat(box) {
    try {
      const r = await apiFetch(`/chat/poll?after=${lastMsgId}`);
      (r.messages || []).forEach((m) => { appendMsg(box, m); lastMsgId = Math.max(lastMsgId, m.id); });
    } catch (e) {}
  }
  function appendMsg(box, m) {
    const wrap = box.querySelector('.chat-messages');
    const empty = wrap.querySelector('.chat-empty'); if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (m.sender === 'admin' ? 'from-admin' : 'from-user');
    div.innerHTML = `<div class="chat-bubble">${escq(m.body)}</div>`;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  // ─────────────────────────────────────────────────────
  // 3) LIVE CHAT — phía ADMIN (chỉ trang /admin)
  // ─────────────────────────────────────────────────────
  let adminChatOpen = false, adminConvId = null, adminLastId = 0, adminPoll = null;
  function mountAdminChat() {
    if (!isAdminPage() || document.querySelector('.achat-launcher')) return;
    const launcher = document.createElement('button');
    launcher.className = 'achat-launcher';
    launcher.type = 'button';
    launcher.title = 'Hộp thoại hỗ trợ';
    launcher.innerHTML = '<i class="fa-solid fa-comments"></i><span class="achat-badge" style="display:none">0</span>';
    const box = document.createElement('div');
    box.className = 'achat-box';
    box.style.display = 'none';
    box.innerHTML = `
      <div class="chat-head"><span><i class="fa-solid fa-comments"></i> Hỗ trợ khách hàng</span><button class="achat-close" type="button">✕</button></div>
      <div class="achat-body"><div class="achat-list"></div><div class="achat-thread"><div class="achat-msgs"><div class="chat-empty">Chọn một hội thoại</div></div><form class="achat-form" style="display:none"><input class="achat-input" placeholder="Trả lời…" autocomplete="off" /><button type="submit" class="chat-send"><i class="fa-solid fa-paper-plane"></i></button></form></div></div>`;
    document.body.appendChild(launcher);
    document.body.appendChild(box);

    launcher.onclick = () => { adminChatOpen = !adminChatOpen; box.style.display = adminChatOpen ? 'flex' : 'none'; if (adminChatOpen) loadConvs(box); };
    box.querySelector('.achat-close').onclick = () => { adminChatOpen = false; box.style.display = 'none'; if (adminPoll) clearInterval(adminPoll); };
    box.querySelector('.achat-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!adminConvId) return;
      const input = box.querySelector('.achat-input');
      const msg = input.value.trim(); if (!msg) return; input.value = '';
      try {
        const r = await apiFetch(`/chat/admin/conversations/${adminConvId}/reply`, { method: 'POST', body: JSON.stringify({ message: msg }) });
        if (r.message) { appendAdminMsg(box, r.message); adminLastId = Math.max(adminLastId, r.message.id); }
      } catch (err) { toast && toast(err.message || 'Lỗi', 'error'); }
    };
    refreshAdminBadge();
    setInterval(refreshAdminBadge, 30000);
  }

  async function refreshAdminBadge() {
    const badge = document.querySelector('.achat-badge');
    if (!badge) return;
    try {
      const r = await apiFetch('/chat/admin/unread-total');
      const n = r.unread_total || 0;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = n > 0 ? 'flex' : 'none';
    } catch (e) { /* không phải admin -> bỏ qua */ }
  }

  async function loadConvs(box) {
    const list = box.querySelector('.achat-list');
    list.innerHTML = '<div class="chat-empty">Đang tải…</div>';
    try {
      const r = await apiFetch('/chat/admin/conversations?status=open');
      if (!r.items.length) { list.innerHTML = '<div class="chat-empty">Chưa có hội thoại</div>'; return; }
      list.innerHTML = '';
      r.items.forEach((c) => {
        const row = document.createElement('div');
        row.className = 'achat-conv' + (c.unread_admin > 0 ? ' unread' : '');
        row.innerHTML = `<div class="achat-conv-name">${escq(c.user_name || 'Khách')}${c.unread_admin > 0 ? ` <span class="achat-dot">${c.unread_admin}</span>` : ''}</div><div class="achat-conv-last">${escq(c.last_message || '')}</div>`;
        row.onclick = () => openConv(box, c.id);
        list.appendChild(row);
      });
    } catch (e) { list.innerHTML = '<div class="chat-empty">Không tải được (cần quyền admin)</div>'; }
  }

  async function openConv(box, id) {
    adminConvId = id; adminLastId = 0;
    box.querySelectorAll('.achat-conv').forEach((r) => r.classList.remove('active'));
    const msgs = box.querySelector('.achat-msgs');
    msgs.innerHTML = '<div class="chat-empty">Đang tải…</div>';
    box.querySelector('.achat-form').style.display = 'flex';
    try {
      const r = await apiFetch(`/chat/admin/conversations/${id}`);
      msgs.innerHTML = '';
      r.messages.forEach((m) => { appendAdminMsg(box, m); adminLastId = Math.max(adminLastId, m.id); });
      refreshAdminBadge();
    } catch (e) { msgs.innerHTML = '<div class="chat-empty">Lỗi tải</div>'; }
    if (adminPoll) clearInterval(adminPoll);
    adminPoll = setInterval(async () => {
      if (!adminConvId) return;
      try {
        const r = await apiFetch(`/chat/admin/conversations/${adminConvId}`);
        const newer = r.messages.filter((m) => m.id > adminLastId);
        newer.forEach((m) => { appendAdminMsg(box, m); adminLastId = Math.max(adminLastId, m.id); });
      } catch (e) {}
    }, 5000);
  }
  function appendAdminMsg(box, m) {
    const wrap = box.querySelector('.achat-msgs');
    const empty = wrap.querySelector('.chat-empty'); if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (m.sender === 'admin' ? 'from-user' : 'from-admin');
    div.innerHTML = `<div class="chat-bubble">${escq(m.body)}</div>`;
    wrap.appendChild(div); wrap.scrollTop = wrap.scrollHeight;
  }

  // ─────────────────────────────────────────────────────
  function fmtTime(s) {
    if (!s) return '';
    try { return new Date(s).toLocaleString('vi-VN'); } catch (e) { return ''; }
  }

  function init() {
    mountBell();
    mountChat();
    mountAdminChat();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
