/**
 * Auth Pages Module
 * - Login page with 2FA support and OAuth
 * - Register page
 * - OAuth callback handler
 */

// ─── LOGIN PAGE ─────────────────────────────────────

function renderLogin(view) {
  if (currentUser) return navigateTo('/');
  view.innerHTML = '';
  const page = el('div', 'auth-page');
  page.innerHTML = `
    <div class="auth-card">
      <div class="auth-card-header">
        <div class="auth-logo-mark">${window.appSettings?.logo_url || window.appSettings?.site_logo ? `<img src="${window.appSettings.logo_url || window.appSettings.site_logo}" alt="${window.appSettings?.site_name || 'Logo'}" class="auth-logo-image" onerror="${onImgFallback()}" />` : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`}
        </div>
        <h1 class="auth-title">Đăng nhập</h1>
        <p class="auth-subtitle">Chào mừng trở lại! Nhập thông tin để tiếp tục.</p>
      </div>
      
      <div id="oauth-buttons-container"></div>
      
      <div class="divider-with-text">
        <span>Hoặc dùng email</span>
      </div>
      
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <input type="email" class="form-input has-icon" id="login-email" placeholder="email@example.com" required autocomplete="email" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Mật khẩu</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" class="form-input has-icon" id="login-pwd" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div class="text-sm" style="margin-top:8px;"><a href="#" id="forgot-password-link" class="auth-link">Quên mật khẩu?</a></div>
        </div>
        <div class="form-group" id="totp-group" style="display:none;">
          <label class="form-label">Mã xác thực 2 bước (2FA)</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <input type="text" class="form-input has-icon" id="login-totp" placeholder="123456" maxlength="6" autocomplete="one-time-code" />
          </div>
        </div>
        <div id="login-error" class="auth-error" style="display:none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span id="login-error-text"></span>
        </div>
        <button type="submit" class="btn btn-primary btn-full btn-lg auth-submit">
          <span class="auth-submit-text">Đăng nhập</span>
          <svg class="auth-submit-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </form>
      <div class="auth-footer">
        Chưa có tài khoản? <a href="/register" class="auth-link">Tạo tài khoản mới →</a>
      </div>
    </div>
  `;
  view.appendChild(page);

  // Render OAuth buttons
  const oauthContainer = qs('#oauth-buttons-container', page);
  if (oauthContainer) {
    renderOAuthLoginButtons(oauthContainer);
  }

  qs('#login-form', page).onsubmit = async (e) => {
    e.preventDefault();
    const btn = qs('.auth-submit', page);
    const errEl = qs('#login-error', page);
    const errText = qs('#login-error-text', page);
    btn.disabled = true;
    btn.querySelector('.auth-submit-text').textContent = 'Đang đăng nhập...';
    btn.classList.add('loading');
    errEl.style.display = 'none';
    try {
      const payload = { 
        email: qs('#login-email', page).value, 
        password: qs('#login-pwd', page).value 
      };
      
      const totpInput = qs('#login-totp', page);
      if (totpInput && totpInput.value) {
        payload.totp_code = totpInput.value;
      }
      
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      
      if (data.requires_2fa) {
        qs('#totp-group', page).style.display = 'block';
        errText.textContent = data.message;
        errEl.style.display = 'flex';
        totpInput.focus();
        btn.disabled = false;
        btn.querySelector('.auth-submit-text').textContent = 'Đăng nhập';
        btn.classList.remove('loading');
        return;
      }
      
      if (!data.token) throw new Error('Đăng nhập thất bại');
      saveToken(data.token); await fetchMe(); updateAuthUI();
      toast('Đăng nhập thành công!', 'success'); navigateTo('/');
    } catch (err) {
      errText.textContent = err.message || 'Email hoặc mật khẩu không đúng';
      errEl.style.display = 'flex';
    } finally {
      btn.disabled = false;
      btn.querySelector('.auth-submit-text').textContent = 'Đăng nhập';
      btn.classList.remove('loading');
    }
  };

  qs('#forgot-password-link', page).onclick = (e) => {
    e.preventDefault();
    openModal(`
      <h3 class="modal-title mb-16">Quên mật khẩu</h3>
      <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="forgot-email" placeholder="email@example.com" /></div>
      <div id="forgot-err" class="form-error mb-12" style="display:none"></div>
      <button class="btn btn-primary btn-full" id="forgot-submit">Gửi link đặt lại</button>
    `);
    qs('#forgot-submit').onclick = async () => {
      try {
        await apiFetch('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: qs('#forgot-email').value.trim() })
        });
        closeModal();
        toast('Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.', 'success');
      } catch (err) {
        const elErr = qs('#forgot-err');
        elErr.textContent = err.message;
        elErr.style.display = 'block';
      }
    };
  };
}

// ─── RESET PASSWORD PAGE ──────────────────────────────────

function renderResetPassword(view) {
  view.innerHTML = '';
  const page = el('div', 'auth-page');
  const token = new URLSearchParams(location.search || '').get('token') || '';
  page.innerHTML = `
    <div class="auth-card">
      <div class="auth-card-header">
        <h2 class="auth-title">Đặt lại mật khẩu</h2>
        <p class="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>
      <div class="auth-card-body">
        ${token ? `
          <div class="form-group"><label class="form-label">Mật khẩu mới</label><input type="password" class="form-input" id="rp-pwd" placeholder="Tối thiểu 8 ký tự" /></div>
          <div class="form-group"><label class="form-label">Nhập lại mật khẩu</label><input type="password" class="form-input" id="rp-pwd2" /></div>
          <div id="rp-err" class="form-error mb-12" style="display:none"></div>
          <button class="btn btn-primary btn-full" id="rp-submit">Cập nhật mật khẩu</button>
        ` : `<div class="form-error">Liên kết không hợp lệ. Vui lòng yêu cầu lại từ trang đăng nhập.</div>`}
      </div>
    </div>
  `;
  view.appendChild(page);
  if (!token) return;
  qs('#rp-submit', page).onclick = async () => {
    const p1 = qs('#rp-pwd', page).value;
    const p2 = qs('#rp-pwd2', page).value;
    const elErr = qs('#rp-err', page);
    elErr.style.display = 'none';
    if (p1.length < 8) { elErr.textContent = 'Mật khẩu tối thiểu 8 ký tự'; elErr.style.display = 'block'; return; }
    if (p1 !== p2) { elErr.textContent = 'Mật khẩu nhập lại không khớp'; elErr.style.display = 'block'; return; }
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: p1 })
      });
      toast('Mật khẩu đã được cập nhật. Vui lòng đăng nhập.', 'success');
      navigateTo('/login', { replace: true });
    } catch (err) {
      elErr.textContent = err.message;
      elErr.style.display = 'block';
    }
  };
}

// ─── REGISTER PAGE ──────────────────────────────────

function renderRegister(view) {
  if (currentUser) { navigateTo('/'); return; }
  view.innerHTML = '';
  const page = el('div', 'auth-page');
  page.innerHTML = `
    <div class="auth-card">
      <div class="auth-card-header">
        <div class="auth-logo-mark">${window.appSettings?.logo_url || window.appSettings?.site_logo ? `<img src="${window.appSettings.logo_url || window.appSettings.site_logo}" alt="${window.appSettings?.site_name || 'Logo'}" class="auth-logo-image" onerror="${onImgFallback()}" />` : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`}
        </div>
        <h1 class="auth-title">Tạo tài khoản</h1>
        <p class="auth-subtitle">Đăng ký miễn phí, chỉ mất 30 giây.</p>
      </div>
      <form id="register-form" class="auth-form">
        <div class="form-group">
          <label class="form-label" for="reg-name">Tên hiển thị</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input type="text" class="form-input has-icon" id="reg-name" placeholder="Tên của bạn" autocomplete="name" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-email">Email</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <input type="email" class="form-input has-icon" id="reg-email" placeholder="you@example.com" required autocomplete="email" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-pwd">Mật khẩu</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" class="form-input has-icon" id="reg-pwd" placeholder="Tối thiểu 8 ký tự" minlength="8" required autocomplete="new-password" />
          </div>
          <div class="form-hint">Ít nhất 8 ký tự</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-pwd2">Xác nhận mật khẩu</label>
          <div class="input-icon-wrap">
            <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <input type="password" class="form-input has-icon" id="reg-pwd2" placeholder="Nhập lại mật khẩu" required autocomplete="new-password" />
          </div>
        </div>
        <div id="reg-error" class="auth-error" style="display:none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span id="reg-error-text"></span>
        </div>
        <button type="submit" class="btn btn-primary btn-full btn-lg auth-submit">
          <span class="btn-label">Tạo tài khoản</span>
          <svg class="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="40" stroke-dashoffset="10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite"/></circle></svg>
        </button>
      </form>
      <div class="auth-divider"><span>hoặc</span></div>
      <div id="social-buttons-reg" class="social-buttons"></div>
      <div class="auth-footer">
        Đã có tài khoản? <a href="/login" class="auth-link">Đăng nhập →</a>
      </div>
    </div>
  `;
  view.appendChild(page);

  // Social buttons
  apiFetch('/admin/oauth/public-config').then(cfg => {
    const wrap = qs('#social-buttons-reg', page);
    if (!wrap) return;
    let html = '';
    if (cfg.google?.enabled) html += `<a href="/api/auth/google" class="btn-social btn-social-google"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Google</a>`;
    if (cfg.discord?.enabled) html += `<a href="/api/auth/discord" class="btn-social btn-social-discord"><svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> Discord</a>`;
    wrap.innerHTML = html;
  }).catch(() => {});

  qs('#register-form', page).onsubmit = async (e) => {
    e.preventDefault();
    const name = qs('#reg-name', page).value;
    const email = qs('#reg-email', page).value;
    const pwd = qs('#reg-pwd', page).value;
    const pwd2 = qs('#reg-pwd2', page).value;
    const errEl = qs('#reg-error', page);
    const errText = qs('#reg-error-text', page);
    const btn = qs('.auth-submit', page);
    errEl.style.display = 'none';
    if (pwd !== pwd2) { errText.textContent = 'Mật khẩu không khớp'; errEl.style.display = 'flex'; return; }
    btn.classList.add('loading');
    btn.disabled = true;
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password: pwd, display_name: name })
      });
      if (data.token) { saveToken(data.token); await fetchMe(); updateAuthUI(); toast('Đăng ký thành công!', 'success'); navigateTo('/'); }
      else { toast('Đăng ký thành công! Vui lòng đăng nhập.', 'success'); navigateTo('/login'); }
    } catch (err) { errText.textContent = err.message || 'Đăng ký thất bại'; errEl.style.display = 'flex'; }
    finally { btn.classList.remove('loading'); btn.disabled = false; }
  };
}

// ─── OAUTH CALLBACK ──────────────────────────────────

function renderAuthCallback(view) {
  const params = new URLSearchParams(location.search || '');
  const token = params.get('token');
  const error = params.get('error');
  if (error) {
    toast('Đăng nhập thất bại: ' + error, 'error');
    navigateTo('/login');
    return;
  }
  if (token) {
    saveToken(token);
    fetchMe().then(() => { updateAuthUI(); toast('Đăng nhập thành công!', 'success'); navigateTo('/'); });
  } else {
    navigateTo('/login');
  }
}
