/**
 * OAuth & Admin Settings
 */

async function renderAdminOAuthSettings(view) {
  if (!view) return; const content = view;
  
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  
  try {
    const config = await apiFetch('/admin/oauth/config');
    
    const html = `
      <div class="settings-wrapper">
        ${cuiPageHeader('Cấu hình OAuth & Đăng nhập', 'Cấu hình các nền tảng mạng xã hội để người dùng có thể đăng nhập')}

        <div class="settings-grid">
          ${renderOAuthProvider(config, 'google', 'Google', '#4285F4')}
          ${renderOAuthProvider(config, 'facebook', 'Facebook', '#1877F2')}
          ${renderOAuthProvider(config, 'github', 'GitHub', '#333333')}
          ${renderOAuthProvider(config, 'tiktok', 'TikTok', '#000000')}
        </div>

        <div class="settings-section mt-40">
          <h2>Hướng dẫn cấu hình</h2>
          <div class="guide-tabs">
            <button class="guide-tab active" data-provider="google">Google</button>
            <button class="guide-tab" data-provider="facebook">Facebook</button>
            <button class="guide-tab" data-provider="github">GitHub</button>
            <button class="guide-tab" data-provider="tiktok">TikTok</button>
          </div>
          <div id="guide-content"></div>
        </div>
      </div>
    `;
    
    content.innerHTML = html;
    
    // Setup provider tabs
    document.querySelectorAll('.guide-tab').forEach(tab => {
      tab.onclick = (e) => {
        document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        renderGuide(e.target.dataset.provider);
      };
    });
    
    // Render initial guide
    renderGuide('google');
    
    // Handle save buttons
    document.querySelectorAll('[data-save-oauth]').forEach(btn => {
      btn.onclick = async (e) => {
        const provider = btn.dataset.saveOauth;
        const clientId = qs(`#${provider}-client-id`).value;
        const clientSecret = qs(`#${provider}-client-secret`).value;
        const enabled = qs(`#${provider}-enabled`).checked;
        
        try {
          await apiFetch(`/admin/oauth/config/${provider}`, {
            method: 'PUT',
            body: JSON.stringify({ clientId, clientSecret, enabled })
          });
          toast('Đã cập nhật cấu hình', 'success');
        } catch (err) {
          toast('Lỗi cập nhật: ' + err.message, 'error');
        }
      };
    });
    
  } catch (err) {
    content.innerHTML = `<div class="error-state">${err.message}</div>`;
  }
  
  function renderOAuthProvider(config, key, name, color) {
    const cfg = config[key] || {};
    return `
      <div class="oauth-card">
        <div class="oauth-header" style="border-left: 4px solid ${color};">
          <h3>${name}</h3>
          <label class="toggle-switch">
            <input type="checkbox" id="${key}-enabled" ${cfg.enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="oauth-form">
          <div class="form-group">
            <label>Client ID</label>
            <input type="text" id="${key}-client-id" class="form-control" value="${cfg.clientId || ''}" placeholder="Nhập Client ID" />
          </div>
          <div class="form-group">
            <label>Client Secret</label>
            <input type="password" id="${key}-client-secret" class="form-control" value="${cfg.clientSecret || ''}" placeholder="Nhập Client Secret" />
          </div>
          <div class="oauth-callback">
            <label>Callback URL</label>
            <div class="callback-url">
              <code>${window.location.origin}/api/auth/${key}/callback</code>
              <button class="copy-btn" data-copy="\${window.location.origin}/api/auth/${key}/callback">
                <i class="fa-solid fa-copy"></i>
              </button>
            </div>
          </div>
          <button class="btn btn-primary" data-save-oauth="${key}">Lưu cấu hình</button>
        </div>
      </div>
    `;
  }
  
  function renderGuide(provider) {
    const guides = {
      google: `
        <div class="guide">
          <h4>Bước 1: Truy cập Google Cloud Console</h4>
          <p>Vào <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></p>
          <h4>Bước 2: Tạo OAuth 2.0 Credentials</h4>
          <p>Menu → APIs & Services → Credentials → Create Credentials → OAuth client ID</p>
          <h4>Bước 3: Cấu hình Consent Screen</h4>
          <p>Điền thông tin ứng dụng của bạn</p>
          <h4>Bước 4: Thêm Redirect URI</h4>
          <p>Authorized redirect URIs: <code>${window.location.origin}/api/auth/google/callback</code></p>
          <h4>Bước 5: Copy Client ID & Secret</h4>
          <p>Dán vào các trường bên trên</p>
        </div>
      `,
      facebook: `
        <div class="guide">
          <h4>Bước 1: Tạo App trên Facebook</h4>
          <p>Vào <a href="https://developers.facebook.com" target="_blank">Facebook Developers</a></p>
          <h4>Bước 2: Cấu hình OAuth Redirect URI</h4>
          <p>Settings → Basic → App Domains & Redirect URIs</p>
          <p>Valid OAuth Redirect URIs: <code>${window.location.origin}/api/auth/facebook/callback</code></p>
          <h4>Bước 3: Lấy App ID & Secret</h4>
          <p>Settings → Basic → App ID & App Secret</p>
        </div>
      `,
      github: `
        <div class="guide">
          <h4>Bước 1: Tạo OAuth App trên GitHub</h4>
          <p>Settings → Developer settings → OAuth Apps → New OAuth App</p>
          <h4>Bước 2: Cấu hình URLs</h4>
          <p>Authorization callback URL: <code>${window.location.origin}/api/auth/github/callback</code></p>
          <h4>Bước 3: Lấy Client ID & Secret</h4>
          <p>Copy từ trang OAuth App settings</p>
        </div>
      `,
      tiktok: `
        <div class="guide">
          <h4>Bước 1: Tạo Developer Account</h4>
          <p>Vào <a href="https://developers.tiktok.com" target="_blank">TikTok Developers</a></p>
          <h4>Bước 2: Tạo Application</h4>
          <p>Chọn Web/API Product</p>
          <h4>Bước 3: Cấu hình Redirect URI</h4>
          <p>Callback URL: <code>${window.location.origin}/api/auth/tiktok/callback</code></p>
          <h4>Bước 4: Lấy Client ID & Secret</h4>
          <p>Từ Application details</p>
        </div>
      `
    };
    
    qs('#guide-content').innerHTML = guides[provider] || '';
    
    // Copy button functionality
    qsa('[data-copy]').forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.copy;
        navigator.clipboard.writeText(url);
        toast('Đã copy URL!', 'success');
      };
    });
  }
}

// Add to admin nav
function addOAuthToAdminNav() {
  // This will be integrated into the main admin.js
}
