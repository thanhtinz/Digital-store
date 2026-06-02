// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

async function renderProfile(view) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    // Refresh user data
    await fetchMe();
    const u = currentUser;
    view.innerHTML = '';
    
    const heroHead = el('div', 'products-hero');
    heroHead.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Tài khoản</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-user-circle"></i> Tài khoản của tôi</h1>
      <p class="products-hero-desc">Quản lý thông tin cá nhân và cài đặt bảo mật</p>
    `;
    view.appendChild(heroHead);

    // Profile card
    const profileCard = el('div', 'info-card');
    profileCard.innerHTML = `
      <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-address-card"></i> Thông tin hồ sơ</div></div>
      <div class="info-card-body">
        <div class="profile-card-inner" style="background: none; border: none; padding: 0;">
          <div class="profile-avatar">
            ${withAvatarFallback(u.avatar_url) ? `<img src="${esc(withAvatarFallback(u.avatar_url))}" alt="" onerror="${onImgFallback('avatar')}" />` : `<div class="profile-avatar-placeholder">${esc((u.display_name || u.email || 'U').charAt(0).toUpperCase())}</div>`}
          </div>
          <div class="profile-info">
            <div class="profile-name">${esc(u.display_name || u.email?.split('@')[0] || 'User')}</div>
            <div class="profile-email">${esc(u.email || '—')}</div>
            <div class="profile-provider">${u.provider && u.provider !== 'local' ? `<span class="badge badge-blue">${esc(u.provider)}</span>` : '<span class="badge badge-gray">Tài khoản cửa hàng</span>'}</div>
          </div>
          <button class="btn btn-outline btn-sm" id="profile-edit-btn"><i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa</button>
        </div>
      </div>
    `;
    view.appendChild(profileCard);



    qs('#profile-edit-btn', view).onclick = () => {
      openModal(`
        <h3 class="modal-title mb-16">Chỉnh sửa hồ sơ</h3>
        <form id="profile-form">
          <div class="form-group"><label class="form-label">Tên hiển thị</label><input type="text" class="form-input" id="pf-name" value="${esc(u.display_name || '')}" /></div>
          <div class="form-group"><label class="form-label">Avatar URL</label><input type="text" class="form-input" id="pf-avatar" value="${esc(u.avatar_url || '')}" placeholder="https://..." /></div>
          <div id="pf-form-err" class="form-error mb-12" style="display:none"></div>
          <div class="flex gap-8"><button type="submit" class="btn btn-primary flex-1">Cập nhật</button><button type="button" class="btn btn-ghost" id="pf-cancel">Hủy</button></div>
        </form>
      `);
      qs('#pf-cancel').onclick = closeModal;
      qs('#profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const body = {
          display_name: qs('#pf-name').value.trim(),
          avatar_url: qs('#pf-avatar').value.trim(),
        };
        try {
          await apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(body) });
          closeModal(); toast('Đã cập nhật', 'success'); renderProfile(view);
        } catch (err) { const e = qs('#pf-form-err'); e.textContent = err.message; e.style.display = 'block'; }
      };
    };

    // Security Settings
    // ── Balance Card (only if feature enabled) ──
    const balanceEnabled = appSettings.features?.balance !== false;
    let myBalance = 0;
    if (balanceEnabled) {
      const topupTxnId = sessionStorage.getItem('lastTopupTxnId');
      if (topupTxnId) {
        try { await apiFetch(`/balance/topup/status/${topupTxnId}`); } catch (_) {}
        sessionStorage.removeItem('lastTopupTxnId');
      }
      let balanceData = { balance: 0 };
      try { balanceData = await apiFetch('/balance'); } catch(e) {}
      myBalance = balanceData.balance || 0;

      // Check affiliate earnings
      let affAvailable = 0;
      try {
        const affData = await apiFetch('/affiliate/me');
        affAvailable = Math.max(0, (affData.total_earnings || 0) - (affData.total_paid || 0));
      } catch(e) {}

      let historyItems = [];
      try { const hData = await apiFetch('/balance/history?limit=5'); historyItems = hData.items || []; } catch(e) {}

      const balanceCard = el('div', 'mb-24');
      balanceCard.innerHTML = `
        <div class="wallet-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px;">
          <!-- Decorative background circles -->
          <div style="position: absolute; top: -50px; right: -20px; width: 150px; height: 150px; background: rgba(255,255,255,0.03); border-radius: 50%; pointer-events: none;"></div>
          <div style="position: absolute; bottom: -30px; right: 80px; width: 100px; height: 100px; background: rgba(255,255,255,0.02); border-radius: 50%; pointer-events: none;"></div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1;">
            <div>
              <div style="font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Số dư khả dụng</div>
              <div style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.5px; display: flex; align-items: baseline; gap: 4px;">
                ${fmt(myBalance)}
              </div>
            </div>
            <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.08); border-radius: 14px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
              <i class="fa-solid fa-wallet" style="font-size: 20px; color: #38bdf8;"></i>
            </div>
          </div>

          <div style="margin-top: 28px; display: flex; gap: 12px; position: relative; z-index: 1; flex-wrap: wrap;">
            <button class="btn btn-primary" id="btn-topup" style="background: #38bdf8; color: #0f172a; border: none; font-weight: 700; border-radius: 8px; padding: 10px 20px;">
              <i class="fa-solid fa-plus" style="margin-right: 6px;"></i> Nạp tiền ngay
            </button>
            ${affAvailable >= 1000 ? `<button class="btn btn-outline" id="btn-aff-withdraw" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); color: #fff; border-radius: 8px; padding: 10px 20px; font-weight: 600;">
              <i class="fa-solid fa-arrow-right-from-bracket" style="margin-right: 6px;"></i> Rút hoa hồng (${fmt(affAvailable)})
            </button>` : ''}
          </div>
        </div>
      `;
      view.appendChild(balanceCard);

      // Topup modal
      qs('#btn-topup', balanceCard).onclick = async () => {
      // Fetch card charge rates
      let cardRates = { available: false, exchange_enabled: false, telcos: [], amounts: [], rates: {} };
      try { cardRates = await apiFetch('/card-charge/rates'); } catch(e) {}

      openModal(`
        <h3 class="modal-title mb-16"><i class="fa-solid fa-plus-circle"></i> Nạp tiền vào tài khoản</h3>
        <div class="settings-tabs mb-16" id="topup-tabs">
          <button class="settings-tab active" data-topup-tab="bank"><i class="fa-solid fa-building-columns"></i> Chuyển khoản</button>
          ${cardRates.exchange_enabled ? '<button class="settings-tab" data-topup-tab="card"><i class="fa-solid fa-credit-card"></i> Thẻ cào</button>' : ''}
        </div>
        <div id="topup-bank-panel">
          <div class="form-group">
            <label class="form-label">Số tiền nạp</label>
            <input type="number" class="form-input" id="topup-amount" min="10000" max="10000000" step="1000" placeholder="Nhập số tiền..." style="font-size:18px;font-weight:700;" />
            <div class="form-hint">Tối thiểu 10,000 candy — Tối đa 10,000,000 candy</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            ${[50000,100000,200000,500000,1000000].map(v => `<button class="btn btn-ghost btn-sm topup-preset" data-amount="${v}">${fmt(v)}</button>`).join('')}
          </div>
          <div id="topup-err" class="form-error mb-12" style="display:none"></div>
          <button class="btn btn-primary btn-full" id="btn-topup-submit"><i class="fa-solid fa-qrcode"></i> Nạp qua PayOS</button>
        </div>
        <div id="topup-card-panel" style="display:none">
          <div class="form-group">
            <label class="form-label">Nhà mạng</label>
            <select class="form-select" id="card-telco">
              ${cardRates.telcos.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Mệnh giá</label>
            <select class="form-select" id="card-amount">
              ${cardRates.amounts.map(a => `<option value="${a}">${Number(a).toLocaleString('vi-VN')}đ</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Mã thẻ</label>
            <input class="form-input" id="card-code" placeholder="Nhập mã thẻ cào" required />
          </div>
          <div class="form-group">
            <label class="form-label">Serial</label>
            <input class="form-input" id="card-serial" placeholder="Nhập số serial" required />
          </div>
          <div id="card-discount-info" class="text-sm text-muted mb-12"></div>
          <div id="card-err" class="form-error mb-12" style="display:none"></div>
          <button class="btn btn-primary btn-full" id="btn-card-submit"><i class="fa-solid fa-paper-plane"></i> Gửi thẻ</button>
          <div class="text-xs text-muted mt-8" style="text-align:center">⚠️ Thẻ sai mệnh giá sẽ bị mất, không được hoàn trả</div>
        </div>
      `);
      // Tab switching
      qsa('[data-topup-tab]').forEach(tab => {
        tab.onclick = () => {
          qsa('[data-topup-tab]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const isBank = tab.dataset.topupTab === 'bank';
          qs('#topup-bank-panel').style.display = isBank ? '' : 'none';
          qs('#topup-card-panel').style.display = isBank ? 'none' : '';
        };
      });

      // Card discount info
      const updateCardDiscount = () => {
        const amount = parseInt(qs('#card-amount')?.value || 0);
        const discount = cardRates.discount_rate || 0;
        const credited = Math.round(amount * (1 - discount / 100));
        const infoEl = qs('#card-discount-info');
        if (infoEl) {
          infoEl.innerHTML = discount > 0
            ? `Chiết khấu <strong>${discount}%</strong> — Thực nhận: <strong style="color:#10b981">${Number(credited).toLocaleString('vi-VN')}đ</strong>`
            : 'Không có chiết khấu';
        }
      };
      if (qs('#card-telco')) { qs('#card-telco').onchange = updateCardDiscount; }
      if (qs('#card-amount')) { qs('#card-amount').onchange = updateCardDiscount; }
      updateCardDiscount();

      qsa('.topup-preset').forEach(btn => {
        btn.onclick = () => { qs('#topup-amount').value = btn.dataset.amount; };
      });
      qs('#btn-topup-submit').onclick = async () => {
        const amount = parseInt(qs('#topup-amount').value);
        const errEl = qs('#topup-err');
        if (!amount || amount < 10000 || amount > 10000000) {
          errEl.textContent = 'Số tiền không hợp lệ'; errEl.style.display = 'block'; return;
        }
        const btn = qs('#btn-topup-submit');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';
        try {
          const res = await apiFetch('/balance/topup', { method: 'POST', body: JSON.stringify({ amount }) });
          closeModal();
          sessionStorage.setItem('lastTopupTxnId', String(res.transaction_id));
          window.location.href = res.payment_url;
          toast('Đã tạo lệnh nạp! Chuyển đến thanh toán...', 'success', 5000);
        } catch (err) {
          errEl.textContent = err.message; errEl.style.display = 'block';
          btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Nạp qua PayOS';
        }
      };

      // Card charge submit
      if (qs('#btn-card-submit')) {
        qs('#btn-card-submit').onclick = async () => {
          const telco = qs('#card-telco').value;
          const amount = parseInt(qs('#card-amount').value);
          const code = qs('#card-code').value.trim();
          const serial = qs('#card-serial').value.trim();
          const errEl = qs('#card-err');
          if (!code || !serial) {
            errEl.textContent = 'Vui lòng nhập mã thẻ và serial'; errEl.style.display = 'block'; return;
          }
          const btn = qs('#btn-card-submit');
          btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
          try {
            const res = await apiFetch('/card-charge/submit', { method: 'POST', body: JSON.stringify({ telco, amount, code, serial }) });
            closeModal();
            if (res.status === 'success') {
              toast(`Nạp thẻ thành công! +${Number(res.credited_amount).toLocaleString('vi-VN')}đ`, 'success');
            } else if (res.status === 'pending') {
              toast('Thẻ đang được xử lý, vui lòng chờ...', 'info', 5000);
            } else if (res.status === 'wrong_amount') {
              toast('Thẻ sai mệnh giá — không được cộng tiền', 'error', 5000);
            } else {
              toast(res.message || 'Nạp thẻ thất bại', 'error');
            }
            renderProfile(view);
          } catch(err) {
            errEl.textContent = err.message; errEl.style.display = 'block';
            btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi thẻ';
          }
        };
      }
    };

    // Affiliate withdraw
    if (qs('#btn-aff-withdraw', balanceCard)) {
      qs('#btn-aff-withdraw', balanceCard).onclick = async () => {
        if (!confirm(`Rút ${fmt(affAvailable)} hoa hồng vào số dư?`)) return;
        try {
          const res = await apiFetch('/balance/affiliate-withdraw', { method: 'POST', body: JSON.stringify({}) });
          toast(`Đã rút ${fmt(res.amount)} vào số dư`, 'success');
          renderProfile(view);
        } catch (err) { toast(err.message, 'error'); }
      };
    }
    } // end if (balanceEnabled)

    // ── Thẻ điểm thưởng (nếu bật) ──
    try {
      const loy = await apiFetch('/loyalty/me');
      if (loy && loy.config && loy.config.enabled) {
        const ptsCard = el('div', 'mb-24');
        const histRows = (loy.history || []).slice(0, 5).map(h => `
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px;">
            <span class="text-muted">${esc(h.description || h.type)}</span>
            <strong style="color:${h.amount >= 0 ? '#10b981' : '#ef4444'}">${h.amount >= 0 ? '+' : ''}${h.amount} điểm</strong>
          </div>`).join('');
        ptsCard.innerHTML = `
          <div style="background: linear-gradient(135deg,#7c3aed 0%,#a855f7 100%); border-radius:16px; padding:24px; color:#fff; box-shadow:0 10px 25px rgba(124,58,237,0.25); margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:13px; font-weight:600; opacity:.85; text-transform:uppercase; letter-spacing:.5px;">Điểm thưởng</div>
                <div style="font-size:30px; font-weight:800; margin-top:6px;">${(loy.points||0).toLocaleString()} <span style="font-size:16px;font-weight:600;">điểm</span></div>
                <div style="font-size:13px; opacity:.85; margin-top:4px;">≈ ${fmt(loy.value||0)} • Tích ${loy.config.earn_per ? `1 điểm/${(loy.config.earn_per).toLocaleString()}đ` : ''}, đổi 1 điểm = ${fmt(loy.config.redeem_value||0)}</div>
              </div>
              <i class="fa-solid fa-gift" style="font-size:28px; opacity:.9;"></i>
            </div>
          </div>
          ${histRows ? `<div class="info-card"><h4 class="fw-600 mb-12"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử điểm gần đây</h4>${histRows}</div>` : ''}
        `;
        view.appendChild(ptsCard);
      }
    } catch (e) { /* loyalty tắt hoặc lỗi -> bỏ qua */ }

    const securityCard = el('div', 'info-card');
    let pwFormHtml = '';
    
    if (!u.provider || u.provider === 'local') {
      pwFormHtml = `
        <form id="pw-form" class="mb-24">
          <h4 class="fw-600 mb-12">Đổi mật khẩu</h4>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">Mật khẩu hiện tại</label><input type="password" class="form-input" id="pw-current" placeholder="Nhập mật khẩu hiện tại" /></div>
            <div class="form-group"><label class="form-label">Mật khẩu mới</label><input type="password" class="form-input" id="pw-new" placeholder="Nhập mật khẩu mới" /></div>
          </div>
          <div id="pw-form-err" class="form-error mb-12" style="display:none"></div>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-key"></i> Đổi mật khẩu</button>
        </form>
        <div class="divider mb-24"></div>
      `;
    }

    securityCard.innerHTML = `
      <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-shield-halved"></i> Bảo mật tài khoản</div></div>
      <div class="info-card-body">
        ${pwFormHtml}
        
        
        <h4 class="fw-600 mb-12">Xác thực 2 bước (2FA)</h4>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-page); margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${u['2fa_enabled'] ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${u['2fa_enabled'] ? 'var(--primary)' : 'var(--text-muted)'}; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: var(--shadow-sm);">
              <i class="fa-solid fa-mobile-screen-button"></i>
            </div>
            <div>
              <div class="fw-600">Bảo mật bằng ứng dụng Authenticator</div>
              <div class="text-sm ${u['2fa_enabled'] ? 'text-primary fw-600' : 'text-muted'}">${u['2fa_enabled'] ? 'Đang bật' : 'Đang tắt'}</div>
            </div>
          </div>
          <button class="btn ${u['2fa_enabled'] ? 'btn-outline text-red' : 'btn-outline text-primary'}" id="btn-2fa-toggle" style="border-color: ${u['2fa_enabled'] ? 'var(--red-bg)' : 'var(--primary-light)'};">
            ${u['2fa_enabled'] ? 'Tắt 2FA' : 'Cài đặt'}
          </button>
        </div>
        
        <h4 class="fw-600 mb-12">Quản lý phiên đăng nhập</h4>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-page);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--green-bg); color: var(--green); display: flex; align-items: center; justify-content: center; font-size: 20px;">
              <i class="fa-solid fa-desktop"></i>
            </div>
            <div>
              <div class="fw-600">Thiết bị hiện tại</div>
              <div class="text-sm text-muted">Đang hoạt động trên trình duyệt này</div>
            </div>
          </div>
          <button class="btn btn-outline text-red" style="border-color: var(--red-bg);" id="profile-logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</button>
        </div>
      </div>
    `;
    view.appendChild(securityCard);


    if (!u.provider || u.provider === 'local') {
      qs('#pw-form', view).onsubmit = async (e) => {
        e.preventDefault();
        const body = {
          current_password: qs('#pw-current').value,
          new_password: qs('#pw-new').value,
        };
        if (!body.current_password || !body.new_password) { toast('Nhập đầy đủ thông tin', 'error'); return; }
        try {
          await apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify(body) });
          toast('Đã đổi mật khẩu', 'success');
          qs('#pw-current').value = '';
          qs('#pw-new').value = '';
        } catch (err) { const e = qs('#pw-form-err'); e.textContent = err.message; e.style.display = 'block'; }
      };
    }
    
    qs('#btn-2fa-toggle', view).onclick = async () => {
      if (u['2fa_enabled']) {
        if (!confirm('Bạn có chắc chắn muốn tắt xác thực 2 bước?')) return;
        try {
          await apiFetch('/auth/2fa/disable', { method: 'POST' });
          toast('Đã tắt xác thực 2 bước', 'success');
          renderProfile(view);
        } catch (e) { toast(e.message, 'error'); }
      } else {
        try {
          const data = await apiFetch('/auth/2fa/setup');
          openModal(`
            <h3 class="modal-title mb-16">Cài đặt xác thực 2 bước</h3>
            <div style="text-align: center; margin-bottom: 24px;">
              <p class="mb-12">Quét mã QR dưới đây bằng Google Authenticator hoặc Authy</p>
              <img src="${data.qr_code}" alt="QR Code" style="width: 200px; height: 200px; border: 1px solid var(--border); border-radius: 8px; margin: 0 auto;" />
              <p class="text-sm text-muted mt-12" style="font-family: monospace; letter-spacing: 2px; padding: 8px; background: var(--bg-page); border-radius: 4px; user-select: all;">${data.secret}</p>
            </div>
            <form id="2fa-verify-form">
              <div class="form-group">
                <label class="form-label">Nhập mã xác thực gồm 6 chữ số</label>
                <input type="text" class="form-input" id="totp-code" placeholder="123456" maxlength="6" style="font-size: 20px; letter-spacing: 4px; text-align: center;" />
              </div>
              <div id="2fa-err" class="form-error mb-12" style="display:none"></div>
              <button type="submit" class="btn btn-primary btn-full"><i class="fa-solid fa-check"></i> Xác nhận</button>
            </form>
          `);
          
          qs('#2fa-verify-form').onsubmit = async (e) => {
            e.preventDefault();
            const code = qs('#totp-code').value.trim();
            if (!code || code.length !== 6) { toast('Vui lòng nhập mã 6 chữ số', 'error'); return; }
            try {
              await apiFetch('/auth/2fa/verify', { 
                method: 'POST', 
                body: JSON.stringify({ secret: data.secret, code }) 
              });
              closeModal();
              toast('Đã bật xác thực 2 bước', 'success');
              renderProfile(view);
            } catch (err) { 
              const errEl = qs('#2fa-err'); 
              errEl.textContent = err.message; 
              errEl.style.display = 'block'; 
            }
          };
        } catch (e) { toast(e.message, 'error'); }
      }
    };

    qs('#profile-logout-btn', view).onclick = () => {
      saveToken(null); currentUser = null; updateAuthUI();
      toast('Đã đăng xuất', 'info'); navigateTo('/');
    };

    // Legacy bot card removed: replaced by detailed Discord DM / Telegram linking card above.


    // Order history
    const ordersCard = el('div', 'info-card');
    ordersCard.innerHTML = `<div class="info-card-head" style="display:flex; justify-content:space-between; align-items:center;"><div class="info-card-title"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử đơn hàng gần đây</div><a href="/orders" class="btn btn-outline btn-sm" style="background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.3); color:#fff;">Xem tất cả đơn</a></div><div class="info-card-body" id="profile-orders"><div class="page-loading"><div class="spinner"></div></div></div>`;
    view.appendChild(ordersCard);

    try {
      const data = await apiFetch('/orders/my');
      const wrap = qs('#profile-orders', view);
      if (!data.items.length) {
        wrap.innerHTML = '<div class="text-center text-muted py-16">Chưa có đơn hàng</div>';
      } else {
        const recent = data.items.slice(0, 5);
        wrap.innerHTML = recent.map(o => `
          <div class="order-card" style="margin-bottom:8px">
            <div class="order-card-top">
              <div><div class="order-code">${o.order_code}</div><div class="order-date">${fmtDate(o.created_at)}</div></div>
              <div class="d-flex align-center gap-8">${statusBadge(o.status)}<a href="/orders/${o.order_code}" class="btn btn-ghost btn-sm">Chi tiết</a></div>
            </div>
            <div class="text-sm">${o.product_name || ''} — <span class="text-muted">${o.package_name || ''}</span></div>
            <div class="fw-700 text-primary mt-4">${fmt(o.total_amount)}</div>
          </div>
        `).join('');
      }
    } catch (_) { qs('#profile-orders', view).innerHTML = '<div class="text-muted">Không thể tải đơn hàng</div>'; }

    // ── Transaction History Card ──
    const txCard = el('div', 'info-card');
    txCard.innerHTML = `
      <div class="info-card-head" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="info-card-title"><i class="fa-solid fa-receipt"></i> Lịch sử giao dịch</div>
      </div>
      <div class="info-card-body" id="profile-tx-list" style="max-height:520px; overflow-y:auto; overscroll-behavior:contain;">
        <div class="page-loading"><div class="spinner"></div></div>
      </div>
    `;
    view.appendChild(txCard);

    const txWrap = qs('#profile-tx-list', view);
    const typeLabels = { topup:'Nạp tiền', purchase:'Mua hàng', affiliate_withdraw:'Rút hoa hồng', admin_adjust:'Admin điều chỉnh', refund:'Hoàn tiền', card_charge:'Nạp thẻ cào' };
    const typeIcons = { topup:'fa-plus-circle', purchase:'fa-shopping-cart', affiliate_withdraw:'fa-arrow-right-from-bracket', admin_adjust:'fa-sliders', refund:'fa-rotate-left', card_charge:'fa-credit-card' };
    const statusLabels = { pending:'Đang chờ', completed:'Thành công', failed:'Thất bại' };
    const statusClasses = { pending:'badge-yellow', completed:'badge-green', failed:'badge-red' };
    const renderTxItem = (t) => {
      const isPositive = t.amount > 0;
      return `<div class="order-card" style="margin-bottom:8px">
        <div class="order-card-top">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${isPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};">
              <i class="fa-solid ${typeIcons[t.type] || 'fa-circle'}" style="color:${isPositive ? '#10b981' : '#ef4444'};font-size:14px;"></i>
            </div>
            <div>
              <div class="fw-600">${typeLabels[t.type] || t.type} <span class="badge ${statusClasses[t.status] || 'badge-gray'}" style="margin-left:6px">${statusLabels[t.status] || t.status}</span></div>
              <div class="text-muted text-xs">${fmtDate(t.created_at)}</div>
            </div>
          </div>
          <div style="font-weight:700;font-size:15px;color:${isPositive ? '#10b981' : '#ef4444'};">${isPositive ? '+' : ''}${fmt(t.amount)}</div>
        </div>
        ${t.note ? `<div class="text-muted text-xs mt-4">${esc(t.note)}</div>` : ''}
      </div>`;
    };
    let txPage = 1;
    let txLoading = false;
    let txDone = false;
    const loadTxPage = async () => {
      if (txLoading || txDone) return;
      txLoading = true;
      const firstLoad = txPage === 1;
      if (firstLoad) txWrap.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
      else txWrap.insertAdjacentHTML('beforeend', '<div class="text-center text-muted py-8" data-tx-loading>Đang tải thêm...</div>');
      try {
        const txData = await apiFetch(`/balance/history?page=${txPage}&limit=20`);
        qsa('[data-tx-loading]', txWrap).forEach(el => el.remove());
        const txItems = txData.items || [];
        if (firstLoad) txWrap.innerHTML = txItems.length ? '' : '<div class="text-center text-muted py-16">Chưa có giao dịch</div>';
        if (txItems.length) txWrap.insertAdjacentHTML('beforeend', txItems.map(renderTxItem).join(''));
        const loaded = (txPage - 1) * 20 + txItems.length;
        txDone = txItems.length < 20 || loaded >= (txData.total || 0);
        if (!txDone) txPage += 1;
        else if (txItems.length && !qs('[data-tx-end]', txWrap)) txWrap.insertAdjacentHTML('beforeend', '<div class="text-center text-muted text-xs py-8" data-tx-end>Đã hết giao dịch</div>');
      } catch (_) {
        qsa('[data-tx-loading]', txWrap).forEach(el => el.remove());
        if (firstLoad) txWrap.innerHTML = '<div class="text-muted">Không thể tải giao dịch</div>';
      } finally {
        txLoading = false;
      }
    };
    txWrap.addEventListener('scroll', () => {
      if (txWrap.scrollTop + txWrap.clientHeight >= txWrap.scrollHeight - 80) loadTxPage();
    });
    await loadTxPage();

  } catch (e) {
    view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>${e.message}</h3></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  AFFILIATES – Giới thiệu bạn bè
// ═══════════════════════════════════════════════════════════════

async function renderUserAffiliates(view) {
  if (!currentUser) return navigateTo('/login');
  view.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    const data = await apiFetch('/affiliate/me');
    const siteBase = location.origin;
    view.innerHTML = '';

    // Hero
    const heroHead = el('div', 'products-hero');
    heroHead.innerHTML = `
      <div class="breadcrumb mb-8"><a href="/">Trang chủ</a> <span>›</span> <strong>Giới thiệu bạn bè</strong></div>
      <h1 class="products-hero-title"><i class="fa-solid fa-user-group"></i> Giới thiệu bạn bè</h1>
      <p class="products-hero-desc">Chia sẻ link giới thiệu và nhận hoa hồng từ mỗi đơn hàng thành công</p>
    `;
    view.appendChild(heroHead);

    if (!data.registered) {
      // Not yet an affiliate – show registration card
      const regCard = el('div', 'info-card');
      regCard.innerHTML = `
        <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-rocket"></i> Đăng ký Affiliate</div></div>
        <div class="info-card-body" style="text-align:center; padding:40px 20px;">
          <div style="font-size:48px; margin-bottom:16px; opacity:0.3;"><i class="fa-solid fa-handshake"></i></div>
          <h3 style="margin:0 0 8px;">Tham gia chương trình Affiliate</h3>
          <p class="text-muted" style="margin:0 0 20px;">Đăng ký để nhận mã giới thiệu và bắt đầu kiếm hoa hồng từ đơn hàng của bạn bè.</p>
          <button class="btn btn-primary" id="aff-register-btn"><i class="fa-solid fa-user-plus"></i> Đăng ký ngay</button>
        </div>
      `;
      view.appendChild(regCard);

      qs('#aff-register-btn', view).onclick = async () => {
        try {
          qs('#aff-register-btn').disabled = true;
          qs('#aff-register-btn').innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Đang đăng ký...';
          await apiFetch('/affiliate/register', { method: 'POST' });
          toast('Đăng ký thành công!', 'success');
          renderUserAffiliates(view);
        } catch (err) {
          toast(err.message, 'error');
          qs('#aff-register-btn').disabled = false;
          qs('#aff-register-btn').innerHTML = '<i class="fa-solid fa-user-plus"></i> Đăng ký ngay';
        }
      };
      return;
    }

    // Registered affiliate – show dashboard
    const aff = data;
    const refLink = `${siteBase}/?ref=${aff.ref_code}`;
    const totalReferrals = (data.referrals || []).length;
    const pendingCommission = (data.referrals || []).filter(r => r.status === 'pending').reduce((s, r) => s + parseFloat(r.commission), 0);
    const availableBalance = Math.max(0, (aff.total_earnings || 0) - (aff.total_paid || 0));

    // Stats row
    const statsRow = el('div', '');
    statsRow.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:16px; margin-bottom:24px;';
    statsRow.innerHTML = `
      <div class="info-card" style="margin-bottom:0;">
        <div class="info-card-body" style="text-align:center; padding:20px;">
          <div style="font-size:28px; font-weight:800; color:var(--primary);">${totalReferrals}</div>
          <div class="text-muted text-sm">Số người đã giới thiệu</div>
        </div>
      </div>
      <div class="info-card" style="margin-bottom:0;">
        <div class="info-card-body" style="text-align:center; padding:20px;">
          <div style="font-size:28px; font-weight:800; color:#D97706;">${fmt(pendingCommission)}</div>
          <div class="text-muted text-sm">Hoa hồng chờ duyệt</div>
        </div>
      </div>
      <div class="info-card" style="margin-bottom:0;">
        <div class="info-card-body" style="text-align:center; padding:20px;">
          <div style="font-size:28px; font-weight:800; color:var(--success, #22c55e);">${fmt(availableBalance)}</div>
          <div class="text-muted text-sm">Số dư khả dụng</div>
        </div>
      </div>
      <div class="info-card" style="margin-bottom:0;">
        <div class="info-card-body" style="text-align:center; padding:20px;">
          <div style="font-size:28px; font-weight:800; color:var(--info, #3b82f6);">${fmt(aff.total_paid)}</div>
          <div class="text-muted text-sm">Đã thanh toán</div>
        </div>
      </div>
    `;
    view.appendChild(statsRow);

    // Referral link card
    const linkCard = el('div', 'info-card');
    linkCard.innerHTML = `
      <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-link"></i> Link giới thiệu của bạn</div></div>
      <div class="info-card-body">
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" class="form-input" id="aff-ref-link" value="${refLink}" readonly style="flex:1; font-family:monospace; font-size:14px; background:var(--bg-secondary, #f5f5f5);" />
          <button class="btn btn-primary" id="aff-copy-btn" title="Sao chép"><i class="fa-solid fa-copy"></i> Sao chép</button>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <span class="text-muted text-sm">Mã giới thiệu:</span>
          <code style="background:var(--bg-secondary, #f5f5f5); padding:2px 8px; border-radius:4px; font-weight:700; letter-spacing:1px;">${aff.ref_code}</code>
          <span class="text-muted text-sm" style="margin-left:8px;">Hoa hồng:</span>
          <strong style="color:var(--primary);">${aff.commission_rate}%</strong>
          <span class="text-muted text-sm">/ đơn hàng</span>
        </div>
      </div>
    `;
    view.appendChild(linkCard);

    qs('#aff-copy-btn', view).onclick = () => {
      const input = qs('#aff-ref-link', view);
      input.select();
      navigator.clipboard.writeText(refLink).then(() => {
        toast('Đã sao chép link giới thiệu!', 'success');
      }).catch(() => {
        document.execCommand('copy');
        toast('Đã sao chép!', 'success');
      });
    };

    // Withdraw card
    const withdrawCard = el('div', 'info-card');
    withdrawCard.innerHTML = `
      <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-money-bill-transfer"></i> Rút tiền</div></div>
      <div class="info-card-body">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
          <div>
            <div class="text-muted text-sm">Số dư khả dụng</div>
            <div style="font-size:28px; font-weight:800; color:var(--primary);">${fmt(availableBalance)}</div>
          </div>
          <button class="btn btn-primary" id="aff-withdraw-btn" ${availableBalance <= 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Rút tiền
          </button>
        </div>
        ${availableBalance <= 0 ? '<p class="text-sm text-muted" style="margin-top:8px;">Bạn chưa có số dư khả dụng để rút.</p>' : ''}
      </div>
    `;
    view.appendChild(withdrawCard);

    if (availableBalance > 0) {
      qs('#aff-withdraw-btn', view).onclick = () => {
        openModal(`
          <h3 class="modal-title mb-16">Yêu cầu rút tiền</h3>
          <p class="mb-12">Số dư khả dụng: <strong>${fmt(availableBalance)}</strong></p>
          <div class="form-group">
            <label class="form-label">Số tiền muốn rút</label>
            <input type="number" class="form-input" id="wd-amount" value="${availableBalance}" min="1" max="${availableBalance}" />
          </div>
          <div class="form-group">
            <label class="form-label">Phương thức nhận tiền</label>
            <select class="form-select" id="wd-method">
              <option value="bank">Chuyển khoản ngân hàng</option>
              <option value="momo">Ví MoMo</option>
              <option value="zalopay">ZaloPay</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Thông tin tài khoản nhận</label>
            <input type="text" class="form-input" id="wd-info" placeholder="Số tài khoản / Số điện thoại" />
          </div>
          <div id="wd-err" class="form-error mb-12" style="display:none"></div>
          <div class="flex gap-8">
            <button type="button" class="btn btn-primary flex-1" id="wd-submit">Gửi yêu cầu</button>
            <button type="button" class="btn btn-ghost" id="wd-cancel">Hủy</button>
          </div>
        `);
        qs('#wd-cancel').onclick = closeModal;
        qs('#wd-submit').onclick = async () => {
          const amount = parseFloat(qs('#wd-amount').value);
          const info = qs('#wd-info').value.trim();
          if (!amount || amount <= 0) {
            const e = qs('#wd-err'); e.textContent = 'Nhập số tiền hợp lệ'; e.style.display = 'block'; return;
          }
          if (amount > availableBalance) {
            const e = qs('#wd-err'); e.textContent = 'Số tiền vượt quá số dư khả dụng'; e.style.display = 'block'; return;
          }
          if (!info) {
            const e = qs('#wd-err'); e.textContent = 'Nhập thông tin tài khoản nhận'; e.style.display = 'block'; return;
          }
          try {
            qs('#wd-submit').disabled = true;
            qs('#wd-submit').textContent = 'Đang gửi...';
            await apiFetch('/balance/affiliate-withdraw', { method: 'POST', body: JSON.stringify({ amount: Math.floor(amount) }) });
            closeModal();
            toast('Yêu cầu rút tiền đã được gửi! Vui lòng chờ admin duyệt.', 'success');
            renderUserAffiliates(view);
          } catch (err) {
            const e = qs('#wd-err'); e.textContent = err.message; e.style.display = 'block';
            qs('#wd-submit').disabled = false;
            qs('#wd-submit').textContent = 'Gửi yêu cầu';
          }
        };
      };
    }

    // Commission history
    const histCard = el('div', 'info-card');
    const refs = data.referrals || [];
    histCard.innerHTML = `
      <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử hoa hồng</div></div>
      <div class="info-card-body" style="padding:0;">
        ${refs.length ? `
          <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-secondary, #f5f5f5);">
                  <th style="padding:10px 12px; text-align:left; font-size:13px;">Đơn hàng</th>
                  <th style="padding:10px 12px; text-align:right; font-size:13px;">Giá trị</th>
                  <th style="padding:10px 12px; text-align:right; font-size:13px;">Hoa hồng</th>
                  <th style="padding:10px 12px; text-align:center; font-size:13px;">Trạng thái</th>
                  <th style="padding:10px 12px; text-align:right; font-size:13px;">Ngày</th>
                </tr>
              </thead>
              <tbody>
                ${refs.map(r => {
                  const statusMap = {
                    pending: { label: 'Chờ duyệt', cls: 'badge-yellow' },
                    approved: { label: 'Đã duyệt', cls: 'badge-green' },
                    paid: { label: 'Đã thanh toán', cls: 'badge-blue' },
                  };
                  const st = statusMap[r.status] || { label: r.status, cls: 'badge-gray' };
                  return `<tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 12px; font-size:13px;">#${r.order_id || '—'}</td>
                    <td style="padding:10px 12px; text-align:right; font-size:13px;">${fmt(r.order_amount)}</td>
                    <td style="padding:10px 12px; text-align:right; font-size:13px; font-weight:600; color:var(--primary);">${fmt(r.commission)}</td>
                    <td style="padding:10px 12px; text-align:center;"><span class="badge ${st.cls}">${st.label}</span></td>
                    <td style="padding:10px 12px; text-align:right; font-size:12px; color:var(--text-3);">${fmtDate(r.created_at)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="text-align:center; padding:40px 20px; color:var(--text-3);">
            <div style="font-size:36px; margin-bottom:12px; opacity:0.3;"><i class="fa-solid fa-receipt"></i></div>
            <p style="margin:0;">Chưa có hoa hồng nào. Hãy chia sẻ link giới thiệu để bắt đầu!</p>
          </div>
        `}
      </div>
    `;
    view.appendChild(histCard);

    // How it works
    const howCard = el('div', 'info-card');
    howCard.innerHTML = `
      <div class="info-card-head"><div class="info-card-title"><i class="fa-solid fa-circle-info"></i> Hướng dẫn</div></div>
      <div class="info-card-body">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:20px;">
          <div style="text-align:center;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--primary-light, rgba(99,102,241,0.1)); display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px;"><i class="fa-solid fa-share-nodes" style="color:var(--primary); font-size:20px;"></i></div>
            <div style="font-weight:600; margin-bottom:4px;">1. Chia sẻ link</div>
            <div class="text-sm text-muted">Gửi link giới thiệu cho bạn bè qua mạng xã hội, tin nhắn...</div>
          </div>
          <div style="text-align:center;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--primary-light, rgba(99,102,241,0.1)); display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px;"><i class="fa-solid fa-cart-shopping" style="color:var(--primary); font-size:20px;"></i></div>
            <div style="font-weight:600; margin-bottom:4px;">2. Bạn bè mua hàng</div>
            <div class="text-sm text-muted">Khi họ mua hàng qua link của bạn, hệ thống tự động ghi nhận.</div>
          </div>
          <div style="text-align:center;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--primary-light, rgba(99,102,241,0.1)); display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px;"><i class="fa-solid fa-coins" style="color:var(--primary); font-size:20px;"></i></div>
            <div style="font-weight:600; margin-bottom:4px;">3. Nhận hoa hồng</div>
            <div class="text-sm text-muted">Bạn nhận ${aff.commission_rate}% giá trị đơn hàng. Hoa hồng được thanh toán định kỳ.</div>
          </div>
        </div>
      </div>
    `;
    view.appendChild(howCard);

  } catch (e) {
    view.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>${e.message}</h3></div>`;
  }
}
