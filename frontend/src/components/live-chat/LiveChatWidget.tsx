import { useEffect } from 'react';
// hooks
import useSiteSettings from '../../hooks/useSiteSettings';
// components
import LiveChatPanel from './LiveChatPanel';

// ----------------------------------------------------------------------
// Widget live chat hiển thị ở góc client khi admin bật.
// Hỗ trợ nhiều nguồn: built-in (chat nội bộ), Tawk.to, Crisp, Facebook
// Messenger, Zalo OA, hoặc mã nhúng tuỳ chỉnh.
// ----------------------------------------------------------------------

// Chèn 1 thẻ <script> (chỉ 1 lần theo id) và chạy được.
function injectScript(id: string, src?: string, inner?: string, attrs?: Record<string, string>) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  if (src) s.src = src;
  if (inner) s.innerHTML = inner;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
}

export default function LiveChatWidget() {
  const settings = useSiteSettings();
  const enabled = settings?.livechat_enabled === '1' || settings?.livechat_enabled === 'true';
  const provider = settings?.livechat_provider || 'builtin';

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (provider === 'tawkto' && settings?.livechat_tawkto_id) {
      injectScript('tawkto-embed', `https://embed.tawk.to/${settings.livechat_tawkto_id}/default`);
    }

    if (provider === 'crisp' && settings?.livechat_crisp_id) {
      (window as any).$crisp = (window as any).$crisp || [];
      (window as any).CRISP_WEBSITE_ID = settings.livechat_crisp_id;
      injectScript('crisp-embed', 'https://client.crisp.chat/l.js');
    }

    if (provider === 'messenger' && settings?.livechat_messenger_page_id) {
      // Facebook root + plugin customer chat
      if (!document.getElementById('fb-root')) {
        const root = document.createElement('div');
        root.id = 'fb-root';
        document.body.appendChild(root);
      }
      if (!document.getElementById('fb-customerchat')) {
        const chat = document.createElement('div');
        chat.className = 'fb-customerchat';
        chat.id = 'fb-customerchat';
        chat.setAttribute('attribution', 'biz_inbox');
        chat.setAttribute('page_id', settings.livechat_messenger_page_id);
        if (settings.livechat_messenger_color) chat.setAttribute('theme_color', settings.livechat_messenger_color);
        document.body.appendChild(chat);
      }
      injectScript(
        'fb-messenger-sdk',
        undefined,
        `window.fbAsyncInit=function(){FB.init({xfbml:true,version:'v19.0'});};(function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(d.getElementById(id))return;js=d.createElement(s);js.id=id;js.src='https://connect.facebook.net/vi_VN/sdk/xfbml.customerchat.js';fjs.parentNode.insertBefore(js,fjs);}(document,'script','facebook-jssdk'));`
      );
    }

    if (provider === 'zalo' && settings?.livechat_zalo_oa_id) {
      if (!document.getElementById('zalo-chat-widget')) {
        const div = document.createElement('div');
        div.id = 'zalo-chat-widget';
        div.className = 'zalo-chat-widget';
        div.setAttribute('data-oaid', settings.livechat_zalo_oa_id);
        document.body.appendChild(div);
      }
      injectScript('zalo-sdk', 'https://sp.zalo.me/plugins/sdk.js');
    }

    if (provider === 'custom' && settings?.livechat_custom_code) {
      if (!document.getElementById('livechat-custom')) {
        const wrap = document.createElement('div');
        wrap.id = 'livechat-custom';
        wrap.innerHTML = settings.livechat_custom_code;
        document.body.appendChild(wrap);
        // innerHTML không tự chạy <script> -> tạo lại để thực thi.
        wrap.querySelectorAll('script').forEach((old) => {
          const s = document.createElement('script');
          Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
          s.innerHTML = old.innerHTML;
          old.replaceWith(s);
        });
      }
    }
  }, [enabled, provider, settings]);

  // Nguồn nội bộ: mở khung chat ngay tại chỗ (bong bóng), không chuyển trang.
  if (enabled && provider === 'builtin') {
    return <LiveChatPanel />;
  }

  // Các nhà cung cấp khác tự render widget của họ qua script.
  return null;
}
